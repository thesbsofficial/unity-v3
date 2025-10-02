# 🔑 CLOUDFLARE TRANSFORM RULES AUTOMATION SCRIPT (Token-Based)
# Uses a scoped API Token (preferred) rather than the deprecated Global API Key.
# Required token scopes: Zone:Read, Zone:Rulesets:Edit for the target zone.

param(
    [string]$Email = "your-email@example.com"  # (Optional) Only needed if still using legacy key auth
)

Write-Host "🚀 Setting up Cloudflare Transform Rules..." -ForegroundColor Cyan

# Get Zone ID using wrangler
Write-Host "📋 Getting Zone ID for thesbsofficial.com..." -ForegroundColor Yellow

try {
    # Use wrangler to get zone info
    $zoneInfo = npx wrangler zone info thesbsofficial.com --format json | ConvertFrom-Json
    $ZoneId = $zoneInfo.id
    Write-Host "✅ Found Zone ID: $ZoneId" -ForegroundColor Green
}
catch {
    Write-Host "❌ Could not get Zone ID automatically" -ForegroundColor Red
    Write-Host "Please run: npx wrangler zone list" -ForegroundColor Yellow
    exit 1
}

if (-not $env:CLOUDFLARE_API_TOKEN) {
    Write-Host "❌ CLOUDFLARE_API_TOKEN not set!" -ForegroundColor Red
    Write-Host "Create a scoped token with Zone:Read + Zone:Rulesets:Edit and set it:" -ForegroundColor Yellow
    Write-Host "   $env:CLOUDFLARE_API_TOKEN = 'cf-xxxxxxxx'" -ForegroundColor Gray
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $env:CLOUDFLARE_API_TOKEN"
    "Content-Type"  = "application/json"
}

if ($env:CLOUDFLARE_API_KEY) {
    Write-Host "⚠️  Detected legacy CLOUDFLARE_API_KEY. Prefer using CLOUDFLARE_API_TOKEN only." -ForegroundColor Yellow
}

Write-Host "🔧 Creating Transform Rules..." -ForegroundColor Yellow

# First, get existing rulesets to avoid conflicts
try {
    $existingRulesets = Invoke-RestMethod `
        -Uri "https://api.cloudflare.com/client/v4/zones/$ZoneId/rulesets" `
        -Method GET `
        -Headers $headers
        
    Write-Host "📋 Found $($existingRulesets.result.Count) existing rulesets" -ForegroundColor Gray
}
catch {
    Write-Host "⚠️ Could not fetch existing rulesets: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Create the ruleset with all our rules
$ruleset = @{
    name = "SBS Navigation Rules"
    description = "Clean URL handling for SBS Unity website"
    kind = "zone"
    phase = "http_request_transform"
    rules = @(
        @{
            description = "SBS Clean URL Rewriting - Add .html to clean URLs"
            expression = '(http.request.uri.path matches "^/[a-zA-Z0-9_-]+$") and (not starts_with(http.request.uri.path, "/api")) and (not contains(http.request.uri.path, "."))'
            action = "rewrite"
            action_parameters = @{
                uri = @{
                    path = @{
                        expression = 'concat(http.request.uri.path, ".html")'
                    }
                }
            }
            enabled = $true
        },
        @{
            description = "SBS Remove Trailing Slashes"
            expression = '(http.request.uri.path matches "^/.+/$") and (not starts_with(http.request.uri.path, "/api"))'
            action = "rewrite"
            action_parameters = @{
                uri = @{
                    path = @{
                        expression = 'regex_replace(http.request.uri.path, "/$", "")'
                    }
                }
            }
            enabled = $true
        }
    )
}

try {
    $body = $ruleset | ConvertTo-Json -Depth 10
    Write-Host "📤 Creating SBS Navigation Ruleset..." -ForegroundColor Yellow
    
    $response = Invoke-RestMethod `
        -Uri "https://api.cloudflare.com/client/v4/zones/$ZoneId/rulesets" `
        -Method POST `
        -Headers $headers `
        -Body $body
        
    if ($response.success) {
        Write-Host "✅ Successfully created SBS Navigation Rules!" -ForegroundColor Green
        Write-Host "🆔 Ruleset ID: $($response.result.id)" -ForegroundColor Gray
        
        # Show created rules
        foreach ($rule in $response.result.rules) {
            Write-Host "   ✅ $($rule.description)" -ForegroundColor Green
        }
    } else {
        Write-Host "❌ Failed to create ruleset" -ForegroundColor Red
        Write-Host "Errors:" -ForegroundColor Red
        $response.errors | ForEach-Object { 
            Write-Host "   - $($_.message)" -ForegroundColor Red 
        }
    }
}
catch {
    Write-Host "❌ API Error: $($_.Exception.Message)" -ForegroundColor Red
    
    # Try to parse the error response
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Response: $errorBody" -ForegroundColor Gray
    }
}

Write-Host "`n🎯 Setup Summary:" -ForegroundColor Cyan
Write-Host "✅ Clean URLs: /shop → /shop.html" -ForegroundColor Green
Write-Host "✅ Trailing slashes removed automatically" -ForegroundColor Green
Write-Host "✅ API routes protected from rewriting" -ForegroundColor Green

Write-Host "`n🧪 Test your navigation now:" -ForegroundColor Yellow
Write-Host "   https://thesbsofficial.com/shop" -ForegroundColor White
Write-Host "   https://thesbsofficial.com/login" -ForegroundColor White
Write-Host "   https://thesbsofficial.com/sell" -ForegroundColor White
Write-Host "   https://thesbsofficial.com/dashboard" -ForegroundColor White

Write-Host "`n💡 Note: Changes may take 1-2 minutes to propagate globally" -ForegroundColor Gray