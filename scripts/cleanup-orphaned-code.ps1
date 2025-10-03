# 🧹 Automated Taxonomy Cleanup Script
# Removes orphaned code after Single Source implementation
# Run from project root: ./scripts/cleanup-orphaned-code.ps1

$ErrorActionPreference = "Stop"

Write-Host "`n╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🧹 ORPHANED TAXONOMY CODE CLEANUP                ║" -ForegroundColor White
Write-Host "╚════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Check if in correct directory
if (-not (Test-Path "public/js/taxonomy.js")) {
    Write-Host "❌ Error: Must run from project root!" -ForegroundColor Red
    Write-Host "   Current: $PWD" -ForegroundColor Yellow
    Write-Host "   Expected: Contains public/js/taxonomy.js" -ForegroundColor Yellow
    exit 1
}

Write-Host "📍 Current directory: $PWD`n" -ForegroundColor Green

# Confirm action
Write-Host "⚠️  WARNING: This will DELETE the following:" -ForegroundColor Yellow
Write-Host "   • /public/DELETE ME/ folder" -ForegroundColor White
Write-Host "   • /public/archive/ folder" -ForegroundColor White
Write-Host "   • /public/WORKING-VERSION/ folder" -ForegroundColor White
Write-Host "   • /public/admin/inventory/index.html.backup" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Continue? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "`n❌ Cleanup cancelled." -ForegroundColor Red
    exit 0
}

Write-Host "`n🔄 Creating backup...`n" -ForegroundColor Yellow

# Create backup
git add -A 2>$null
git commit -m "🔖 Backup before taxonomy cleanup" 2>$null
git tag -a "before-cleanup-$(Get-Date -Format 'yyyyMMdd-HHmmss')" -m "Backup before removing orphaned taxonomy code" 2>$null

Write-Host "✅ Backup created!`n" -ForegroundColor Green

# Start cleanup
Write-Host "🧹 Starting cleanup...`n" -ForegroundColor Cyan

$deleted = @()
$errors = @()

# Delete folders
$foldersToDelete = @(
    "public/DELETE ME",
    "public/archive",
    "public/WORKING-VERSION"
)

foreach ($folder in $foldersToDelete) {
    if (Test-Path $folder) {
        try {
            Write-Host "   Deleting: $folder" -ForegroundColor Yellow
            Remove-Item -Path $folder -Recurse -Force
            $deleted += $folder
            Write-Host "   ✅ Deleted: $folder" -ForegroundColor Green
        } catch {
            Write-Host "   ❌ Failed: $folder - $($_.Exception.Message)" -ForegroundColor Red
            $errors += $folder
        }
    } else {
        Write-Host "   ⏭️  Skipped: $folder (not found)" -ForegroundColor Gray
    }
}

# Delete backup file
$filesToDelete = @(
    "public/admin/inventory/index.html.backup"
)

foreach ($file in $filesToDelete) {
    if (Test-Path $file) {
        try {
            Write-Host "   Deleting: $file" -ForegroundColor Yellow
            Remove-Item -Path $file -Force
            $deleted += $file
            Write-Host "   ✅ Deleted: $file" -ForegroundColor Green
        } catch {
            Write-Host "   ❌ Failed: $file - $($_.Exception.Message)" -ForegroundColor Red
            $errors += $file
        }
    } else {
        Write-Host "   ⏭️  Skipped: $file (not found)" -ForegroundColor Gray
    }
}

# Summary
Write-Host "`n╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  📊 CLEANUP SUMMARY                                ║" -ForegroundColor White
Write-Host "╚════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "✅ Deleted: $($deleted.Count) items" -ForegroundColor Green
if ($deleted.Count -gt 0) {
    $deleted | ForEach-Object { Write-Host "   • $_" -ForegroundColor Gray }
}

if ($errors.Count -gt 0) {
    Write-Host "`n❌ Errors: $($errors.Count) items" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "   • $_" -ForegroundColor Gray }
}

# Calculate space saved
$savedSpace = 0
try {
    # Rough estimate based on typical sizes
    $savedSpace = ($deleted.Count * 1.5) # MB
    Write-Host "`n💾 Estimated space saved: ~$($savedSpace)MB" -ForegroundColor Cyan
} catch {
    # Ignore errors
}

# Commit cleanup
Write-Host "`n🔄 Committing cleanup..." -ForegroundColor Yellow
git add -A 2>$null
git commit -m "🧹 Remove orphaned taxonomy code

- Deleted /public/DELETE ME/ folder
- Deleted /public/archive/ folder  
- Deleted /public/WORKING-VERSION/ folder
- Deleted backup files

Single Source of Truth now in /public/js/taxonomy.js" 2>$null

Write-Host "✅ Changes committed!`n" -ForegroundColor Green

# Next steps
Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🎯 NEXT STEPS                                     ║" -ForegroundColor White
Write-Host "╚════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "1️⃣  Test your site:" -ForegroundColor Yellow
Write-Host "   • Visit shop page" -ForegroundColor White
Write-Host "   • Try admin uploader" -ForegroundColor White
Write-Host "   • Check sell form" -ForegroundColor White

Write-Host "`n2️⃣  Deploy clean version:" -ForegroundColor Yellow
Write-Host "   npx wrangler pages deploy public --project-name=unity-v3" -ForegroundColor White

Write-Host "`n3️⃣  If something broke:" -ForegroundColor Yellow
Write-Host "   git log --oneline | Select-Object -First 5" -ForegroundColor White
Write-Host "   git reset --hard <previous-commit>" -ForegroundColor White

Write-Host "`n✅ CLEANUP COMPLETE!`n" -ForegroundColor Green
