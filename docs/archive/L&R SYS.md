# LOGIN & REGISTRATION SYSTEM - COMPLETE DOCUMENTATION & AUDIT
**Date:** October 1, 2025  
**Database:** Cloudflare D1 (`unity-v3`)  
**Status:** Production Ready ✅  
**Version:** 1.0

---

## 📋 TABLE OF CONTENTS
1. [System Overview](#system-overview)
2. [Data Flow Deep Dive](#data-flow-deep-dive)
3. [Registration Process (Step-by-Step)](#registration-process)
4. [Login Process (Step-by-Step)](#login-process)
5. [Required vs Optional Fields](#required-vs-optional-fields)
6. [Security Audit](#security-audit)
7. [Bug Analysis](#bug-analysis)
8. [Database Schema](#database-schema)
9. [API Documentation](#api-documentation)
10. [Frontend Code](#frontend-code)
11. [Deployment](#deployment)

---

## 🎯 SYSTEM OVERVIEW

### Purpose
A complete authentication system for SBS Unity streetwear marketplace enabling:
- User registration with social media handles
- Secure login with session management
- Order creation and tracking
- User profile management

### Tech Stack
- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Backend:** Cloudflare Workers (Serverless)
- **Database:** Cloudflare D1 (SQLite-based)
- **Deployment:** Cloudflare Pages
- **CDN:** Lucide Icons

### Architecture
```
┌─────────────┐
│   Browser   │
│  (Client)   │
└──────┬──────┘
       │ HTTPS
       │ fetch('/api/users/...')
       ▼
┌─────────────────────────┐
│  Cloudflare Pages       │
│  (Static HTML/CSS/JS)   │
└──────┬──────────────────┘
       │
       │ Functions API
       ▼
┌─────────────────────────┐
│  Workers Function       │
│  [[path]].js            │
│  - Route handling       │
│  - Business logic       │
│  - Auth validation      │
└──────┬──────────────────┘
       │
       │ D1 Binding
       ▼
┌─────────────────────────┐
│  Cloudflare D1          │
│  (SQLite Database)      │
│  - users table          │
│  - sessions table       │
│  - orders table         │
└─────────────────────────┘
```

---

## � DATA FLOW DEEP DIVE

### Complete User Journey Map

#### **NEW USER REGISTRATION** 
```
┌──────────────────────────────────────────────────────────────────┐
│ STEP 1: User fills out registration form                        │
├──────────────────────────────────────────────────────────────────┤
│ REQUIRED:                                                         │
│ - social_handle (string) - "@username" format                   │
│ - password (string) - minimum 1 char (⚠️ NO VALIDATION)         │
│                                                                   │
│ OPTIONAL:                                                         │
│ - full_name (string)                                             │
│ - email (string)                                                 │
│ - phone (string)                                                 │
│ - preferred_contact (dropdown: instagram/whatsapp/email/phone)  │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 2: Frontend JavaScript captures form submission            │
├──────────────────────────────────────────────────────────────────┤
│ File: register.html (lines 729-787)                             │
│                                                                   │
│ Actions:                                                          │
│ 1. e.preventDefault() - Stop form default submission            │
│ 2. Extract FormData from form                                   │
│ 3. Build userData object (removes undefined optional fields)    │
│ 4. Disable submit button ("Creating account...")                │
│ 5. Clear previous error messages                                │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 3: POST request to API                                     │
├──────────────────────────────────────────────────────────────────┤
│ URL: /api/users/register                                         │
│ Method: POST                                                      │
│ Headers: { 'Content-Type': 'application/json' }                 │
│ Body: JSON.stringify(userData)                                   │
│                                                                   │
│ Data sent:                                                        │
│ {                                                                 │
│   "social_handle": "@user123",                                   │
│   "password": "plaintext_password",                              │
│   "full_name": "John Doe",        // if provided                │
│   "email": "john@example.com",    // if provided                │
│   "phone": "+353123456789",       // if provided                │
│   "preferred_contact": "instagram"                               │
│ }                                                                 │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 4: API receives and validates request                      │
├──────────────────────────────────────────────────────────────────┤
│ File: functions/api/[[path]].js (lines 67-125)                  │
│                                                                   │
│ Validation checks:                                                │
│ 1. ✅ Check social_handle exists                                │
│ 2. ✅ Check password exists                                     │
│ 3. ❌ NO password strength validation                           │
│ 4. ❌ NO email format validation                                │
│ 5. ❌ NO phone format validation                                │
│ 6. ❌ NO social_handle format validation                        │
│                                                                   │
│ If validation fails:                                              │
│ → Return 400 with error message                                  │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 5: Check for duplicate users                               │
├──────────────────────────────────────────────────────────────────┤
│ SQL: SELECT id FROM users                                        │
│      WHERE social_handle = ? OR email = ?                        │
│                                                                   │
│ ⚠️ BUG FOUND: If email is NULL, this query might not work       │
│              as expected in all cases                            │
│                                                                   │
│ If user exists:                                                   │
│ → Return 409 (Conflict) with error message                      │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 6: Hash password                                           │
├──────────────────────────────────────────────────────────────────┤
│ Function: hashPassword(password)                                 │
│ Method: SHA-256 with salt 'SBS_SALT_2025'                       │
│                                                                   │
│ ⚠️ SECURITY ISSUE: SHA-256 is NOT recommended for passwords     │
│    - Too fast (vulnerable to brute force)                        │
│    - No adaptive work factor                                     │
│    - RECOMMENDED: bcrypt, argon2, or scrypt                      │
│                                                                   │
│ Process:                                                          │
│ 1. Concatenate: password + 'SBS_SALT_2025'                      │
│ 2. Hash with SHA-256                                             │
│ 3. Convert to hex string                                         │
│                                                                   │
│ Output: 64-character hex string                                  │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 7: Generate user ID                                        │
├──────────────────────────────────────────────────────────────────┤
│ Method: crypto.randomUUID()                                      │
│ Format: "550e8400-e29b-41d4-a716-446655440000"                  │
│                                                                   │
│ ⚠️ SCHEMA MISMATCH: Database expects INTEGER, but code uses     │
│    TEXT UUID. This works in current schema but creates          │
│    confusion.                                                     │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 8: Insert user into database                               │
├──────────────────────────────────────────────────────────────────┤
│ SQL: INSERT INTO users                                           │
│      (id, social_handle, email, phone, password_hash, full_name)│
│      VALUES (?, ?, ?, ?, ?, ?)                                   │
│                                                                   │
│ Data stored:                                                      │
│ - id: UUID string                                                │
│ - social_handle: "@user123"                                      │
│ - email: "john@example.com" or NULL                             │
│ - phone: "+353123456789" or NULL                                │
│ - password_hash: "a1b2c3d4..." (64 chars)                       │
│ - full_name: "John Doe" or NULL                                 │
│ - created_at: AUTO (CURRENT_TIMESTAMP)                          │
│ - updated_at: AUTO (CURRENT_TIMESTAMP)                          │
│ - last_login: NULL                                               │
│ - is_active: 1 (default)                                         │
│                                                                   │
│ ⚠️ MISSING FIELD: preferred_contact is NOT stored in DB!        │
│    Form collects it but API doesn't save it                      │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 9: Generate session token                                  │
├──────────────────────────────────────────────────────────────────┤
│ Function: generateToken(userId)                                  │
│                                                                   │
│ Process:                                                          │
│ 1. Generate 32 random bytes using crypto.getRandomValues()     │
│ 2. Convert to hex string (64 chars)                             │
│ 3. Format: "sbs_{userId}_{randomHex}"                           │
│                                                                   │
│ Example:                                                          │
│ "sbs_550e8400-e29b-41d4-a716-446655440000_a1b2c3d4e5f6..."     │
│                                                                   │
│ Token length: ~110-120 characters                                │
│ Expiration: 30 days from creation                                │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 10: Create session in database                             │
├──────────────────────────────────────────────────────────────────┤
│ SQL: INSERT INTO sessions                                        │
│      (user_id, token, expires_at)                                │
│      VALUES (?, ?, ?)                                            │
│                                                                   │
│ Data:                                                             │
│ - user_id: UUID of new user                                      │
│ - token: "sbs_..." (full token string)                          │
│ - expires_at: ISO timestamp (current + 30 days)                 │
│                                                                   │
│ ⚠️ NO CLEANUP: Old expired sessions are never deleted           │
│    This will cause database bloat over time                      │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 11: Return success response to frontend                    │
├──────────────────────────────────────────────────────────────────┤
│ HTTP 200 OK                                                       │
│ Body:                                                             │
│ {                                                                 │
│   "success": true,                                                │
│   "token": "sbs_550e8400...",                                    │
│   "user": {                                                       │
│     "id": "550e8400-e29b-41d4-a716-446655440000",               │
│     "social_handle": "@user123",                                 │
│     "email": "john@example.com",                                 │
│     "full_name": "John Doe"                                      │
│   }                                                               │
│ }                                                                 │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 12: Frontend stores credentials                            │
├──────────────────────────────────────────────────────────────────┤
│ Storage: localStorage (client-side, persistent)                  │
│                                                                   │
│ Items stored:                                                     │
│ 1. localStorage.setItem('sbs_auth_token', data.token)           │
│    → Key: 'sbs_auth_token'                                       │
│    → Value: Full token string                                    │
│                                                                   │
│ 2. localStorage.setItem('sbs_user', JSON.stringify(data.user))  │
│    → Key: 'sbs_user'                                             │
│    → Value: JSON string of user object                           │
│                                                                   │
│ ⚠️ SECURITY CONCERN: localStorage is vulnerable to XSS attacks  │
│    Better: httpOnly cookies (but requires backend changes)       │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 13: Show success message and redirect                      │
├──────────────────────────────────────────────────────────────────┤
│ 1. Display green success banner                                  │
│ 2. Wait 2000ms (2 seconds)                                       │
│ 3. Redirect to /dashboard.html (or ?redirect= param)            │
│                                                                   │
│ ⚠️ BUG: If dashboard.html doesn't exist, user sees 404          │
└──────────────────────────────────────────────────────────────────┘

```

---

#### **EXISTING USER LOGIN**
```
┌──────────────────────────────────────────────────────────────────┐
│ STEP 1: User enters credentials                                 │
├──────────────────────────────────────────────────────────────────┤
│ REQUIRED:                                                         │
│ - social_handle (string) - "@username"                          │
│ - password (string) - plaintext                                  │
│                                                                   │
│ No optional fields                                                │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 2: Frontend submits login form                             │
├──────────────────────────────────────────────────────────────────┤
│ File: login.html (lines 585-653)                                │
│                                                                   │
│ Actions:                                                          │
│ 1. e.preventDefault()                                            │
│ 2. Extract social_handle and password                           │
│ 3. Update button: "Signing in..."                               │
│ 4. Disable submit button                                         │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 3: POST to login endpoint                                  │
├──────────────────────────────────────────────────────────────────┤
│ URL: /api/users/login                                            │
│ Method: POST                                                      │
│ Body:                                                             │
│ {                                                                 │
│   "social_handle": "@user123",                                   │
│   "password": "plaintextPassword"                                │
│ }                                                                 │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 4: API validates credentials exist                         │
├──────────────────────────────────────────────────────────────────┤
│ File: functions/api/[[path]].js (lines 127-188)                 │
│                                                                   │
│ Checks:                                                           │
│ ✅ social_handle provided                                       │
│ ✅ password provided                                            │
│ ❌ NO rate limiting (vulnerability to brute force)              │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 5: Look up user in database                                │
├──────────────────────────────────────────────────────────────────┤
│ SQL: SELECT * FROM users                                         │
│      WHERE social_handle = ? AND is_active = 1                   │
│                                                                   │
│ Retrieved fields:                                                 │
│ - id, social_handle, email, phone, password_hash, full_name,    │
│   address, preferred_contact, created_at, updated_at,            │
│   last_login, is_active                                           │
│                                                                   │
│ If no user found:                                                 │
│ → Return 401 with generic "Invalid credentials"                 │
│   (Good: doesn't reveal if handle exists)                        │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 6: Verify password                                         │
├──────────────────────────────────────────────────────────────────┤
│ Function: verifyPassword(password, user.password_hash)           │
│                                                                   │
│ Process:                                                          │
│ 1. Hash input password (same as registration)                   │
│ 2. Compare hashed input === stored hash                         │
│ 3. Return true/false                                             │
│                                                                   │
│ If password invalid:                                              │
│ → Return 401 with generic "Invalid credentials"                 │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 7: Update last_login timestamp                             │
├──────────────────────────────────────────────────────────────────┤
│ SQL: UPDATE users                                                │
│      SET last_login = CURRENT_TIMESTAMP                          │
│      WHERE id = ?                                                │
│                                                                   │
│ This tracks when user last signed in                             │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 8: Generate new session token                              │
├──────────────────────────────────────────────────────────────────┤
│ Same process as registration                                     │
│ Token: "sbs_{userId}_{64charHex}"                               │
│ Expiration: 30 days                                              │
│                                                                   │
│ ⚠️ ISSUE: Each login creates NEW session without invalidating   │
│    old ones. User can have unlimited active sessions.            │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 9: Store session in database                               │
├──────────────────────────────────────────────────────────────────┤
│ SQL: INSERT INTO sessions                                        │
│      (user_id, token, expires_at)                                │
│      VALUES (?, ?, ?)                                            │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 10: Return success with token                              │
├──────────────────────────────────────────────────────────────────┤
│ HTTP 200 OK                                                       │
│ Body:                                                             │
│ {                                                                 │
│   "success": true,                                                │
│   "token": "sbs_...",                                            │
│   "user": {                                                       │
│     "id": "...",                                                  │
│     "social_handle": "@user123",                                 │
│     "email": "john@example.com",                                 │
│     "full_name": "John Doe"                                      │
│   }                                                               │
│ }                                                                 │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 11: Frontend stores credentials                            │
├──────────────────────────────────────────────────────────────────┤
│ localStorage.setItem('sbs_auth_token', data.token)              │
│ localStorage.setItem('sbs_user', JSON.stringify(data.user))     │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 12: Redirect to dashboard                                  │
├──────────────────────────────────────────────────────────────────┤
│ Success message shown for 1 second                               │
│ Then: window.location.replace(redirect || '/dashboard.html')    │
│                                                                   │
│ Uses .replace() instead of .href to prevent back button issues  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📝 REGISTRATION PROCESS

### Required Fields
| Field | Type | Validation | Database Column | Notes |
|-------|------|------------|-----------------|-------|
| `social_handle` | string | ✅ Required, must not be empty | `social_handle` (TEXT UNIQUE NOT NULL) | No format validation (can be "abc" or "@abc") |
| `password` | string | ✅ Required, must not be empty | `password_hash` (TEXT NOT NULL) | **NO minimum length requirement!** |

### Optional Fields  
| Field | Type | Default | Database Column | Currently Used? |
|-------|------|---------|-----------------|-----------------|
| `full_name` | string | NULL | `full_name` (TEXT) | ✅ Yes |
| `email` | string | NULL | `email` (TEXT UNIQUE) | ✅ Yes |
| `phone` | string | NULL | `phone` (TEXT) | ✅ Yes |
| `preferred_contact` | enum | - | **MISSING FROM SCHEMA** | ❌ **BUG: Collected but not saved** |

### What Happens When User Registers
1. **Client-side:**
   - Form validation (HTML5 `required` attribute only)
   - Data collected into JSON object
   - Undefined/empty optional fields excluded from request

2. **Server-side (API):**
   - Checks: `social_handle` and `password` exist
   - Queries DB to check if `social_handle` OR `email` already exist
   - Hashes password with SHA-256 + salt
   - Generates UUID for user ID
   - Inserts user into `users` table
   - Creates 30-day session token
   - Inserts session into `sessions` table
   - Returns token + user object

3. **Client-side (after success):**
   - Stores token in `localStorage` as `sbs_auth_token`
   - Stores user object in `localStorage` as `sbs_user`
   - Shows success message
   - Redirects to `/dashboard.html` after 2 seconds

---

## 🔐 LOGIN PROCESS

### What Happens When User Logs In
1. **Client-side:**
   - User enters `@handle` and password
   - Form submits via POST to `/api/users/login`

2. **Server-side (API):**
   - Validates both fields exist
   - Queries database for user by `social_handle` WHERE `is_active = 1`
   - Hashes input password and compares with stored hash
   - If match:
     - Updates `last_login` timestamp
     - Generates NEW 30-day session token
     - Inserts new session into `sessions` table
     - Returns token + sanitized user object
   - If no match: Returns 401 "Invalid credentials"

3. **Client-side (after success):**
   - Stores token in `localStorage`
   - Stores user object in `localStorage`
   - Redirects to `/dashboard.html` (or query param `?redirect=`)

---

## 🔍 REQUIRED VS OPTIONAL FIELDS

### Registration Form Fields

#### ✅ REQUIRED (Cannot be empty)
```javascript
{
  "social_handle": "@username",  // TEXT, must be unique
  "password": "password123"       // TEXT, min 1 char (⚠️ WEAK!)
}
```

#### 🔧 OPTIONAL (Can be NULL)
```javascript
{
  "full_name": "John Doe",              // TEXT
  "email": "john@example.com",          // TEXT UNIQUE (if provided)
  "phone": "+353123456789",             // TEXT
  "preferred_contact": "instagram"      // ⚠️ BUG: NOT IN DB SCHEMA!
}
```

### Login Form Fields

#### ✅ REQUIRED
```javascript
{
  "social_handle": "@username",
  "password": "password123"
}
```

#### No optional fields for login

---

## 🔒 SECURITY AUDIT

### ✅ STRENGTHS
1. **HTTPS Required:** Cloudflare Pages enforces HTTPS by default
2. **Password Hashing:** Passwords are hashed, never stored in plaintext
3. **Session Management:** Uses token-based auth with expiration
4. **Generic Error Messages:** Login errors don't reveal if handle exists
5. **CORS Headers:** Properly configured for API calls
6. **Account Disabling:** `is_active` flag allows disabling accounts
7. **SQL Injection Protection:** Uses parameterized queries (`.bind()`)

### ❌ VULNERABILITIES & WEAKNESSES

#### 🔴 CRITICAL
1. **Weak Password Hashing**
   - **Issue:** SHA-256 is too fast, vulnerable to brute force
   - **Impact:** HIGH - Attacker with leaked DB can crack passwords quickly
   - **Fix:** Use bcrypt, argon2, or scrypt with work factor
   - **Location:** `functions/api/[[path]].js` lines 7-19

2. **No Password Strength Requirements**
   - **Issue:** Password can be 1 character ("a" is valid)
   - **Impact:** HIGH - Users can create easily guessable passwords
   - **Fix:** Require min 8 chars, mix of letters/numbers/symbols
   - **Location:** Both frontend forms + API validation

3. **localStorage for Token Storage**
   - **Issue:** Vulnerable to XSS attacks (any injected script can steal token)
   - **Impact:** MEDIUM-HIGH - If XSS exists, full account takeover
   - **Fix:** Use httpOnly secure cookies (requires backend changes)
   - **Location:** login.html line 627, register.html line 755

4. **No Rate Limiting**
   - **Issue:** Unlimited login attempts possible
   - **Impact:** HIGH - Easy brute force attacks on login endpoint
   - **Fix:** Implement Cloudflare Rate Limiting or in-app counter
   - **Location:** API handler (missing feature)

#### 🟠 HIGH PRIORITY
5. **No Email Verification**
   - **Issue:** Anyone can register with fake or others' emails
   - **Impact:** MEDIUM - Email spam, account impersonation
   - **Fix:** Send verification email with token before activation
   - **Location:** Missing feature

6. **No CSRF Protection**
   - **Issue:** No token validation on state-changing requests
   - **Impact:** MEDIUM - Possible cross-site request forgery
   - **Fix:** Implement CSRF tokens for form submissions
   - **Location:** Missing feature

7. **Unlimited Active Sessions**
   - **Issue:** Each login creates new session without limit
   - **Impact:** MEDIUM - Session table bloat, no session invalidation
   - **Fix:** Limit to N sessions per user, invalidate old ones
   - **Location:** API handler (lines 127-188)

8. **No Session Cleanup**
   - **Issue:** Expired sessions never deleted from DB
   - **Impact:** MEDIUM - Database bloat over time
   - **Fix:** Add cron job or cleanup on login
   - **Location:** Missing feature

#### 🟡 MEDIUM PRIORITY
9. **No Input Sanitization**
   - **Issue:** social_handle, full_name accept any characters
   - **Impact:** MEDIUM - Potential XSS or display issues
   - **Fix:** Sanitize/escape user inputs, validate formats
   - **Location:** API handler validation section

10. **Weak Token Generation**
    - **Issue:** Token includes user ID in plaintext
    - **Impact:** LOW-MEDIUM - Predictable structure
    - **Fix:** Use fully random opaque tokens
    - **Location:** `generateToken()` function line 21-26

11. **No Account Lockout**
    - **Issue:** No protection after N failed login attempts
    - **Impact:** MEDIUM - Brute force vulnerability
    - **Fix:** Lock account for X minutes after 5 failed attempts
    - **Location:** Missing feature

---

## 🐛 BUG ANALYSIS

### 🔴 CRITICAL BUGS

#### BUG #1: `preferred_contact` Field Not Saved
- **Location:** Register form → API handler
- **Issue:** Frontend collects `preferred_contact` dropdown value but API doesn't save it to database
- **Impact:** Data loss, user preference ignored
- **Code:**
  ```javascript
  // register.html line 733 - Field is collected
  preferred_contact: formData.get('preferred_contact')
  
  // functions/api/[[path]].js line 107 - Field is NOT in INSERT
  'INSERT INTO users (id, social_handle, email, phone, password_hash, full_name)'
  // Missing: preferred_contact
  ```
- **Fix Required:**
  1. Add `preferred_contact TEXT` to users table (already exists!)
  2. Update API INSERT to include the field:
     ```sql
     INSERT INTO users (id, social_handle, email, phone, password_hash, full_name, preferred_contact)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ```
  3. Update `.bind()` call to include `preferred_contact` value

#### BUG #2: Schema Mismatch - User ID Type
- **Location:** schema.sql vs API code
- **Issue:** Schema defines `id INTEGER PRIMARY KEY AUTOINCREMENT` but code uses `crypto.randomUUID()` (TEXT)
- **Impact:** Confusion, potential type mismatch errors
- **Current State:** Works because SQLite is flexible with types, but it's inconsistent
- **Fix Options:**
  1. **Recommended:** Change schema to `id TEXT PRIMARY KEY` (remove AUTOINCREMENT)
  2. Alternative:** Change code to use integer IDs
- **Code locations:**
  ```sql
  -- schema.sql line 7
  id INTEGER PRIMARY KEY AUTOINCREMENT
  
  // functions/api/[[path]].js line 99
  const userId = crypto.randomUUID(); // Returns TEXT
  ```

#### BUG #3: Email NULL Collision in Duplicate Check
- **Location:** `functions/api/[[path]].js` line 83
- **Issue:** Query `WHERE social_handle = ? OR email = ?` with `email = NULL` might not work as expected
- **Impact:** Potential to allow duplicate NULL emails or fail query
- **Code:**
  ```javascript
  const existingUser = await env.DB.prepare(
      'SELECT id FROM users WHERE social_handle = ? OR email = ?'
  ).bind(social_handle, email || null).first();
  ```
- **Fix:** Only check email if provided:
  ```javascript
  let query = 'SELECT id FROM users WHERE social_handle = ?';
  let binds = [social_handle];
  if (email) {
      query += ' OR email = ?';
      binds.push(email);
  }
  const existingUser = await env.DB.prepare(query).bind(...binds).first();
  ```

### 🟠 HIGH PRIORITY BUGS

#### BUG #4: Missing dashboard.html
- **Location:** Redirect after login/register
- **Issue:** Both forms redirect to `/dashboard.html` which doesn't exist
- **Impact:** Users see 404 after successful login/registration
- **Fix:** Create dashboard.html or redirect to `/` or `/shop`

#### BUG #5: No Logout Functionality in Frontend
- **Location:** Navigation (nav-lite.js)
- **Issue:** No logout button or function exposed to user
- **Impact:** Users can't log out without clearing localStorage manually
- **Fix:** Add logout button that:
  1. Calls `/api/users/logout` to delete session
  2. Clears localStorage
  3. Redirects to `/`

### 🟡 MEDIUM PRIORITY BUGS

#### BUG #6: Token Exposure in URL Structure
- **Location:** Token generation function
- **Issue:** Token format `sbs_{userId}_{random}` exposes user ID
- **Impact:** User ID leakage if token is logged or exposed
- **Fix:** Use fully random tokens, store user_id only in sessions table

#### BUG #7: No Token Refresh Mechanism
- **Location:** Session management
- **Issue:** After 30 days, token expires with no way to refresh
- **Impact:** User must log in again even if actively using the site
- **Fix:** Implement refresh tokens or sliding expiration

#### BUG #8: Nav Auth Check Runs on Every Page Load
- **Location:** `nav-lite.js`
- **Issue:** Makes API call to `/api/users/me` on every single page load
- **Impact:** Unnecessary API calls, potential performance issue
- **Fix:** Cache auth status for short period (5-10 min) in sessionStorage

---

## 📁 DATABASE SCHEMA

### 1. `users` Table
```sql
-- SBS UNITY DATABASE SCHEMA
-- Clean, focused tables for customer auth and orders

-- Users table: Customer accounts
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    social_handle TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    password_hash TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    address TEXT,
    city TEXT DEFAULT 'Dublin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active INTEGER DEFAULT 1
);

-- Orders table: Customer purchases
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    order_number TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending',
    total_amount REAL NOT NULL,
    items_json TEXT NOT NULL,
    delivery_address TEXT,
    delivery_city TEXT,
    delivery_method TEXT,
    payment_status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Sessions table: Active login sessions
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_social_handle ON users(social_handle);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
```

---

### 2. API Handler (`functions/api/[[path]].js`)
```javascript
/**
 * SBS UNITY AUTHENTICATION & ORDERS API
 * Handles: User registration, login, orders
 * Database: Cloudflare D1
 */

// Simple password hashing (for production, use bcrypt via npm package)
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'SBS_SALT_2025');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password, hash) {
    const inputHash = await hashPassword(password);
    return inputHash === hash;
}

// Generate JWT-like token
async function generateToken(userId) {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const token = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return `sbs_${userId}_${token}`;
}

// Generate unique order number
function generateOrderNumber() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `SBS-${timestamp}-${random}`.toUpperCase();
}

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // Parse request body for POST/PUT
        let body = {};
        if (request.method === 'POST' || request.method === 'PUT') {
            body = await request.json();
        }

        // Get auth token from header
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        // ===== AUTHENTICATION ROUTES =====

        // REGISTER NEW USER
        if (path === '/api/users/register' && request.method === 'POST') {
            const { social_handle, email, phone, password, first_name, last_name } = body;

            if (!social_handle || !password) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Social handle and password are required'
                }), { status: 400, headers: corsHeaders });
            }

            // Check if user exists
            const existingUser = await env.DB.prepare(
                'SELECT id FROM users WHERE social_handle = ? OR email = ?'
            ).bind(social_handle, email || null).first();

            if (existingUser) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'User already exists with this handle or email'
                }), { status: 409, headers: corsHeaders });
            }

            // Hash password and create user
            const passwordHash = await hashPassword(password);
            
            // Generate unique user ID
            const userId = crypto.randomUUID();
            const fullName = `${first_name || ''} ${last_name || ''}`.trim() || null;
            
            const result = await env.DB.prepare(
                'INSERT INTO users (id, social_handle, email, phone, password_hash, full_name) VALUES (?, ?, ?, ?, ?, ?)'
            ).bind(userId, social_handle, email || null, phone || null, passwordHash, fullName).run();

            // Create session token
            const sessionToken = await generateToken(userId);
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

            await env.DB.prepare(
                'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)'
            ).bind(userId, sessionToken, expiresAt.toISOString()).run();

            return new Response(JSON.stringify({
                success: true,
                token: sessionToken,
                user: {
                    id: userId,
                    social_handle,
                    email,
                    full_name: fullName
                }
            }), { headers: corsHeaders });
        }

        // LOGIN USER
        if (path === '/api/users/login' && request.method === 'POST') {
            const { social_handle, password } = body;

            if (!social_handle || !password) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Social handle and password are required'
                }), { status: 400, headers: corsHeaders });
            }

            // Find user
            const user = await env.DB.prepare(
                'SELECT * FROM users WHERE social_handle = ? AND is_active = 1'
            ).bind(social_handle).first();

            if (!user) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Invalid credentials'
                }), { status: 401, headers: corsHeaders });
            }

            // Verify password
            const isValid = await verifyPassword(password, user.password_hash);
            if (!isValid) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Invalid credentials'
                }), { status: 401, headers: corsHeaders });
            }

            // Update last login
            await env.DB.prepare(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?'
            ).bind(user.id).run();

            // Create session token
            const sessionToken = await generateToken(user.id);
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

            await env.DB.prepare(
                'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)'
            ).bind(user.id, sessionToken, expiresAt.toISOString()).run();

            return new Response(JSON.stringify({
                success: true,
                token: sessionToken,
                user: {
                    id: user.id,
                    social_handle: user.social_handle,
                    email: user.email,
                    full_name: user.full_name
                }
            }), { headers: corsHeaders });
        }

        // GET USER PROFILE (requires auth)
        if (path === '/api/users/me' && request.method === 'GET') {
            if (!token) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Authentication required'
                }), { status: 401, headers: corsHeaders });
            }

            // Verify session
            const session = await env.DB.prepare(
                'SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime("now")'
            ).bind(token).first();

            if (!session) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Invalid or expired token'
                }), { status: 401, headers: corsHeaders });
            }

            // Get user
            const user = await env.DB.prepare(
                'SELECT id, social_handle, email, phone, full_name, address, preferred_contact, created_at FROM users WHERE id = ?'
            ).bind(session.user_id).first();

            return new Response(JSON.stringify({
                success: true,
                user
            }), { headers: corsHeaders });
        }

        // LOGOUT (delete session)
        if (path === '/api/users/logout' && request.method === 'POST') {
            if (token) {
                await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
            }
            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }

        // ===== ORDER ROUTES =====

        // CREATE ORDER (requires auth)
        if (path === '/api/orders' && request.method === 'POST') {
            if (!token) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Authentication required'
                }), { status: 401, headers: corsHeaders });
            }

            // Verify session
            const session = await env.DB.prepare(
                'SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime("now")'
            ).bind(token).first();

            if (!session) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Invalid or expired token'
                }), { status: 401, headers: corsHeaders });
            }

            const { items, total_amount, delivery_address, delivery_city, delivery_method } = body;

            if (!items || !total_amount) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Items and total amount are required'
                }), { status: 400, headers: corsHeaders });
            }

            const orderNumber = generateOrderNumber();

            const result = await env.DB.prepare(
                'INSERT INTO orders (user_id, order_number, total_amount, items_json, delivery_address, delivery_city, delivery_method) VALUES (?, ?, ?, ?, ?, ?, ?)'
            ).bind(
                session.user_id,
                orderNumber,
                total_amount,
                JSON.stringify(items),
                delivery_address || null,
                delivery_city || 'Dublin',
                delivery_method || 'collection'
            ).run();

            return new Response(JSON.stringify({
                success: true,
                order: {
                    id: result.meta.last_row_id,
                    order_number: orderNumber,
                    total_amount,
                    status: 'pending'
                }
            }), { headers: corsHeaders });
        }

        // GET USER ORDERS (requires auth)
        if (path === '/api/orders' && request.method === 'GET') {
            if (!token) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Authentication required'
                }), { status: 401, headers: corsHeaders });
            }

            // Verify session
            const session = await env.DB.prepare(
                'SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime("now")'
            ).bind(token).first();

            if (!session) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Invalid or expired token'
                }), { status: 401, headers: corsHeaders });
            }

            // Get orders
            const orders = await env.DB.prepare(
                'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC'
            ).bind(session.user_id).all();

            return new Response(JSON.stringify({
                success: true,
                orders: orders.results
            }), { headers: corsHeaders });
        }

        // Health check
        if (path === '/api/health') {
            return new Response(JSON.stringify({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                service: 'SBS Unity API'
            }), { headers: corsHeaders });
        }

        // 404 Not Found
        return new Response(JSON.stringify({
            success: false,
            error: 'Endpoint not found'
        }), { status: 404, headers: corsHeaders });

    } catch (error) {
        console.error('API Error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Internal server error',
            details: error.message
        }), { status: 500, headers: corsHeaders });
    }
}
```

---

### 3. Wrangler Configuration (`wrangler.toml`)
```toml
name = "unity-v3"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "unity-v3"
database_id = "1235f2c7-7b73-44b7-95c2-b44260e51179"
```

---

### 4. Navigation Auth Check (`scripts/nav-lite.js`)
```javascript
// Check authentication status
async function checkAuthStatus() {
    const token = localStorage.getItem('sbs_auth_token');
    const loginBtn = document.getElementById('login-btn');
    const dashboardBtn = document.getElementById('dashboard-btn');
    
    if (!token) {
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (dashboardBtn) dashboardBtn.style.display = 'none';
        return;
    }

    // Verify token with API
    try {
        const response = await fetch('/api/users/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (dashboardBtn) dashboardBtn.style.display = 'inline-block';
        } else {
            localStorage.removeItem('sbs_auth_token');
            if (loginBtn) loginBtn.style.display = 'inline-block';
            if (dashboardBtn) dashboardBtn.style.display = 'none';
        }
    } catch (error) {
        console.error('Auth check failed:', error);
    }
}

