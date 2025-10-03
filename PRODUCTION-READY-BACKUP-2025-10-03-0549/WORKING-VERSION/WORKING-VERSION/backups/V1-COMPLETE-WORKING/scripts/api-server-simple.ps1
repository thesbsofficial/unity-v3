# Simple API Server for SBS Media Hub
# Based on working reference from FINAL-WORKING-VERSION

param(
    [int]$Port = 9600
)

# Import the API handler
. ".\api-handler.ps1"

# Create HTTP listener
Add-Type -AssemblyName System.Web
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")

try {
    $listener.Start()
    Write-Host "🟢 API Server running on port $Port" -ForegroundColor Green
    Write-Host "📡 Handling requests at http://localhost:$Port/api/images" -ForegroundColor Cyan
    Write-Host "🛑 Press Ctrl+C to stop" -ForegroundColor Yellow
    
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        Write-Host "$(Get-Date -Format 'HH:mm:ss') $($request.HttpMethod) $($request.Url.LocalPath)" -ForegroundColor Gray
        
        # Set CORS headers
        $response.Headers.Add('Access-Control-Allow-Origin', '*')
        $response.Headers.Add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        $response.Headers.Add('Access-Control-Allow-Headers', '*')
        
        # Handle CORS preflight
        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }
        
        # Try to handle API requests
        $handled = Handle-ApiRequest -Request $request -Response $response
        
        if (-not $handled) {
            # Not an API request
            $response.StatusCode = 404
            $errorResponse = @{
                success = $false
                error = "Endpoint not found"
            } | ConvertTo-Json
            
            $response.ContentType = "application/json; charset=utf-8"
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($errorResponse)
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
            $response.Close()
        }
    }
} catch {
    Write-Host "Error starting server: $_" -ForegroundColor Red
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
        Write-Host "Server stopped." -ForegroundColor Yellow
    }
}