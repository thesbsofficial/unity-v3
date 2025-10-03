# 🎯 Next Steps — Sonnet Lane Handoff

This document outlines the remaining high-priority work items for Sonnet 4.5 (advanced agent lane).

---

## 🔴 HIGH PRIORITY — This Week

### 1. Wire Dashboard to Live Data (`public/admin/dashboard.html`)

**File:** `public/admin/dashboard.html`  
**Current State:** Static presentational dashboard with hardcoded placeholders  
**Required Changes:**

- Add authentication check on page load (redirect if not logged in)
- Fetch user profile from `/api/users/me` endpoint
- Display user's sell cases with status from `/api/cases/user/:userId`
- Show order history from `/api/orders/user/:userId`
- Add profile edit form that PUTs to `/api/users/:userId`
- Implement error handling and loading states

**API Endpoints Needed:**

```javascript
GET /api/users/me → { id, social_handle, email, full_name, phone, ... }
GET /api/cases/user/:userId → [{ case_id, category, brand, status, ... }]
GET /api/orders/user/:userId → [{ id, product_id, total_amount, order_status, ... }]
PUT /api/users/:userId → Update user profile
```

---

### 2. Upgrade Authentication Security ⚠️ CRITICAL

**File:** `functions/api/[[path]].js`  
**Current State:** SHA-256 password hashing, localStorage session tokens  
**Security Vulnerabilities:**

- Weak password hashing (SHA-256 with static salt)
- Session tokens stored in localStorage (XSS vulnerable)
- No CSRF protection
- No rate limiting on auth endpoints

**Required Changes:**

#### A. Password Hashing

Replace SHA-256 with bcrypt or Argon2:

```javascript
// Install: npm install bcryptjs
import bcrypt from "bcryptjs";

// Registration
const hashedPassword = await bcrypt.hash(password, 10);

// Login verification
const isValid = await bcrypt.compare(password, user.password_hash);
```

#### B. Session Token Storage

Move from localStorage to HttpOnly cookies:

```javascript
// Set cookie in API response
return new Response(JSON.stringify(userData), {
  headers: {
    "Set-Cookie": `sbs_session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/`,
  },
});
```

#### C. CSRF Protection

Add CSRF token validation:

```javascript
// Generate CSRF token on login
const csrfToken = crypto.randomUUID();
// Store in session, return to client
// Client must include in X-CSRF-Token header for mutations
```

#### D. Rate Limiting

Implement rate limiting on auth endpoints:

```javascript
// Use KV for rate limit tracking
// Limit: 5 login attempts per 15 minutes per IP
const rateLimitKey = `ratelimit:login:${clientIP}`;
```

---

### 3. Consolidate Database Schemas

**Files:** `schema.sql` (root) + `database/schema-sell-cases.sql`  
**Current State:** Two schema files with potential discrepancies  
**Required Changes:**

- Compare both schemas line-by-line
- Merge any missing columns/constraints from `schema-sell-cases.sql` into `schema.sql`
- Remove redundant `full_name` column from users table (use `first_name + last_name`)
- Test merged schema on a dev D1 instance
- Delete `database/schema-sell-cases.sql` after verification

**SQL Changes Needed:**

```sql
-- Remove redundant column
ALTER TABLE users DROP COLUMN full_name;

-- Ensure consistent indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sell_cases_user ON sell_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
```

---

## 🟡 MEDIUM PRIORITY — This Month

### 4. Extract Secrets to Environment Variables

**Current Issue:** Hardcoded secrets in code  
**Solution:** Use Cloudflare Pages environment variables or Wrangler secrets

```bash
# Set secrets via Wrangler
npx wrangler pages secret put DB_ENCRYPTION_KEY
npx wrangler pages secret put SESSION_SECRET
npx wrangler pages secret put R2_ACCESS_KEY_ID
npx wrangler pages secret put R2_SECRET_ACCESS_KEY
```

Access in code:

```javascript
export async function onRequest(context) {
  const { env } = context;
  const secret = env.SESSION_SECRET;
  // ...
}
```

---

### 5. Add Email Verification Flow

**New Feature:** Email verification for new registrations  
**Required:**

- Generate verification token on registration
- Send verification email (use Cloudflare Email Workers or Resend API)
- Add `email_verified` boolean to users table
- Require verification before sensitive actions

---

### 6. Password Reset Functionality

**New Feature:** Allow users to reset forgotten passwords  
**Required:**

- Add `reset_token` and `reset_token_expires` columns to users table
- Create `/api/auth/forgot-password` endpoint
- Create `/api/auth/reset-password` endpoint
- Send reset email with time-limited token

---

## 🟢 NICE TO HAVE — Future

### 7. Order Tracking System

Real-time order status updates for buyers

### 8. Admin Panel Enhancements

Tools for managing sell cases, approving listings, etc.

### 9. Push Notifications

Browser notifications for order updates, case approvals

### 10. Analytics Integration

Google Analytics or Cloudflare Web Analytics

---

## 📋 Checklist Before Deployment

- [ ] Dashboard shows real user data
- [ ] Passwords hashed with bcrypt/Argon2
- [ ] Session tokens in HttpOnly cookies
- [ ] CSRF protection enabled
- [ ] Rate limiting on auth endpoints
- [ ] Database schemas consolidated
- [ ] Environment variables for all secrets
- [ ] Email verification active
- [ ] Password reset functional
- [ ] All tests passing

---

## 🔗 Related Documentation

- **Current Auth Flow:** See "AUTHENTICATION FLOW" section in master guide
- **Database Schema:** See "DATABASE SCHEMA (CURRENT STATE)" section
- **Security Issues:** See "Security Issues" under authentication

---

**Last Updated:** October 2, 2025 (3:20 AM)  
**Prepared by:** Codex cleanup session  
**For:** Sonnet 4.5 advanced agent work
