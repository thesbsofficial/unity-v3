# Workers Directory

This directory contains standalone Cloudflare Workers that may have been used in earlier iterations or for specific edge functions.

## Current Contents

- **sbs-products-api.js** — standalone worker for products API with CORS and Cloudflare Images integration.

## Status

⚠️ **Not currently deployed** — The main application uses Cloudflare Pages Functions (`/functions/api/`) instead of separate workers.

This worker is kept as a reference for future API extraction or microservice migration if needed.

## Usage Consideration

If you want to deploy this as a standalone worker:

1. Create a separate `wrangler.toml` in this directory
2. Configure proper D1/R2 bindings
3. Deploy with: `npx wrangler deploy workers/sbs-products-api.js`

For now, all API logic lives in `/functions/api/[[path]].js` which is automatically deployed with the Pages site.
