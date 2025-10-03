# Deployment and Setup Scripts

This directory contains PowerShell scripts for Cloudflare infrastructure setup and deployment automation.

## 🚀 Deployment Scripts

### deploy-production.ps1 ⭐ **USE THIS FOR PRODUCTION**

Deploys to **production environment** (https://thesbsofficial.com)

**Usage:**

```powershell
.\scripts\deploy-production.ps1
```

- ✅ Deploys to `main` branch (production)
- ✅ Updates custom domain (thesbsofficial.com)
- ✅ Uses `--commit-dirty=true` to force upload
- ✅ Has access to production secrets/env vars

## ⚙️ Setup Scripts

### setup-cloudflare-rules.ps1

Automated setup script for Cloudflare firewall rules, page rules, and security settings.

### setup-transform-rules.ps1

Configures URL transform rules for the Cloudflare Pages deployment.

## 📝 Deployment Guide

### Quick Deploy to Production:

```powershell
cd "C:\Users\fredb\Desktop\unity-v3\public (4)"
.\scripts\deploy-production.ps1
```

### Test Changes Before Production:

- Use your local tooling or staging workflow of choice.
- When you're satisfied, run `deploy-production.ps1` to publish.

## 🔑 Important Notes

- **Always use `deploy-production.ps1`** to update thesbsofficial.com (main branch)
- Preview/alternate deployment scripts have been removed to avoid confusion
- All API logic is in `/functions/api/[[path]].js` and auto-deploys with Pages
- The `--commit-dirty=true` flag forces upload even with uncommitted git changes

## Future Considerations

These scripts can be adapted if you decide to:

- Set up multi-region deployments
- Create additional automation as needed
