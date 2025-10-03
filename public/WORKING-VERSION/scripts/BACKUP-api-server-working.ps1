# SBS Media Hub - Working System Backup
# Created: September 25, 2025
# Status: Upload functionality working, API server stable

param(
    [int]$Port = 8003
)

# --- Configuration ---
# Cloudflare Credentials
$cfAccountId = "625959b904a63f24f6bb7ec9b8c1ed7c"
$cfApiToken = "JLNbZD8J3ypw3ypyl3bqMN4y3e_Awf5rXeRa29xP"

# Local Data Files
$dataDir = ".\data"
$itemsFile = "$dataDir\items.json"
$auditFile = "$dataDir\audit.json"

# --- Initialization ---
if (!(Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir
    Write-Host "Created data directory: $dataDir" -ForegroundColor Cyan
}
if (!(Test-Path $itemsFile)) { "[]" | Out-File -FilePath $itemsFile -Encoding utf8 }
if (!(Test-Path $auditFile)) { "[]" | Out-File -FilePath $auditFile -Encoding utf8 }

# --- Helper Functions ---

function Get-JsonData($filePath) {
    try {
        $content = Get-Content -Path $filePath -Raw -Encoding utf8
        if ([string]::IsNullOrWhiteSpace($content)) { return @() }
        return ConvertFrom-Json $content
    } catch {
        Write-Host "Error reading JSON file '$filePath': $_" -ForegroundColor Red
        return @()
    }
}

function Set-JsonData($filePath, $data) {
    try {
        ConvertTo-Json $data -Depth 10 | Out-File -FilePath $filePath -Encoding utf8
        return $true
    } catch {
        Write-Host "Error writing JSON file '$filePath': $_" -ForegroundColor Red
        return $false
    }
}

function New-ItemId {
    return [System.Guid]::NewGuid().ToString().Substring(0,8)
}

function Add-AuditEntry($action, $itemId = $null, $details = @{}) {
    $entry = @{
        timestamp = (Get-Date).ToString("o")
        action = $action
        itemId = $itemId
        details = $details
    }
    
    $audit = Get-JsonData -filePath $auditFile
    if ($audit -isnot [array]) { $audit = @() }
    $audit += $entry
    Set-JsonData -filePath $auditFile -data $audit
}

# --- Server Setup ---
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Prefixes.Add("http://127.0.0.1:$Port/")

Write-Host ""
Write-Host "🚀 SBS Unified API Server Starting..." -ForegroundColor Magenta
Write-Host "   Port: $Port" -ForegroundColor Cyan
Write-Host "   Endpoints:" -ForegroundColor Cyan
Write-Host "     GET/POST  /api/images  (Cloudflare proxy)" -ForegroundColor Gray
Write-Host "     GET/POST  /api/items   (Local database)" -ForegroundColor Gray
Write-Host "   Data Directory: $dataDir" -ForegroundColor Gray
Write-Host ""

try {
    $listener.Start()
    Write-Host "✅ Server listening on http://localhost:$Port" -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop..." -ForegroundColor Yellow
    Write-Host ""

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # Enable CORS
        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        $url = $request.Url.LocalPath
        $method = $request.HttpMethod
        $statusCode = 200
        $responseBody = @{}

        # Enhanced request logging
        Write-Host ""
        Write-Host "🌐 INCOMING REQUEST:" -ForegroundColor Magenta
        Write-Host "  Time: $(Get-Date -Format 'HH:mm:ss.fff')" -ForegroundColor Cyan
        Write-Host "  Method: $method" -ForegroundColor Cyan
        Write-Host "  Path: $url" -ForegroundColor Cyan
        Write-Host "  Content-Type: $($request.ContentType)" -ForegroundColor Cyan
        Write-Host "  Content-Length: $($request.ContentLength64) bytes" -ForegroundColor Cyan
        Write-Host "  User-Agent: $($request.UserAgent)" -ForegroundColor Gray

        try {
            # --- API ROUTING ---
            switch -Regex ($url) {
                "^/api/images$" {
                    # --- Cloudflare Image Proxy ---
                    if ($method -eq "GET") {
                        Write-Host "  Fetching images from Cloudflare..." -ForegroundColor Yellow
                        $uri = "https://api.cloudflare.com/client/v4/accounts/$cfAccountId/images/v1?per_page=100"
                        $headers = @{ "Authorization" = "Bearer $cfApiToken" }
                        $result = Invoke-RestMethod -Uri $uri -Method GET -Headers $headers
                        $responseBody = $result
                        Write-Host "  Cloudflare returned $($result.result.images.Count) images" -ForegroundColor Green
                    } elseif ($method -eq "POST") {
                        Write-Host "  Processing image upload to Cloudflare..." -ForegroundColor Yellow
                        Write-Host "  Content-Length: $($request.ContentLength64) bytes" -ForegroundColor Gray
                        Write-Host "  Content-Type: $($request.ContentType)" -ForegroundColor Gray
                        
                        $reader = New-Object System.IO.BinaryReader($request.InputStream)
                        $data = $reader.ReadBytes([int]$request.ContentLength64)
                        $reader.Close()
                        Write-Host "  Read $($data.Length) bytes from request" -ForegroundColor Gray
                        
                        $uri = "https://api.cloudflare.com/client/v4/accounts/$cfAccountId/images/v1"
                        Write-Host "  Forwarding to: $uri" -ForegroundColor Gray
                        
                        $webRequest = [System.Net.WebRequest]::Create($uri)
                        $webRequest.Method = "POST"
                        $webRequest.Headers.Add("Authorization", "Bearer $cfApiToken")
                        $webRequest.ContentType = $request.ContentType
                        $webRequest.ContentLength = $data.Length
                        
                        $requestStream = $webRequest.GetRequestStream()
                        $requestStream.Write($data, 0, $data.Length)
                        $requestStream.Close()
                        
                        try {
                            $webResponse = $webRequest.GetResponse()
                            $responseStream = $webResponse.GetResponseStream()
                            $responseReader = New-Object System.IO.StreamReader($responseStream)
                            $responseText = $responseReader.ReadToEnd()
                            $responseReader.Close()
                            $webResponse.Close()
                            
                            Write-Host "  Cloudflare response received: $($responseText.Length) chars" -ForegroundColor Green
                            
                            # Parse and validate the response
                            $cfResponse = $responseText | ConvertFrom-Json
                            if ($cfResponse.success) {
                                Write-Host "  ✅ Cloudflare upload successful - ID: $($cfResponse.result.id)" -ForegroundColor Green
                            } else {
                                Write-Host "  ❌ Cloudflare upload failed - Errors: $($cfResponse.errors)" -ForegroundColor Red
                            }
                            
                            $responseBody = $cfResponse
                        } catch {
                            Write-Host "  ❌ Error communicating with Cloudflare: $($_.Exception.Message)" -ForegroundColor Red
                            throw "Cloudflare API error: $($_.Exception.Message)"
                        }
                    }
                }
                "^/api/items$" {
                    # --- Local Items DB ---
                    if ($method -eq "GET") {
                        Write-Host "  Loading items from local database..." -ForegroundColor Yellow
                        $items = Get-JsonData -filePath $itemsFile
                        # Force items to be an array for JSON serialization
                        $itemsArray = @()
                        if ($items) {
                            $itemsArray = @($items)  # Force to array
                        }
                        $responseBody = @{ 
                            success = $true
                            count = $itemsArray.Count
                            data = $itemsArray
                        }
                        Write-Host "  ✅ Successfully loaded $($itemsArray.Count) items from the database." -ForegroundColor Green
                    } elseif ($method -eq "POST") {
                        Write-Host "  Creating new item in local database..." -ForegroundColor Yellow
                        $body = New-Object System.IO.StreamReader($request.InputStream) | ForEach-Object { $_.ReadToEnd() }
                        Write-Host "  Request body: $($body.Substring(0, [Math]::Min(100, $body.Length)))" -ForegroundColor Gray
                        
                        $newItemData = $body | ConvertFrom-Json
                        
                        $newItem = $newItemData | Select-Object *
                        $newItem | Add-Member -MemberType NoteProperty -Name "id" -Value (New-ItemId)
                        $newItem | Add-Member -MemberType NoteProperty -Name "createdAt" -Value (Get-Date).ToString("o")
                        $newItem | Add-Member -MemberType NoteProperty -Name "updatedAt" -Value (Get-Date).ToString("o")
                        
                        $items = Get-JsonData -filePath $itemsFile
                        if ($items -isnot [array]) { $items = @() }
                        $items += $newItem
                        
                        if (Set-JsonData -filePath $itemsFile -data $items) {
                            Add-AuditEntry -action "CREATE" -itemId $newItem.id -details @{ name = $newItem.name }
                            $responseBody = @{ success = $true; item = $newItem }
                            Write-Host "  ✅ Item created with ID: $($newItem.id)" -ForegroundColor Green
                        } else {
                            throw "Failed to save item to database"
                        }
                    }
                }
                default {
                    $statusCode = 404
                    $responseBody = @{ success = $false; error = "Endpoint not found: $url" }
                    Write-Host "  ❌ Unknown endpoint: $url" -ForegroundColor Red
                }
            }
        } catch {
            $statusCode = 500
            $responseBody = @{ success = $false; error = $_.Exception.Message }
            Write-Host "  ❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
        }

        # --- Send response ---
        $responseText = $responseBody | ConvertTo-Json -Depth 10
        $response.StatusCode = $statusCode
        $response.ContentType = "application/json"
        
        # Enhanced response logging
        Write-Host "  🚀 SENDING RESPONSE:" -ForegroundColor Magenta
        Write-Host "    Status Code: $statusCode" -ForegroundColor Cyan
        Write-Host "    Content Type: application/json" -ForegroundColor Cyan
        Write-Host "    Response Size: $($responseText.Length) bytes" -ForegroundColor Cyan
        Write-Host "    Response Body: $($responseText.Substring(0, [System.Math]::Min($responseText.Length, 200)))" -ForegroundColor Yellow
        if ($responseText.Length -gt 200) { Write-Host "      ... (truncated)" -ForegroundColor Yellow }
        
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($responseText)
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        
        Write-Host "  ✅ Response sent successfully!" -ForegroundColor Green

        $response.Close()
    }
} catch {
    Write-Host "FATAL SERVER ERROR: $_" -ForegroundColor Red
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
        Write-Host "Server stopped." -ForegroundColor Yellow
    }
}