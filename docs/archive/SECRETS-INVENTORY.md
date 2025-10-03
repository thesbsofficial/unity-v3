## 🔐 SBS Unity V3 – Secrets & Environment Variable Inventory

This document is the authoritative list of secrets / environment variables required by the project, their purpose, rotation guidance, and current implementation status.

---

### 1. Classification

| Category                  | Name                          | Required   | Type   | Purpose                                      | Rotation                         | Notes                                               |
| ------------------------- | ----------------------------- | ---------- | ------ | -------------------------------------------- | -------------------------------- | --------------------------------------------------- |
| Core                      | `NODE_ENV`                    | Yes        | Config | Runtime mode                                 | N/A                              | `production` disables verbose logs                  |
| CORS                      | `ALLOWED_ORIGINS`             | Yes        | Config | Comma list of allowed origins                | On domain changes                | Avoid wildcard `*` in prod                          |
| RBAC                      | `ADMIN_ALLOWLIST_HANDLES`     | Optional   | Config | Auto-promote listed handles to admin         | When staff changes               | Comma-separated                                     |
| Admin Auth                | `ADMIN_PASSWORD`              | Yes        | Secret | Primary admin login password                 | 90 days                          | No fallback in code (remove default)                |
| Admin Recovery (optional) | `ADMIN_SECURITY_QUESTION`     | Optional   | Data   | Prompt shown during recovery                 | Yearly                           | Not sensitive but keep internal                     |
| Admin Recovery (optional) | `ADMIN_SECURITY_ANSWER`       | Optional   | Secret | Recovery answer (plan to hash)               | 180 days                         | Consider hashing + timing safe compare              |
| Sessions                  | `SESSION_SECRET`              | Yes        | Secret | Derive session/token HMAC / encryption       | 180 days (with rolling strategy) | 64 random bytes (base64)                            |
| Crypto                    | `DB_ENCRYPTION_KEY`           | Future     | Secret | Pepper / encryption key for sensitive fields | 180 days                         | Implement field-level encryption later              |
| Cloudflare                | `CLOUDFLARE_ACCOUNT_ID`       | Yes        | ID     | Account scoping for Images API               | Rare                             | Not sensitive but keep internal                     |
| Cloudflare                | `CLOUDFLARE_API_TOKEN`        | Yes        | Secret | Scoped API token (Images, R2 ops)            | 180 days                         | Replace Global API Key usage                        |
| Cloudflare (legacy)       | `CLOUDFLARE_IMAGES_API_TOKEN` | Deprecated | Secret | Older variable name for Images               | Remove after cutover             | Code will fallback                                  |
| Cloudflare Images         | `CLOUDFLARE_IMAGES_HASH`      | Yes        | ID     | Image delivery hash in URLs                  | Rare                             | Not secret but avoid leaking internal infra mapping |
| R2 (S3 API)               | `R2_ACCESS_KEY_ID`            | If S3 used | Secret | S3-compatible access key                     | 180 days                         | Use token auth if possible                          |
| R2 (S3 API)               | `R2_SECRET_ACCESS_KEY`        | If S3 used | Secret | S3-compatible secret key                     | 180 days                         | Store only in secret store                          |
| Future JWT                | `JWT_SECRET`                  | Planned    | Secret | HMAC signing key for JWT layer               | 90–180 days                      | 256-bit key                                         |

---

### 2. Current Gaps & Actions

| Gap                                                                      | Impact                           | Action                                                   | Priority |
| ------------------------------------------------------------------------ | -------------------------------- | -------------------------------------------------------- | -------- |
| Fallback admin password hardcoded in code (`SBS-Admin-2024-Secure!`)     | Compromise if secret unset       | Remove fallback & enforce presence check                 | High     |
| Two token names: `CLOUDFLARE_API_TOKEN` vs `CLOUDFLARE_IMAGES_API_TOKEN` | Drift / misconfig risk           | Normalize on `CLOUDFLARE_API_TOKEN` + fallback logic     | High     |
| No consolidated inventory file                                           | Onboarding friction              | (This file)                                              | Done     |
| No `.env.example`                                                        | Missed variables in new envs     | Add template                                             | Done     |
| Global API Key usage in scripts (`CLOUDFLARE_API_KEY`)                   | Over-privileged credentials risk | Replace with scoped API token; update PowerShell scripts | Medium   |
| Recovery answer stored plaintext                                         | Insider risk                     | Hash with SHA-256 + constant-time compare                | Medium   |
| Secrets rotation process undocumented                                    | Stale secrets risk               | Add rotation SOP below                                   | Medium   |

