# 🔧 URGENT: Fix Production Branch Configuration

## The Problem

Your deployments are split between two branches:
- **`production` branch** = Has environment variables ✅
- **`main` branch** = Treated as Preview, NO environment variables ❌

When you deploy with `--branch main`, it creates **Preview** deployments without secrets!

## The Solution

Go to Cloudflare Dashboard and change the production branch from `production` to `main`:

### Step-by-Step Fix:

1. **Go to**: https://dash.cloudflare.com
2. **Navigate**: Workers & Pages → `unity-v3` → **Settings** → **Builds & deployments**
3. **Find**: "Production branch" setting
4. **Change**: `production` → `main`
5. **Click**: Save

### Then Clean Up Old Deployments:

1. In Cloudflare Dashboard: Workers & Pages → `unity-v3` → **Deployments**
2. Delete all the Preview deployments (the ones from `main` branch)
3. Keep the one Production deployment

### Update Your Deploy Script:

The script already targets `main`, which is perfect once you change the production branch setting!

---

## Why This Happened

Your Cloudflare Pages project was configured with `production` as the production branch, but your deploy script was deploying to `main`. This created Preview deployments that don't have access to environment variables (secrets).

---

## After the Fix

Once you set `main` as the production branch:
- All future deploys to `main` will be **Production** deployments ✅
- They will have access to your environment variables ✅
- Your API will work with Cloudflare Images ✅

---

**Do this now**: Change production branch to `main` in Cloudflare Dashboard!
