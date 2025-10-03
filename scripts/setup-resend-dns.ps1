# Cloudflare DNS Setup for Resend Domain Verification
# Run this script to add required DNS records for thesbsofficial.com

param(
    [string]$ZoneId = "your-zone-id-here",
    [string]$ApiToken = "your-api-token-here"
)

$domain = "thesbsofficial.com"
$cfApiBase = "https://api.cloudflare.com/client/v4"

$headers = @{
    "Authorization" = "Bearer $ApiToken"
    "Content-Type" = "application/json"
}

Write-Host "🌐 Setting up Resend DNS records for $domain..." -ForegroundColor Cyan
Write-Host ""

# DNS Records to add
$records = @(
    @{
        type = "MX"
        name = "send"
        content = "feedback-smtp.eu-west-1.amazonses.com"
        priority = 10
        description = "Resend MX Record"
    },
    @{
        type = "TXT"
        name = "send"  
        content = "v=spf1 include:amazonses.com ~all"
        description = "Resend SPF Record"
    },
    @{
        type = "TXT"
        name = "resend._domainkey"
        content = "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC0tcdRT38mIf4Z18Yq2Y5KubWs2wgvrVU6Egl387B2jpyIk2c/RmWAqnVWqkcC1IUb2LeCqqxLwk6O/LsysCAw2LZSt2ydvHzDrLKW8at2g7nwjZLxKyFIx2AP9odY+Qc7Pqpyy1FqNlqwUsIeaK+sMN6PtldByPE0M0p7XBgj+wIDAQAB"
        description = "Resend DKIM Record"
    },
    @{
        type = "TXT"
        name = "_dmarc"
        content = "v=DMARC1; p=none;"
        description = "Resend DMARC Record"
    }
)

if ($ZoneId -eq "your-zone-id-here" -or $ApiToken -eq "your-api-token-here") {
    Write-Host "⚠️  Please provide your Cloudflare credentials:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Usage: .\setup-resend-dns.ps1 -ZoneId 'your-zone-id' -ApiToken 'your-api-token'" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 To find your Zone ID:" -ForegroundColor Cyan
    Write-Host "1. Go to Cloudflare dashboard" -ForegroundColor White
    Write-Host "2. Select thesbsofficial.com domain" -ForegroundColor White  
    Write-Host "3. Look for 'Zone ID' in the right sidebar" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 To create an API Token:" -ForegroundColor Cyan
    Write-Host "1. Go to Cloudflare Profile → API Tokens" -ForegroundColor White
    Write-Host "2. Create Token → Custom Token" -ForegroundColor White
    Write-Host "3. Permissions: Zone:DNS:Edit" -ForegroundColor White
    Write-Host "4. Zone Resources: Include → thesbsofficial.com" -ForegroundColor White
    Write-Host ""
    Write-Host "🔧 Manual Setup Alternative:" -ForegroundColor Magenta
    Write-Host "If you prefer to add records manually in Cloudflare:" -ForegroundColor White
    Write-Host ""
    
    foreach ($record in $records) {
        Write-Host "📌 $($record.description):" -ForegroundColor Green
        Write-Host "   Type: $($record.type)" -ForegroundColor White
        Write-Host "   Name: $($record.name)" -ForegroundColor White
        Write-Host "   Content: $($record.content)" -ForegroundColor White
        if ($record.priority) {
            Write-Host "   Priority: $($record.priority)" -ForegroundColor White
        }
        Write-Host ""
    }
    
    exit
}

# Add each DNS record
foreach ($record in $records) {
    try {
        Write-Host "📌 Adding $($record.description)..." -ForegroundColor Yellow
        
        $body = @{
            type = $record.type
            name = $record.name
            content = $record.content
            ttl = 1 # Auto
        }
        
        if ($record.priority) {
            $body.priority = $record.priority
        }
        
        $jsonBody = $body | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$cfApiBase/zones/$ZoneId/dns_records" -Method POST -Headers $headers -Body $jsonBody
        
        if ($response.success) {
            Write-Host "✅ Added: $($record.name) ($($record.type))" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed: $($record.name) - $($response.errors[0].message)" -ForegroundColor Red
        }
        
    } catch {
        Write-Host "❌ Error adding $($record.name): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Magenta
Write-Host "1. Wait 5-15 minutes for DNS propagation" -ForegroundColor White
Write-Host "2. Check Resend dashboard for verification status" -ForegroundColor White
Write-Host "3. Once verified, update email service to use noreply@thesbsofficial.com" -ForegroundColor White
Write-Host ""
Write-Host "📧 Your email system will be fully operational once domain is verified!" -ForegroundColor Green