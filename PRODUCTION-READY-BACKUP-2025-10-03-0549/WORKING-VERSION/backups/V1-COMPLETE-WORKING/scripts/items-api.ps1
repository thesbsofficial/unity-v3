# SBS Items API Server - Step 3 Implementation
# Manages items.json (source of truth) and audit.json (change history)

param(
    [int]$Port = 3002
)

# --- Configuration ---
$dataDir = ".\data"
$itemsFile = "$dataDir\items.json"
$auditFile = "$dataDir\audit.json"

# --- Initialization ---
if (!(Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir
    Write-Host "Created data directory: $dataDir" -ForegroundColor Cyan
}
if (!(Test-Path $itemsFile)) {
    "[]" | Out-File -FilePath $itemsFile -Encoding utf8
}
if (!(Test-Path $auditFile)) {
    "[]" | Out-File -FilePath $auditFile -Encoding utf8
}

# --- Helper Functions ---

# Read data from a JSON file
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

# Write data to a JSON file
function Set-JsonData($filePath, $data) {
    try {
        ConvertTo-Json $data -Depth 10 | Out-File -FilePath $filePath -Encoding utf8
        return $true
    } catch {
        Write-Host "Error writing JSON file '$filePath': $_" -ForegroundColor Red
        return $false
    }
}

# Add a record to the audit log
function Add-AuditLog($action, $itemId, $details, $actor = "admin") {
    $auditData = Get-JsonData -filePath $auditFile
    $auditEntry = @{
        id        = "audit_" + [System.Guid]::NewGuid().ToString().Substring(0, 8)
        timestamp = (Get-Date).ToString("o") # ISO 8601 format
        action    = $action
        itemId    = $itemId
        details   = $details
        actor     = $actor
    }
    $auditData += $auditEntry
    # Keep the last 200 audit entries for performance
    if ($auditData.Count -gt 200) {
        $auditData = $auditData[($auditData.Count - 200)..-1]
    }
    Set-JsonData -filePath $auditFile -data $auditData
}

# Generate a new unique ID for an item
function New-ItemId {
    return "sbsitem_" + [System.Guid]::NewGuid().ToString().Substring(0, 12)
}

# --- Main Server Logic ---
Write-Host "🚀 Starting SBS Items API Server on port $Port..." -ForegroundColor Green
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")

try {
    $listener.Start()
    Write-Host "✅ Items API Server running at http://localhost:$Port/" -ForegroundColor Green
    Write-Host "   Watching data files in '$dataDir'"
    Write-Host "   Press Ctrl+C to stop the server."

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        # Set CORS headers for all responses
        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
        $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization")

        # Handle CORS preflight requests
        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 204 # No Content
            $response.Close()
            continue
        }

        $url = $request.Url.LocalPath
        $method = $request.HttpMethod
        $statusCode = 200
        $responseText = ""

        Write-Host "$(Get-Date -Format 'HH:mm:ss') - $method $url" -ForegroundColor Cyan

        try {
            # --- API Routing ---
            switch -Regex ("$method $url") {
                "GET /api/items" {
                    $items = Get-JsonData -filePath $itemsFile
                    $responseText = @{ success = $true; data = $items } | ConvertTo-Json -Depth 10
                }

                "POST /api/items" {
                    $body = New-Object System.IO.StreamReader($request.InputStream) | % { $_.ReadToEnd() }
                    $newItemData = $body | ConvertFrom-Json
                    
                    $newItem = $newItemData | Select-Object *
                    $newItem | Add-Member -MemberType NoteProperty -Name "id" -Value (New-ItemId)
                    $newItem | Add-Member -MemberType NoteProperty -Name "createdAt" -Value (Get-Date).ToString("o")
                    $newItem | Add-Member -MemberType NoteProperty -Name "updatedAt" -Value (Get-Date).ToString("o")

                    $items = Get-JsonData -filePath $itemsFile
                    $items += $newItem
                    if (Set-JsonData -filePath $itemsFile -data $items) {
                        Add-AuditLog -action "CREATE" -itemId $newItem.id -details @{ data = $newItem }
                        $responseText = @{ success = $true; data = $newItem } | ConvertTo-Json -Depth 10
                    } else {
                        throw "Failed to save new item."
                    }
                }

                "PATCH /api/items/(sbsitem_.+)" {
                    $itemId = $matches[1]
                    $body = New-Object System.IO.StreamReader($request.InputStream) | % { $_.ReadToEnd() }
                    $updates = $body | ConvertFrom-Json
                    
                    $items = Get-JsonData -filePath $itemsFile
                    $itemToUpdate = $items | Where-Object { $_.id -eq $itemId } | Select-Object -First 1
                    
                    if ($itemToUpdate) {
                        $oldItem = $itemToUpdate | ConvertTo-Json | ConvertFrom-Json # Deep copy for audit
                        
                        # Apply updates
                        foreach ($key in $updates.psobject.Properties.Name) {
                            $itemToUpdate.$key = $updates.$key
                        }
                        $itemToUpdate.updatedAt = (Get-Date).ToString("o")

                        if (Set-JsonData -filePath $itemsFile -data $items) {
                            Add-AuditLog -action "UPDATE" -itemId $itemId -details @{ before = $oldItem; after = $itemToUpdate }
                            $responseText = @{ success = $true; data = $itemToUpdate } | ConvertTo-Json -Depth 10
                        } else {
                            throw "Failed to save updated item."
                        }
                    } else {
                        $statusCode = 404
                        throw "Item with ID '$itemId' not found."
                    }
                }

                "DELETE /api/items/(sbsitem_.+)" {
                    $itemId = $matches[1]
                    $items = Get-JsonData -filePath $itemsFile
                    $itemToDelete = $items | Where-Object { $_.id -eq $itemId } | Select-Object -First 1
                    
                    if ($itemToDelete) {
                        $remainingItems = $items | Where-Object { $_.id -ne $itemId }
                        if (Set-JsonData -filePath $itemsFile -data $remainingItems) {
                            Add-AuditLog -action "DELETE" -itemId $itemId -details @{ deletedData = $itemToDelete }
                            $responseText = @{ success = $true; message = "Item '$itemId' deleted." } | ConvertTo-Json
                        } else {
                            throw "Failed to save after deleting item."
                        }
                    } else {
                        $statusCode = 404
                        throw "Item with ID '$itemId' not found."
                    }
                }

                "GET /api/audit" {
                    $auditLogs = Get-JsonData -filePath $auditFile
                    $responseText = @{ success = $true; data = $auditLogs } | ConvertTo-Json -Depth 10
                }

                default {
                    $statusCode = 404
                    throw "Endpoint not found: $method $url"
                }
            }
        } catch {
            if ($statusCode -eq 200) { $statusCode = 500 } # Default to 500 if not already set
            $responseText = @{ success = $false; error = $_.Exception.Message } | ConvertTo-Json
            Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
        }

        # Send response
        $response.StatusCode = $statusCode
        $response.ContentType = "application/json"
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($responseText)
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
    }
} catch {
    Write-Host "FATAL SERVER ERROR: $_" -ForegroundColor Red
} finally {
    if ($listener -and $listener.IsListening) {
        $listener.Stop()
    }
    Write-Host "Server stopped." -ForegroundColor Yellow
}
