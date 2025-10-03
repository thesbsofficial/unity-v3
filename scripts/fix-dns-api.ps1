# Cloudflare DNS Update Script
# Updates SPF record to include MailChannels

param(
    [Parameter(Mandatory = $true)]
    [string]$ApiToken,
    
    [Parameter(Mandatory = $false)]
    [string]$ZoneId = ""
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   CLOUDFLARE DNS UPDATER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$headers = @{
    "Authorization" = "Bearer $ApiToken"
    "Content-Type"  = "application/json"
}

try {
    # Get Zone ID if not provided
    if ($ZoneId -eq "") {
        Write-Host "`nFetching zone information..." -ForegroundColor Yellow
        $zonesResponse = Invoke-RestMethod -Uri "https://api.cloudflare.com/v4/zones?name=thesbsofficial.com" -Headers $headers -Method Get
        
        if ($zonesResponse.success -and $zonesResponse.result.Count -gt 0) {
            $ZoneId = $zonesResponse.result[0].id
            Write-Host "✓ Found Zone ID: $ZoneId" -ForegroundColor Green
        }
        else {
            Write-Host "✗ Could not find zone for thesbsofficial.com" -ForegroundColor Red
            exit 1
        }
    }

    # Get existing DNS records
    Write-Host "`nFetching DNS records..." -ForegroundColor Yellow
    $dnsResponse = Invoke-RestMethod -Uri "https://api.cloudflare.com/v4/zones/$ZoneId/dns_records?type=TXT&name=thesbsofficial.com" -Headers $headers -Method Get
    
    if ($dnsResponse.success) {
        Write-Host "✓ Found $($dnsResponse.result.Count) TXT record(s)" -ForegroundColor Green
        
        # Find the SPF record
        $spfRecord = $dnsResponse.result | Where-Object { $_.content -like "*spf1*" }
        
        if ($spfRecord) {
            Write-Host "`nCurrent SPF record:" -ForegroundColor Yellow
            Write-Host "  $($spfRecord.content)" -ForegroundColor White
            
            # Check if MailChannels is already included
            if ($spfRecord.content -like "*relay.mailchannels.net*") {
                Write-Host "`n✓ MailChannels already included in SPF!" -ForegroundColor Green
                Write-Host "DNS is correct. Testing email..." -ForegroundColor Cyan
            }
            else {
                # Update SPF record to include MailChannels
                $newSpfContent = "v=spf1 include:_spf.mx.cloudflare.net include:relay.mailchannels.net ~all"
                
                Write-Host "`nUpdating SPF record..." -ForegroundColor Yellow
                Write-Host "New content:" -ForegroundColor Cyan
                Write-Host "  $newSpfContent" -ForegroundColor Green
                
                $updateBody = @{
                    type    = "TXT"
                    name    = "@"
                    content = $newSpfContent
                    ttl     = 1
                    proxied = $false
                } | ConvertTo-Json
                
                $updateResponse = Invoke-RestMethod -Uri "https://api.cloudflare.com/v4/zones/$ZoneId/dns_records/$($spfRecord.id)" -Headers $headers -Method PUT -Body $updateBody
                
                if ($updateResponse.success) {
                    Write-Host "`n✓ SPF RECORD UPDATED!" -ForegroundColor Green
                    Write-Host "✓ MailChannels is now enabled!" -ForegroundColor Green
                    Write-Host "`nWaiting 30 seconds for DNS propagation..." -ForegroundColor Yellow
                    Start-Sleep -Seconds 30
                }
                else {
                    Write-Host "`n✗ Failed to update record" -ForegroundColor Red
                    Write-Host "Error: $($updateResponse.errors)" -ForegroundColor Red
                    exit 1
                }
            }
        }
        else {
            Write-Host "`n✗ No SPF record found!" -ForegroundColor Red
            Write-Host "Creating new SPF record..." -ForegroundColor Yellow
            
            $newSpfContent = "v=spf1 include:_spf.mx.cloudflare.net include:relay.mailchannels.net ~all"
            
            $createBody = @{
                type    = "TXT"
                name    = "@"
                content = $newSpfContent
                ttl     = 1
                proxied = $false
            } | ConvertTo-Json
            
            $createResponse = Invoke-RestMethod -Uri "https://api.cloudflare.com/v4/zones/$ZoneId/dns_records" -Headers $headers -Method POST -Body $createBody
            
            if ($createResponse.success) {
                Write-Host "✓ SPF RECORD CREATED!" -ForegroundColor Green
            }
            else {
                Write-Host "✗ Failed to create record" -ForegroundColor Red
                exit 1
            }
        }
    }
    
    # Test email
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "   TESTING EMAIL" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    Write-Host "`nSending test email..." -ForegroundColor Yellow
    $emailResponse = Invoke-RestMethod -Uri "https://thesbsofficial.com/api/test-email" -Method POST -Headers @{"Content-Type" = "application/json" } -Body '{"email":"fredbademosi1@icloud.com"}'
    
    Write-Host "`n✓ SUCCESS!" -ForegroundColor Green
    Write-Host $emailResponse -ForegroundColor Cyan
    Write-Host "`n📧 CHECK YOUR INBOX: fredbademosi1@icloud.com" -ForegroundColor Yellow
    Write-Host "(Also check spam/junk folder)" -ForegroundColor Gray
    
}
catch {
    Write-Host "`n✗ ERROR:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $responseBody = $reader.ReadToEnd()
        Write-Host "`nAPI Response:" -ForegroundColor Yellow
        Write-Host $responseBody -ForegroundColor White
    }
}

Write-Host ""
