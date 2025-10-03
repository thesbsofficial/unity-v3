# 🚀 DEPLOY MAIN (PRODUCTION)
# Deploys the current workspace to the production branch (main) where secrets live
# Uses --commit-dirty=true to force upload even with uncommitted changes

Write-Host "🚀 Deploying MAIN to PRODUCTION..." -ForegroundColor Cyan
Write-Host "   Target: https://thesbsofficial.com" -ForegroundColor Gray
Write-Host "   Branch: main (production)" -ForegroundColor Gray
Write-Host "   Mode: Force upload (--commit-dirty)" -ForegroundColor Yellow
Write-Host ""

# Deploy to main branch with force flag
npx wrangler pages deploy ./public --project-name unity-v3 --branch main --commit-dirty=true

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Your site is live at:" -ForegroundColor Cyan
    Write-Host "   https://thesbsofficial.com" -ForegroundColor White
    Write-Host ""
    Write-Host "🧪 Test your API:" -ForegroundColor Yellow
    Write-Host "   https://thesbsofficial.com/api/products" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host "Check the errors above for details." -ForegroundColor Yellow
}
