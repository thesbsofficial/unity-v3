# Simple HTTP Server for testing
param([int]$Port = 8080)

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")

try {
    $listener.Start()
    Write-Host "HTTP server running on http://localhost:$Port" -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop..." -ForegroundColor Yellow

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $response = $context.Response
        
        # Serve the HTML file
        $content = Get-Content 'sbs-media-hub-FINAL.html' -Raw -Encoding UTF8
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($content)
        
        $response.ContentType = 'text/html; charset=utf-8'
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.OutputStream.Close()
    }
} catch {
    Write-Host "Server error: $_" -ForegroundColor Red
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
}