---

### 3. Rotation SOP

1. Generate new secret (PowerShell):
   - 64B base64: `[Convert]::ToBase64String((1..64 | % {Get-Random -Max 256}))`
2. Set in Cloudflare (Pages): `wrangler pages secret put SESSION_SECRET`
3. For Workers: `wrangler secret put SESSION_SECRET`
4. Deploy. Maintain dual validation (if implementing rolling secrets) for 7 days.
5. Invalidate old secret (remove from fallback list).

Rolling Strategy (future):

```js
// Pseudocode
const current = env.SESSION_SECRET;
const previous = env.SESSION_SECRET_PREV;
if (!validWith(current)) validWith(previous) ? reissueWith(current) : reject();
```

---

### 4. Secure Generation Guidelines

| Secret              | Length      | Format    | Notes                                   |
| ------------------- | ----------- | --------- | --------------------------------------- |
| SESSION_SECRET      | 64 bytes    | base64    | Use cryptographic RNG                   |
| DB_ENCRYPTION_KEY   | 32 bytes    | base64    | Keep offline backup                     |
| JWT_SECRET (future) | 32–64 bytes | base64    | HS256/HS512 compatibility               |
| ADMIN_PASSWORD      | ≥16 chars   | Printable | Avoid reuse + store in password manager |

---

### 5. Implementation Checks

| Check                         | Status      | Notes                                                     |
| ----------------------------- | ----------- | --------------------------------------------------------- |
| CSRF per-session secret       | Implemented | Stored hashed in sessions table                           |
| TOTP seeds stored securely    | Implemented | Plain in DB (consider encrypt or at least separate scope) |
| Secrets only in env (not git) | Partial     | Fallback admin password still present                     |
| API tokens not logged         | Verify      | Audit console.log for leaks                               |
| Admin secret rotation path    | Pending     | Provide UI or CLI path                                    |

---

### 6. Action Plan (Immediate)

1. Remove hardcoded admin password fallback.
2. Update `functions/api/products.js` to fallback: `env.CLOUDFLARE_API_TOKEN` if `CLOUDFLARE_IMAGES_API_TOKEN` unset (or rename variable entirely).
3. Migrate any use of `CLOUDFLARE_API_KEY` (global) to scoped `CLOUDFLARE_API_TOKEN` in PowerShell scripts.
4. Add validation on startup (admin endpoints) that required secrets exist; return 500 with diagnostic if missing.
5. Hash `ADMIN_SECURITY_ANSWER` when feature active.

---

### 7. Verification Commands (Local / CI)

List Pages secrets:

```
wrangler pages project secret list --project-name <project>
```

List Worker secrets:

```
wrangler secret list
```

---

### 8. Exposure Review

No plaintext API tokens found checked into repo (search patterns: `Bearer`, `CLOUDFLARE_`, `SESSION_SECRET`). Fallback literal password present – MUST remove.

---

### 9. Future Hardening Ideas

- Introduce envelope encryption for `totp_secret` (AES-GCM with `DB_ENCRYPTION_KEY`).
- Add KMS integration if migrating off Cloudflare only stack.
- Implement secret lint pre-commit (e.g. detect high-entropy strings).
- Add audit endpoint returning boolean readiness (already partially implemented in status page).

---

### 10. Appendices

#### A. Quick Entropy Test (Node REPL)

```js
const b = Buffer.from(process.env.SESSION_SECRET, "base64");
console.log(b.length); // Expect 64
```

#### B. Cloudflare Token Scopes

Minimum recommended scopes for Images read/list: `Account.Images`, R2 object read if needed; avoid broad `*` scopes.

---

Maintained: 2025-10-02
