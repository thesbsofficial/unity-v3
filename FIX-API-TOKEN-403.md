# 🔧 Fix Cloudflare Images API 403 Error

**Current Status**: API token is loaded, but getting "403 Forbidden" from Cloudflare Images API

## The Problem

Your `CLOUDFLARE_IMAGES_API_TOKEN` is configured in Pages, but Cloudflare is rejecting it with a 403 error.

## How to Fix

### Step 1: Create a New API Token with Correct Permissions

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click **"Create Token"**
3. Click **"Create Custom Token"**
4. Set these values:

   - Account → **Cloudflare Images** → **Read**
   - **Account Resources**:
     - Include → **Specific account** → Select your account
   - **Zone Resources**: Not needed (leave as "All zones")
   - **TTL**: Start Date = now, End Date = leave blank (no expiry)

5. Click **"Continue to summary"**
6. Click **"Create Token"**
7. **COPY THE TOKEN** (you won't see it again!)

### Step 2: Update the Token in Cloudflare Pages

1. Go to: https://dash.cloudflare.com
2. Navigate to: **Workers & Pages** → **unity-v3** → **Settings** → **Environment variables**
3. Find `CLOUDFLARE_IMAGES_API_TOKEN` (or `CLOUDFLARE_API_TOKEN`)
4. Click **Edit** (pencil icon)
5. Paste your new token
6. Make sure it's set for **Production** environment
7. Click **Save**
8. Wait 30 seconds for automatic redeployment

### Step 3: Test

```powershell
# Wait a moment, then test
Start-Sleep -Seconds 10
Invoke-RestMethod -Uri "https://thesbsofficial.com/api/products" -Method Get | ConvertTo-Json
```

You should see products returned instead of a 403 error!

---

## Quick Verification Commands

```powershell
# Check if API is healthy
Invoke-RestMethod -Uri "https://thesbsofficial.com/api/health" -Method Get

# Check products API (should return your images)
Invoke-RestMethod -Uri "https://thesbsofficial.com/api/products" -Method Get

# Debug mode (shows what env vars are loaded)
Invoke-RestMethod -Uri "https://thesbsofficial.com/api/products?debug=1" -Method Get
```

---

## What the Error Means

- **403 Forbidden** = Token is loaded but lacks permissions
- **"Missing: CLOUDFLARE_API_TOKEN"** = Token not configured (different error)
- **Products returned** = Working! ✅

---

**Current Issue**: Token permissions insufficient  
**Fix**: Create new token with Cloudflare Images → Read permission
