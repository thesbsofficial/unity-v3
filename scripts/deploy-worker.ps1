# 🚀 SBS PRODUCTS API WORKER DEPLOYMENT
# Deploy your Cloudflare Worker to serve product images securely

param(
    [string]$WorkerName = "sbs-products-api"
)

Write-Host "🚀 Deploying SBS Products API Worker..." -ForegroundColor Cyan

# Check if we're in the right directory
if (!(Test-Path "workers\sbs-products-api.js")) {
    Write-Host "❌ Worker file not found. Make sure you're in the project root." -ForegroundColor Red
    exit 1
}

# Deploy the worker
Write-Host "📤 Deploying worker: $WorkerName" -ForegroundColor Yellow

npx wrangler deploy workers/sbs-products-api.js --name $WorkerName --compatibility-date 2024-09-30

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Worker deployed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🔧 Next Steps:" -ForegroundColor Cyan
        Write-Host "1. Add these environment variables to your worker:" -ForegroundColor Yellow
        Write-Host "   - CLOUDFLARE_ACCOUNT_ID (your account ID)" -ForegroundColor White
        Write-Host "   - CLOUDFLARE_API_TOKEN (with Images:Read permission)" -ForegroundColor White
        Write-Host "   - CLOUDFLARE_IMAGES_HASH (your imagedelivery.net hash)" -ForegroundColor White
        Write-Host ""
        Write-Host "2. Set environment variables:" -ForegroundColor Yellow
        Write-Host "   npx wrangler secret put CLOUDFLARE_API_TOKEN" -ForegroundColor Gray
        Write-Host "   npx wrangler secret put CLOUDFLARE_ACCOUNT_ID" -ForegroundColor Gray
        Write-Host "   npx wrangler secret put CLOUDFLARE_IMAGES_HASH" -ForegroundColor Gray
        Write-Host ""
        Write-Host "3. Test your API endpoints:" -ForegroundColor Yellow
        Write-Host "   https://$WorkerName.YOUR-SUBDOMAIN.workers.dev/api/products" -ForegroundColor Gray
        Write-Host "   https://$WorkerName.YOUR-SUBDOMAIN.workers.dev/api/health" -ForegroundColor Gray
        Write-Host ""
        Write-Host "4. Update your shop.html to use the worker URL" -ForegroundColor Yellow
} else {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
}

Write-Host ""
Write-Host "💡 Pro Tips:" -ForegroundColor Cyan
Write-Host "- Your worker will serve all 60 images as products" -ForegroundColor White
Write-Host "- Images are auto-categorized by filename" -ForegroundColor White
Write-Host "- Prices are generated based on product type" -ForegroundColor White
Write-Host "- Full CORS support for your domain" -ForegroundColor White