# Minimal API Server for Testing (now fully "baby-proofed")
param([int]$Port = 9600)

# Cloudflare credentials (read from environment variables for security)
$accountId = $env:CF_ACCOUNT_ID
$apiToken  = $env:CF_API_TOKEN

if ([string]::IsNullOrWhiteSpace($accountId) -or [string]::IsNullOrWhiteSpace($apiToken)) {
    throw "Missing Cloudflare credentials. Set CF_ACCOUNT_ID and CF_API_TOKEN environment variables before launching the proxy."
}

Add-Type -AssemblyName System.Web

function Write-JsonResponse {
    param(
        [System.Net.HttpListenerResponse]$Response,
        [int]$StatusCode,
        [object]$Payload,
        [int]$Depth = 10
    )

    if ($null -eq $Payload) {
        $Payload = @{ success = $true }
    }

    $json = if ($Payload -is [string]) { $Payload } else { $Payload | ConvertTo-Json -Depth $Depth }
    $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)

    $Response.StatusCode = $StatusCode
    $Response.ContentType = "application/json; charset=utf-8"
    $Response.ContentLength64 = $buffer.Length
    $Response.OutputStream.Write($buffer, 0, $buffer.Length)
}

function Write-ErrorResponse {
    param(
        [System.Net.HttpListenerResponse]$Response,
        [int]$StatusCode,
        [string]$Message,
        [object]$Details = $null
    )

    $payload = @{ success = $false; error = $Message }
    if ($null -ne $Details) {
        $payload.details = $Details
    }
    Write-JsonResponse -Response $Response -StatusCode $StatusCode -Payload $payload
}

function Read-RequestBodyBytes {
    param([System.Net.HttpListenerRequest]$Request)

    if ($Request.ContentLength64 -le 0) {
        return [byte[]]::new(0)
    }

    $buffer = New-Object byte[] $Request.ContentLength64
    $bytesRead = 0
    while ($bytesRead -lt $buffer.Length) {
        $read = $Request.InputStream.Read($buffer, $bytesRead, $buffer.Length - $bytesRead)
        if ($read -le 0) { break }
        $bytesRead += $read
    }

    if ($bytesRead -ne $buffer.Length) {
        throw "Incomplete request body received. Expected $($buffer.Length) bytes, got $bytesRead."
    }

    return $buffer
}

function Read-RequestBodyText {
    param([System.Net.HttpListenerRequest]$Request)

    if ($Request.ContentLength64 -le 0) {
        return ""
    }

    $reader = New-Object System.IO.StreamReader($Request.InputStream, [System.Text.Encoding]::UTF8)
    try {
        return $reader.ReadToEnd()
    } finally {
        $reader.Close()
    }
}

function Invoke-CloudflareJson {
    param(
        [string]$Method,
        [string]$Uri,
        [hashtable]$Headers,
        [string]$Body = $null
    )

    $params = @{
        Uri = $Uri
        Method = $Method
        Headers = $Headers
        ErrorAction = 'Stop'
    }

    if ($Method -in @('POST', 'PATCH', 'PUT')) {
        if ([string]::IsNullOrWhiteSpace($Body)) {
            $Body = '{}' # Cloudflare rejects completely empty payloads
        }
        $params.ContentType = 'application/json'
        $params.Body = $Body
    }

    return Invoke-RestMethod @params
}

