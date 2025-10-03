# Minimal API Server for Testing
param([int]$Port = 9600)

# Cloudflare credentials
$accountId = "625959b904a63f24f6bb7ec9b8c1ed7c"
$apiToken = "-zzeGfICEsDjr0a6YccIobwGk4hG8MVmWqPeaybw"

Add-Type -AssemblyName System.Web
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")

try {
    $listener.Start()
    Write-Host "🟢 API Server running on port $Port" -ForegroundColor Green
    
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        # Set CORS headers
        $response.Headers.Add('Access-Control-Allow-Origin', '*')
        $response.Headers.Add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        $response.Headers.Add('Access-Control-Allow-Headers', '*')
        
        # Handle CORS preflight
        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }
        
        $path = $request.Url.LocalPath
        Write-Host "$(Get-Date -Format 'HH:mm:ss') $($request.HttpMethod) $path" -ForegroundColor Gray
        
        if ($path -eq "/api/images" -and $request.HttpMethod -eq "GET") {
            try {
                # Call Cloudflare API
                $uri = "https://api.cloudflare.com/client/v4/accounts/$accountId/images/v1?per_page=100"
                $headers = @{
                    'Authorization' = "Bearer $apiToken"
                    'Content-Type' = 'application/json'
                }
                
                $cfResponse = Invoke-RestMethod -Uri $uri -Method GET -Headers $headers
                
                if ($cfResponse.success) {
                    $jsonResponse = @{
                        success = $true
                        images = $cfResponse.result.images
                    } | ConvertTo-Json -Depth 10
                    
                    $response.ContentType = "application/json; charset=utf-8"
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($jsonResponse)
                    $response.ContentLength64 = $buffer.Length
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                    $response.StatusCode = 200
                } else {
                    throw "Cloudflare API error"
                }
            } catch {
                $errorResponse = @{
                    success = $false
                    error = $_.Exception.Message
                } | ConvertTo-Json
                
                $response.ContentType = "application/json; charset=utf-8"
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($errorResponse)
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
                $response.StatusCode = 500
            }
        } elseif ($path -eq "/api/images" -and $request.HttpMethod -eq "POST") {
            try {
                # Handle image upload - simplified approach
                Write-Host "Processing image upload..." -ForegroundColor Yellow
                
                # Read the entire request body as bytes
                $requestBody = New-Object byte[] $request.ContentLength64
                $request.InputStream.Read($requestBody, 0, $request.ContentLength64) | Out-Null
                
                # Forward the raw request to Cloudflare
                $cloudflareUri = "https://api.cloudflare.com/client/v4/accounts/$accountId/images/v1"
                $headers = @{
                    'Authorization' = "Bearer $apiToken"
                    'Content-Type' = $request.ContentType
                }
                
                Write-Host "Forwarding to Cloudflare Images API..." -ForegroundColor Cyan
                
                # Use WebRequest for better control over binary data
                $webRequest = [System.Net.WebRequest]::Create($cloudflareUri)
                $webRequest.Method = "POST"
                $webRequest.Headers.Add("Authorization", "Bearer $apiToken")
                $webRequest.ContentType = $request.ContentType
                $webRequest.ContentLength = $requestBody.Length
                
                # Write the request body
                $requestStream = $webRequest.GetRequestStream()
                $requestStream.Write($requestBody, 0, $requestBody.Length)
                $requestStream.Close()
                
                # Get the response
                $webResponse = $webRequest.GetResponse()
                $responseStream = $webResponse.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($responseStream)
                $responseText = $reader.ReadToEnd()
                $reader.Close()
                $webResponse.Close()
                
                Write-Host "Cloudflare response received" -ForegroundColor Green
                
                # Return the Cloudflare response
                $response.ContentType = "application/json; charset=utf-8"
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($responseText)
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
                $response.StatusCode = 200
                
            } catch {
                Write-Host "Upload error: $($_.Exception.Message)" -ForegroundColor Red
                $errorResponse = @{
                    success = $false
                    error = "Upload failed: $($_.Exception.Message)"
                } | ConvertTo-Json
                
                $response.ContentType = "application/json; charset=utf-8"
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($errorResponse)
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
                $response.StatusCode = 500
            }
        } else {
            $response.StatusCode = 404
            $errorResponse = @{
                success = $false
                error = "Endpoint not found"
            } | ConvertTo-Json
            
            $response.ContentType = "application/json; charset=utf-8"
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($errorResponse)
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        }
        
        $response.Close()
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
}