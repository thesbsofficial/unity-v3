# Deployment and Setup Scripts

This directory contains PowerShell scripts for Cloudflare infrastructure setup and deployment automation.

## Scripts

### deploy-worker.ps1

Deploys standalone Cloudflare Workers (currently `workers/sbs-products-api.js`).

**Usage:**

```powershell
.\scripts\deploy-worker.ps1 -WorkerName "sbs-products-api"
```

**Note:** The main app uses Pages Functions instead, so this is primarily for reference or future worker extraction.

### setup-cloudflare-rules.ps1

Automated setup script for Cloudflare firewall rules, page rules, and security settings.

### setup-transform-rules.ps1

Configures URL transform rules for the Cloudflare Pages deployment.

## Current Deployment Method

The primary deployment method is via Cloudflare Pages:

```bash
npx wrangler pages deploy public --project-name=unity-v3
```

All API logic is in `/functions/api/[[path]].js` and auto-deploys with the Pages site.

## Future Considerations

These scripts can be adapted if you decide to:

- Extract specific APIs to standalone workers for better isolation
- Set up multi-region deployments
- Create staging/production environment automation