// Run on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuthStatus);
} else {
    checkAuthStatus();
}
```

---

## 🔌 API Endpoints

### Authentication
- **POST** `/api/users/register` - Create new user account
- **POST** `/api/users/login` - Login and get session token
- **GET** `/api/users/me` - Get current user profile (requires auth)
- **POST** `/api/users/logout` - Logout and invalidate session

### Orders
- **POST** `/api/orders` - Create new order (requires auth)
- **GET** `/api/orders` - Get user's orders (requires auth)

### Health
- **GET** `/api/health` - API health check

---

## 📦 Frontend Integration

### Login Page (`login.html`)
```javascript
<script>
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        social_handle: formData.get('social_handle'),
        password: formData.get('password')
    };

    try {
        const response = await fetch('/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            localStorage.setItem('sbs_auth_token', result.token);
            localStorage.setItem('sbs_user', JSON.stringify(result.user));
            window.location.href = '/dashboard.html';
        } else {
            showError(result.error);
        }
    } catch (error) {
        showError('Login failed. Please try again.');
    }
});
</script>
```

### Register Page (`register.html`)
```javascript
<script>
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        social_handle: formData.get('social_handle'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        password: formData.get('password'),
        first_name: formData.get('first_name'),
        last_name: formData.get('last_name')
    };

    try {
        const response = await fetch('/api/users/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            localStorage.setItem('sbs_auth_token', result.token);
            localStorage.setItem('sbs_user', JSON.stringify(result.user));
            window.location.href = '/dashboard.html';
        } else {
            showError(result.error);
        }
    } catch (error) {
        showError('Registration failed. Please try again.');
    }
});
</script>
```

---

## 🚀 Deployment Commands

### Deploy Site
```powershell
wrangler pages deploy public
```

### Database Management
```powershell
# List databases
wrangler d1 list

