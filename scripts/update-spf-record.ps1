# Update SPF DNS Record via Cloudflare API
# This script will update the SPF record to include MailChannels

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   UPDATING DNS VIA CLOUDFLARE API" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# We need your Cloudflare API token with DNS edit permissions
Write-Host "`nTo use this script, you need:" -ForegroundColor Yellow
Write-Host "1. Cloudflare API Token with DNS:Edit permission" -ForegroundColor White
Write-Host "2. Zone ID for thesbsofficial.com" -ForegroundColor White

Write-Host "`nSORRY - I don't have DNS:Write permission!" -ForegroundColor Red
Write-Host "Your Wrangler token only has DNS:Read" -ForegroundColor Yellow

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   MANUAL FIX REQUIRED" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nGo to Cloudflare DNS page and:" -ForegroundColor Yellow
Write-Host "1. Find the TXT record for '@' or 'thesbsofficial.com'" -ForegroundColor White
Write-Host "2. Click 'Edit'" -ForegroundColor White
Write-Host "3. The content currently shows:" -ForegroundColor White
Write-Host "   v=spf1 include:_spf.mx.cloudflare.net ~all" -ForegroundColor Red
Write-Host "4. Change it to:" -ForegroundColor White
Write-Host "   v=spf1 include:_spf.mx.cloudflare.net include:relay.mailchannels.net ~all" -ForegroundColor Green
Write-Host "5. Click 'Save'" -ForegroundColor White

Write-Host "`nJust ADD this text after '_spf.mx.cloudflare.net':" -ForegroundColor Yellow
Write-Host "   include:relay.mailchannels.net" -ForegroundColor Green

Write-Host "`nOR delete the current @ TXT record and add a new one with full content." -ForegroundColor Cyan
Write-Host ""
