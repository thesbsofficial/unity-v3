# Simple Cloudflare Images API Proxy
# This handles /api/images and /api/images/upload requests

function Handle-ApiRequest {
    param($Request, $Response)
    
    $path = $Request.Url.LocalPath
    $method = $Request.HttpMethod
    
    # Cloudflare credentials
    $accountId = "625959b904a63f24f6bb7ec9b8c1ed7c"
    $apiToken = "DQtOt_iMlxUDPqLwYFFNJ9CRQMjHA4gjYoZBIFwu"
    
    try {
        if ($path -eq "/api/images" -and $method -eq "GET") {
            # List images from Cloudflare
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
                
                $Response.ContentType = "application/json; charset=utf-8"
                $Response.Headers.Add('Access-Control-Allow-Origin', '*')
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($jsonResponse)
                $Response.ContentLength64 = $buffer.Length
                $Response.OutputStream.Write($buffer, 0, $buffer.Length)
                $Response.StatusCode = 200
            } else {
                throw "Cloudflare API error: $($cfResponse.errors)"
            }
            
        } elseif ($path -eq "/api/images/upload" -and $method -eq "POST") {
            # Handle image upload (placeholder for now)
            $errorResponse = @{
                success = $false
                error = "Upload endpoint not implemented yet"
            } | ConvertTo-Json
            
            $Response.ContentType = "application/json; charset=utf-8"
            $Response.Headers.Add('Access-Control-Allow-Origin', '*')
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($errorResponse)
            $Response.ContentLength64 = $buffer.Length
            $Response.OutputStream.Write($buffer, 0, $buffer.Length)
            $Response.StatusCode = 501
            
        } else {
            # Not found
            $Response.StatusCode = 404
        }
        
    } catch {
        # Error handling
        $errorResponse = @{
            success = $false
            error = $_.Exception.Message
        } | ConvertTo-Json
        
        $Response.ContentType = "application/json; charset=utf-8"
        $Response.Headers.Add('Access-Control-Allow-Origin', '*')
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($errorResponse)
        $Response.ContentLength64 = $buffer.Length
        $Response.OutputStream.Write($buffer, 0, $buffer.Length)
        $Response.StatusCode = 500
    }
    
    $Response.Close()
    return $true  # Indicates this request was handled
}