function Invoke-CloudflareUploadBinary {
    param(
        [string]$Uri,
        [byte[]]$Body,
        [string]$ContentType,
        [hashtable]$Headers
    )

    $request = [System.Net.HttpWebRequest]::Create($Uri)
    $request.Method = 'POST'
    $request.ContentType = $ContentType
    $request.ContentLength = $Body.Length
    foreach ($key in $Headers.Keys) {
        $request.Headers.Add($key, $Headers[$key])
    }

    $stream = $null
    $response = $null
    try {
        $stream = $request.GetRequestStream()
        $stream.Write($Body, 0, $Body.Length)
        $stream.Flush()
        $stream.Close()
        $stream = $null

        $response = $request.GetResponse()
        $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
        $content = $reader.ReadToEnd()
        $reader.Close()
        return $content
    } finally {
        if ($null -ne $stream) { $stream.Dispose() }
        if ($null -ne $response) { $response.Dispose() }
    }
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")

try {
    $listener.Start()
    Write-Host "🟢 API Server running on port $Port" -ForegroundColor Green

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $response.Headers.Add('Access-Control-Allow-Origin', '*')
        $response.Headers.Add('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
        $response.Headers.Add('Access-Control-Allow-Headers', '*')

        if ($request.HttpMethod -eq 'OPTIONS') {
            Write-JsonResponse -Response $response -StatusCode 200 -Payload @{ success = $true; message = 'CORS preflight OK' }
            $response.Close()
            continue
        }

        $path = $request.Url.LocalPath
        Write-Host "$(Get-Date -Format 'HH:mm:ss') $($request.HttpMethod) $path" -ForegroundColor Gray

        try {
            if ($path -eq '/api/images' -and $request.HttpMethod -eq 'GET') {
                $uri = "https://api.cloudflare.com/client/v4/accounts/$accountId/images/v1?per_page=100"
                $headers = @{ 'Authorization' = "Bearer $apiToken" }
                $cfResponse = $null

                try {
                    $cfResponse = Invoke-CloudflareJson -Method 'GET' -Uri $uri -Headers $headers
                } catch {
                    $webEx = $_.Exception
                    $details = @{ message = $webEx.Message }

                    if ($webEx -is [System.Net.WebException] -and $webEx.Response) {
                        try {
                            $httpResponse = $webEx.Response -as [System.Net.HttpWebResponse]
                            if ($httpResponse) {
                                $details.statusCode = [int]$httpResponse.StatusCode
                                $stream = $httpResponse.GetResponseStream()
                            } else {
                                $stream = $webEx.Response.GetResponseStream()
                            }

                            if ($stream) {
                                $reader = New-Object System.IO.StreamReader($stream)
                                try {
                                    $rawBody = $reader.ReadToEnd()
                                } finally {
                                    $reader.Close()
                                    $stream.Dispose()
                                }

                                if ($rawBody) {
                                    $details.body = $rawBody
                                    try {
                                        $details.parsed = $rawBody | ConvertFrom-Json
                                    } catch {
                                        $details.parsed = $null
                                    }
                                }
                            }
                        } catch {
                            $details.streamReadError = $_.Exception.Message
                        }
                    }

                    Write-ErrorResponse -Response $response -StatusCode 502 -Message 'Cloudflare request failed.' -Details $details
                    continue
                }

                if (-not $cfResponse.success) {
                    Write-ErrorResponse -Response $response -StatusCode 502 -Message 'Cloudflare returned an error' -Details $cfResponse.errors
                } else {
                    Write-JsonResponse -Response $response -StatusCode 200 -Payload @{ success = $true; images = $cfResponse.result.images }
                }
            } elseif ($path -eq '/api/images' -and $request.HttpMethod -eq 'POST') {
                if ($request.ContentLength64 -le 0) {
                    Write-ErrorResponse -Response $response -StatusCode 400 -Message 'Upload payload is empty.'
                } elseif ([string]::IsNullOrWhiteSpace($request.ContentType)) {
                    Write-ErrorResponse -Response $response -StatusCode 400 -Message 'Content-Type header is required for uploads.'
                } else {
                    Write-Host 'Processing image upload…' -ForegroundColor Yellow
                    $body = Read-RequestBodyBytes -Request $request
                    $cloudflareUri = "https://api.cloudflare.com/client/v4/accounts/$accountId/images/v1"
                    $headers = @{ 'Authorization' = "Bearer $apiToken" }

                    try {
                        $resultText = Invoke-CloudflareUploadBinary -Uri $cloudflareUri -Body $body -ContentType $request.ContentType -Headers $headers
                        try {
                            $parsed = $resultText | ConvertFrom-Json
                            Write-JsonResponse -Response $response -StatusCode 200 -Payload $parsed
                        } catch {
                            Write-JsonResponse -Response $response -StatusCode 200 -Payload @{ success = $true; raw = $resultText }
                        }
                    } catch {
                        Write-Host "Upload error: $($_.Exception.Message)" -ForegroundColor Red
                        Write-ErrorResponse -Response $response -StatusCode 502 -Message 'Upload failed.' -Details $_.Exception.Message
                    }
                }
            } elseif ($path -eq '/api/upload' -and $request.HttpMethod -eq 'POST') {
                if ($request.ContentLength64 -le 0) {
                    Write-ErrorResponse -Response $response -StatusCode 400 -Message 'Upload payload is empty.'
                } elseif ([string]::IsNullOrWhiteSpace($request.ContentType)) {
                    Write-ErrorResponse -Response $response -StatusCode 400 -Message 'Content-Type header is required for uploads.'
                } else {
                    Write-Host 'Processing image upload (legacy /api/upload)…' -ForegroundColor Yellow
                    $body = Read-RequestBodyBytes -Request $request
                    $cloudflareUri = "https://api.cloudflare.com/client/v4/accounts/$accountId/images/v1"
                    $headers = @{ 'Authorization' = "Bearer $apiToken" }

                    try {
                        $resultText = Invoke-CloudflareUploadBinary -Uri $cloudflareUri -Body $body -ContentType $request.ContentType -Headers $headers
                        try {
                            $parsed = $resultText | ConvertFrom-Json
                            Write-JsonResponse -Response $response -StatusCode 200 -Payload $parsed
                        } catch {
                            Write-JsonResponse -Response $response -StatusCode 200 -Payload @{ success = $true; raw = $resultText }
                        }
                    } catch {
                        Write-Host "Upload error (legacy endpoint): $($_.Exception.Message)" -ForegroundColor Red
                        Write-ErrorResponse -Response $response -StatusCode 502 -Message 'Upload failed.' -Details $_.Exception.Message
                    }
                }
            } elseif ($path -match '^/api/images/([^/]+)$') {
                $imageId = $matches[1]
                if ([string]::IsNullOrWhiteSpace($imageId)) {
                    Write-ErrorResponse -Response $response -StatusCode 400 -Message 'Image ID is required.'
                } else {
                    $cloudflareUri = "https://api.cloudflare.com/client/v4/accounts/$accountId/images/v1/$imageId"
                    $headers = @{ 'Authorization' = "Bearer $apiToken" }

                    switch ($request.HttpMethod) {
                        'DELETE' {
                            try {
                                $cfResponse = Invoke-CloudflareJson -Method 'DELETE' -Uri $cloudflareUri -Headers $headers
                                if (-not $cfResponse.success) {
                                    Write-ErrorResponse -Response $response -StatusCode 502 -Message 'Cloudflare failed to delete the asset.' -Details $cfResponse.errors
                                } else {
                                    Write-JsonResponse -Response $response -StatusCode 200 -Payload @{ success = $true; result = $cfResponse.result }
                                }
                            } catch {
                                Write-ErrorResponse -Response $response -StatusCode 502 -Message 'Cloudflare deletion request failed.' -Details $_.Exception.Message
                            }
                        }
                        'PATCH' {
                            $body = Read-RequestBodyText -Request $request
                            if ([string]::IsNullOrWhiteSpace($body)) {
                                Write-ErrorResponse -Response $response -StatusCode 400 -Message 'Metadata payload is required for PATCH requests.'
                            } else {
                                try {
                                    # Validate JSON early for clearer errors
                                    $null = $body | ConvertFrom-Json
                                } catch {
                                    Write-ErrorResponse -Response $response -StatusCode 400 -Message 'Metadata payload must be valid JSON.' -Details $_.Exception.Message
                                    throw
                                }

                                try {
                                    $cfResponse = Invoke-CloudflareJson -Method 'PATCH' -Uri $cloudflareUri -Headers $headers -Body $body
                                    if (-not $cfResponse.success) {
                                        Write-ErrorResponse -Response $response -StatusCode 502 -Message 'Cloudflare failed to update metadata.' -Details $cfResponse.errors
                                    } else {
                                        Write-JsonResponse -Response $response -StatusCode 200 -Payload @{ success = $true; result = $cfResponse.result }
                                    }
                                } catch {
                                    Write-ErrorResponse -Response $response -StatusCode 502 -Message 'Cloudflare metadata update failed.' -Details $_.Exception.Message
                                }
                            }
                        }
                        default {
                            Write-ErrorResponse -Response $response -StatusCode 405 -Message "Method '$($request.HttpMethod)' not allowed for this endpoint."
                        }
                    }
                }
            } else {
                Write-ErrorResponse -Response $response -StatusCode 404 -Message "Endpoint '$path' not found."
            }
        } catch {
            Write-Host "Request handling error: $($_.Exception.Message)" -ForegroundColor Red
            Write-ErrorResponse -Response $response -StatusCode 500 -Message 'Internal server error.' -Details $_.Exception.Message
        } finally {
            $response.Close()
        }
    }
} catch {
    Write-Host "Fatal server error: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
}