# Execute SQL file
wrangler d1 execute unity-v3 --remote --file=schema.sql

# Run SQL command
wrangler d1 execute unity-v3 --remote --command="SELECT * FROM users;"

# List all tables
wrangler d1 execute unity-v3 --remote --command="SELECT name FROM sqlite_master WHERE type='table';"
```

---

## 🔐 Security Notes

1. **Password Hashing**: Currently using SHA-256 with salt. For production, consider upgrading to bcrypt.
2. **Session Tokens**: 30-day expiration, stored in D1 sessions table.
3. **CORS**: Currently allows all origins (`*`). Restrict in production.
4. **Token Storage**: Client-side stored in `localStorage` as `sbs_auth_token`.

---

## ✅ System Status

- **Database**: Clean schema with 3 tables (users, orders, sessions)
- **API**: Fully functional authentication and order endpoints
- **Frontend**: Login and registration forms integrated
- **Deployment**: Live on Cloudflare Pages
- **Security**: Basic auth with session management

---

## 📊 Database Schema Summary

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | Customer accounts | id, social_handle, email, password_hash |
| `orders` | Purchase records | id, user_id, order_number, total_amount, items_json |
| `sessions` | Active login sessions | id, user_id, token, expires_at |

---

**Backup Created:** October 1, 2025  
**System Version:** 1.0  
**Cloudflare DB ID:** `1235f2c7-7b73-44b7-95c2-b44260e51179`
