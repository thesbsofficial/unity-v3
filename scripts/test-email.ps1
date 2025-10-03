# Auto-test email every 30 seconds until it works
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   EMAIL AUTO-TESTER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nDNS records are LIVE in Cloudflare!" -ForegroundColor Green
Write-Host "Waiting for propagation (usually 2-5 minutes)..." -ForegroundColor Yellow
Write-Host "`nTesting every 30 seconds..." -ForegroundColor White
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

$attempt = 1
$maxAttempts = 10

while ($attempt -le $maxAttempts) {
    Write-Host "[$attempt/$maxAttempts] Testing..." -ForegroundColor Cyan -NoNewline
    
    try {
        $response = Invoke-WebRequest -Uri "https://thesbsofficial.com/api/test-email" -Method POST -Headers @{"Content-Type" = "application/json" } -Body '{"email":"fredbademosi1@icloud.com"}' -ErrorAction Stop
        
        Write-Host " SUCCESS!" -ForegroundColor Green
        Write-Host "`n========================================" -ForegroundColor Green
        Write-Host "   EMAIL SENT SUCCESSFULLY!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "`nResponse:" -ForegroundColor Cyan
        Write-Host $response.Content -ForegroundColor White
        Write-Host "`n CHECK YOUR INBOX!" -ForegroundColor Yellow
        Write-Host "   fredbademosi1@icloud.com" -ForegroundColor Magenta
        Write-Host "   (Also check spam/junk folder)" -ForegroundColor Gray
        Write-Host "`n Subject: Verify Your SBS Account" -ForegroundColor White
        Write-Host " From: noreply@thesbsofficial.com" -ForegroundColor White
        Write-Host ""
        break
    }
    catch {
        Write-Host " Still waiting..." -ForegroundColor Yellow
        
        if ($attempt -lt $maxAttempts) {
            Write-Host "   Trying again in 30 seconds..." -ForegroundColor Gray
            Start-Sleep -Seconds 30
        }
    }
    
    $attempt++
}

if ($attempt -gt $maxAttempts) {
    Write-Host "`n========================================" -ForegroundColor Red
    Write-Host "   DNS NOT PROPAGATED YET" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "`nDNS can take up to 10 minutes sometimes." -ForegroundColor Yellow
    Write-Host "Run this script again in a few minutes:" -ForegroundColor White
    Write-Host "   .\scripts\test-email.ps1" -ForegroundColor Cyan
    Write-Host ""
}
