# SBS Unified API Server
# Handles both Cloudflare proxying and local item database manageme        $url = $request.Url.LocalPath
        $method = $request.HttpMethod
        $statusCode = 200
        $responseText = ""

        Write-Host "$(Get-Date -Format 'HH:mm:ss') - $method $url" -ForegroundColor Cyan
        Write-Host "  Headers: User-Agent=$($request.UserAgent), Content-Type=$($request.ContentType)" -ForegroundColor Gray
        if ($request.ContentLength64 -gt 0) {
            Write-Host "  Content-Length: $($request.ContentLength64) bytes" -ForegroundColor Gray
        }
param(
    [int]$Port = 3003
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

function Add-AuditLog($action, $itemId, $details, $actor = "admin") {
    $auditData = Get-JsonData -filePath $auditFile
    $auditEntry = @{
        id        = "audit_" + [System.Guid]::NewGuid().ToString().Substring(0, 8)
        timestamp = (Get-Date).ToString("o")
        action    = $action
        itemId    = $itemId
        details   = $details
        actor     = $actor
    }
    $auditData += $auditEntry
    if ($auditData.Count -gt 200) { $auditData = $auditData[($auditData.Count - 200)..-1] }
    Set-JsonData -filePath $auditFile -data $auditData
}

function New-ItemId {
    return "sbsitem_" + [System.Guid]::NewGuid().ToString().Substring(0, 12)
}

# --- Main Server Logic ---
Write-Host "🚀 Starting SBS Unified API Server on port $Port..." -ForegroundColor Green
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")

try {
    $listener.Start()
    Write-Host "✅ Unified API Server running at http://localhost:$Port/" -ForegroundColor Green
    Write-Host "   Handles both Cloudflare proxy and local Items DB."
    Write-Host "   Press Ctrl+C to stop the server."

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
        $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 204
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
                    } elseif ($method -eq "POST") {
                        $body = New-Object System.IO.StreamReader($request.InputStream) | ForEach-Object { $_.ReadToEnd() }
                        $newItemData = $body | ConvertFrom-Json
                        
                        $newItem = $newItemData | Select-Object *
                        $newItem | Add-Member -MemberType NoteProperty -Name "id" -Value (New-ItemId)
                        $newItem | Add-Member -MemberType NoteProperty -Name "createdAt" -Value (Get-Date).ToString("o")
                        $newItem | Add-Member -MemberType NoteProperty -Name "updatedAt" -Value (Get-Date).ToString("o")

                        $items = Get-JsonData -filePath $itemsFile
                        $items += $newItem
                        if (Set-JsonData -filePath $itemsFile -data $items) {
                            Add-AuditLog -action "CREATE" -itemId $newItem.id -details @{ data = $newItem }
                            $responseBody = @{ success = $true; data = $newItem }
                        } else { throw "Failed to save new item." }
                    }
                }
                "^/api/items/(sbsitem_.+)" {
                    # --- Local Items DB (Single Item) ---
                    $itemId = $matches[1]
                    if ($method -eq "PATCH") {
                        $body = New-Object System.IO.StreamReader($request.InputStream) | % { $_.ReadToEnd() }
                        $updates = $body | ConvertFrom-Json
                        $items = Get-JsonData -filePath $itemsFile
                        $itemToUpdate = $items | Where-Object { $_.id -eq $itemId } | Select-Object -First 1
                        if ($itemToUpdate) {
                            $oldItem = $itemToUpdate | ConvertTo-Json | ConvertFrom-Json
                            foreach ($key in $updates.psobject.Properties.Name) { $itemToUpdate.$key = $updates.$key }
                            $itemToUpdate.updatedAt = (Get-Date).ToString("o")
                            if (Set-JsonData -filePath $itemsFile -data $items) {
                                Add-AuditLog -action "UPDATE" -itemId $itemId -details @{ before = $oldItem; after = $itemToUpdate }
                                $responseText = @{ success = $true; data = $itemToUpdate } | ConvertTo-Json -Depth 10
                            } else { throw "Failed to save updated item." }
                        } else { $statusCode = 404; throw "Item with ID '$itemId' not found." }
                    } elseif ($method -eq "DELETE") {
                        $items = Get-JsonData -filePath $itemsFile
                        $itemToDelete = $items | Where-Object { $_.id -eq $itemId } | Select-Object -First 1
                        if ($itemToDelete) {
                            $remainingItems = $items | Where-Object { $_.id -ne $itemId }
                            if (Set-JsonData -filePath $itemsFile -data $remainingItems) {
                                Add-AuditLog -action "DELETE" -itemId $itemId -details @{ deletedData = $itemToDelete }
                                $responseText = @{ success = $true; message = "Item '$itemId' deleted." } | ConvertTo-Json
                            } else { throw "Failed to save after deleting item." }
                        } else { $statusCode = 404; throw "Item with ID '$itemId' not found." }
                    }
                }
                "^/api/migrate$" {
                    # --- Migration endpoint to sync Cloudflare images to local DB ---
                    if ($method -eq "POST") {
                        Write-Host "Starting migration from Cloudflare to local database..." -ForegroundColor Yellow
                        
                        # Fetch images from Cloudflare
                        $cfUri = "https://api.cloudflare.com/client/v4/accounts/$cfAccountId/images/v1?per_page=100"
                        $cfHeaders = @{ "Authorization" = "Bearer $cfApiToken" }
                        $cfResult = Invoke-RestMethod -Uri $cfUri -Method GET -Headers $cfHeaders
                        
                        if ($cfResult.success -and $cfResult.result.images) {
                            $existingItems = Get-JsonData -filePath $itemsFile
                            $migratedCount = 0
                            $skippedCount = 0
                            
                            foreach ($cfImage in $cfResult.result.images) {
                                # Check if item already exists
                                $existingItem = $existingItems | Where-Object { $_.cloudflareId -eq $cfImage.id }
                                
                                if (-not $existingItem) {
                                    # Parse filename for metadata
                                    $filename = $cfImage.filename
                                    $category = "GENERAL"
                                    $size = "One Size"
                                    $tags = @("LIVE")
                                    
                                    if ($filename -match "SBS-([^-]+)-([^-]+)-([^-]+)") {
                                        $category = "$($matches[1])-$($matches[2])"
                                        $size = $matches[3] -replace "-", " "
                                        $tags += "FEATURED"
                                    }
                                    
                                    # Create new item
                                    $newItem = @{
                                        id = New-ItemId
                                        cloudflareId = $cfImage.id
                                        filename = $filename
                                        name = $filename
                                        category = $category
                                        size = $size
                                        tags = $tags
                                        status = "available"
                                        notes = ""
                                        createdAt = (Get-Date).ToString("o")
                                        updatedAt = (Get-Date).ToString("o")
                                    }
                                    
                                    $existingItems += $newItem
                                    $migratedCount++
                                    
                                    Add-AuditLog -action "MIGRATE" -itemId $newItem.id -details @{ 
                                        cloudflareId = $cfImage.id
                                        filename = $filename 
                                    }
                                } else {
                                    $skippedCount++
                                }
                            }
                            
                            # Save updated items
                            if (Set-JsonData -filePath $itemsFile -data $existingItems) {
                                $responseBody = @{
                                    success = $true
                                    migrated = $migratedCount
                                    skipped = $skippedCount
                                    total = $cfResult.result.images.Count
                                }
                                Write-Host "Migration completed: $migratedCount migrated, $skippedCount skipped" -ForegroundColor Green
                            } else {
                                throw "Failed to save migrated items to database."
                            }
                        } else {
                            throw "Failed to fetch images from Cloudflare."
                        }
                    }
                }
                "^/api/audit$" {
                    # --- Audit Log ---
                    if ($method -eq "GET") {
                        $auditLogs = Get-JsonData -filePath $auditFile
                        $responseText = @{ success = $true; data = $auditLogs } | ConvertTo-Json -Depth 10
                    }
                }
                default {
                    $statusCode = 404
                    throw "Endpoint not found: $method $url"
                }
            }
        } catch {
            if ($statusCode -eq 200) { $statusCode = 500 } # Default to 500 if not already set
            $responseBody = @{ success = $false; error = $_.Exception.Message }
            Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
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
        if ($responseText.Length > 200) { Write-Host "      ... (truncated)" -ForegroundColor Yellow }
        
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($responseText)
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        
        # Log the response being sent back
        Write-Host "  ✅ Response sent successfully!" -ForegroundColor Green

        $response.Close()
    }
} catch {
    Write-Host "FATAL SERVER ERROR: $_" -ForegroundColor Red
} finally {
    if ($listener -and $listener.IsListening) { $listener.Stop() }
    Write-Host "Server stopped." -ForegroundColor Yellow
}
