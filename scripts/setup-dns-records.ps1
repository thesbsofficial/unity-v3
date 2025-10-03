# DNS Setup Script for MailChannels + Email Routing
# This script adds the required TXT records to Cloudflare DNS

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "   CLOUDFLARE DNS SETUP FOR EMAIL VERIFICATION" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

Write-Host "`nI cannot add DNS records via Wrangler." -ForegroundColor Yellow
Write-Host "You need to add them manually in Cloudflare Dashboard." -ForegroundColor Yellow

Write-Host "`n🔧 REQUIRED DNS RECORDS:" -ForegroundColor Green

Write-Host "`n📝 RECORD 1: SPF (Email Sending + Routing)" -ForegroundColor Cyan
Write-Host "   Type:    TXT" -ForegroundColor White
Write-Host "   Name:    @" -ForegroundColor White
Write-Host "   Content: v=spf1 include:_spf.mx.cloudflare.net include:relay.mailchannels.net ~all" -ForegroundColor Yellow
Write-Host "   TTL:     Auto" -ForegroundColor White

Write-Host "`n📝 RECORD 2: MailChannels Lockdown (Security)" -ForegroundColor Cyan
Write-Host "   Type:    TXT" -ForegroundColor White
Write-Host "   Name:    _mailchannels" -ForegroundColor White
Write-Host "   Content: v=mc1 cfid=thesbsofficial.com" -ForegroundColor Yellow
Write-Host "   TTL:     Auto" -ForegroundColor White

Write-Host "`n📍 WHERE TO ADD:" -ForegroundColor Green
Write-Host "   1. Go to: https://dash.cloudflare.com" -ForegroundColor White
Write-Host "   2. Select domain: thesbsofficial.com" -ForegroundColor White
Write-Host "   3. Click: DNS > Records" -ForegroundColor White
Write-Host "   4. Click: Add record" -ForegroundColor White
Write-Host "   5. Add both TXT records above" -ForegroundColor White
Write-Host "   6. Wait 5 minutes for propagation" -ForegroundColor White

Write-Host "`n✅ WHAT THIS DOES:" -ForegroundColor Green
Write-Host "   Keeps Email Routing working (admin@thesbsofficial.com)" -ForegroundColor White
Write-Host "   Enables MailChannels (verification emails)" -ForegroundColor White
Write-Host "   No conflicts!" -ForegroundColor White

Write-Host "`n⏱️  AFTER ADDING:" -ForegroundColor Yellow
Write-Host "   Wait 5 minutes, then run:" -ForegroundColor White
Write-Host "   Invoke-WebRequest -Uri 'https://thesbsofficial.com/api/test-email' -Method POST -Headers @{'Content-Type'='application/json'} -Body '{\"email\":\"fredbademosi1@icloud.com\"}'" -ForegroundColor Cyan

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host ""
