# SBS Unity v3

This repository contains the static site, Cloudflare Pages configuration, and D1/R2 integration for **SBS Unity v3** – the unified storefront and seller portal for the SBS streetwear community.

## 📚 Core Documentation

- **Master project guide:** [`public/🚀 SBS UNITY V3 - MASTER PROJECT DOCUMENTATION`](public/%F0%9F%9A%80%20SBS%20UNITY%20V3%20-%20MASTER%20PROJECT%20DOCUMENTATION) – exhaustive audit, history, and backlog.
- **Active reference docs:** See the `docs/` section in the master guide for per-feature write-ups (account strategy, storage architecture, quick sell builder, etc.).

## 🚀 Getting Started

| Task                               | Command                                                       |
| ---------------------------------- | ------------------------------------------------------------- |
| Install dependencies               | `npm install`                                                 |
| Run locally (Cloudflare Pages dev) | `npx wrangler pages dev public`                               |
| Deploy to production               | `npx wrangler pages deploy public --project-name=unity-v3`    |
| Run database migration             | `npx wrangler d1 execute unity-v3 --remote --file=schema.sql` |

> ℹ️ All commands expect a configured `wrangler.toml` with the proper D1 database and R2 bucket bindings.

## ✅ Latest Repository Updates

- Added a top-level `.gitignore` to stop tracking dependencies, Wrangler caches, backups, and other generated assets.
- Established this concise `README.md` to surface the master documentation and critical commands.

## 🧭 Current Focus

The high-priority backlog lives in the master documentation. At a glance:

- **Codex lane (this assistant):** project hygiene, documentation curation, build tooling, static asset fixes, and lightweight UI wiring.
- **Sonnet 4.5 lane:** advanced auth hardening, dashboard data wiring, API security, and large-scale refactors.

When picking up new work, consult the "🎯 Actionable Items" section of the master guide and claim items within the appropriate lane before making changes.
