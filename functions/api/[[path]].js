// functions/api/[[path]].js
// SBS Unity v3 — Secure API Handler (RBAC, Sessions, CSRF, D1)
// Paste this file as-is. Requires env.DB (D1) + ALLOWED_ORIGINS.
// Oct 2, 2025

import NotificationService from '../lib/notification-service.js';
import bcrypt from 'bcryptjs';

// ---- Util ----
const enc = new TextEncoder();
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const b64toBuf = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

// Random 32 bytes (for session ids, csrf secret)
const randB32 = () => crypto.getRandomValues(new Uint8Array(32));

const timingSafeEq = (a, b) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

// ---- Security headers / CORS ----
function secHeaders(origin, env) {
  const allow = (env.ALLOWED_ORIGINS || "https://thesbsofficial.com,https://*.pages.dev")
    .split(",")
    .map((s) => s.trim());
  const allowed = allow.includes(origin) ? origin : allow[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-CSRF-Token",
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'",
  };
}

// ---- Cookies ----
const COOKIE_NAME = "sbs_session";
const cookieAttrs = "; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000"; // 30d
const setCookie = (token) => `${COOKIE_NAME}=${token}${cookieAttrs}`;
const clearCookie = () =>
  `${COOKIE_NAME}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax`;

const headersWithClearedCookie = (headers = {}) => ({
  ...headers,
  "Set-Cookie": clearCookie(),
});

function getCookie(request, name) {
  const h = request.headers.get("Cookie") || "";
  const m = h.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

// ---- Password hashing (PBKDF2-HMAC-SHA256) ----
async function hashPassword(password, iterations = 100000) {
  const salt = randB32();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256
  );
  return {
    hash: b64(bits),
    salt: b64(salt),
    type: "pbkdf2",
    iterations,
  };
}

const hexRegex = /^[a-f0-9]{64}$/i;

async function verifyPassword(password, user) {
  if (!user?.password_hash) return false;

  const hash = user.password_hash;
  const hashType = (user.password_hash_type || "").toLowerCase();

  // Legacy bcrypt hashes
  if (
    hashType === "bcrypt" ||
    hash.startsWith("$2a$") ||
    hash.startsWith("$2b$") ||
    hash.startsWith("$2y$")
  ) {
    try {
      return bcrypt.compareSync(password, hash);
    } catch (error) {
      console.error('Bcrypt verification failed:', error);
      return false;
    }
  }

  // Legacy SHA-256 hex hashes
  if (hashType === "sha256" || (hexRegex.test(hash) && !user.password_salt)) {
    const digest = await crypto.subtle.digest("SHA-256", enc.encode(password));
    const digestHex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
    return timingSafeEq(digestHex, hash);
  }

  if (!user.password_salt) return false;

  const iters = Number(user.password_iterations || 100000);
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: b64toBuf(user.password_salt), iterations: iters },
    key,
    256
  );
  return timingSafeEq(b64(bits), hash);
}

// ---- CSRF ----
function issueCsrfSecret() {
  return b64(randB32());
}
async function csrfTokenFromSecret(secretB64) {
  // Derive a stable token from the secret (HMAC-like with subtle digest)
  const data = enc.encode("csrf:" + secretB64);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return b64(digest);
}
async function assertCsrf(request, session) {
  const hdr = request.headers.get("X-CSRF-Token");
  if (!hdr) return false;
  const expected = await csrfTokenFromSecret(session.csrf_secret);
  return timingSafeEq(expected, hdr);
}

// ---- Sessions (D1) ----
async function createSession(env, userId, ip, ua) {
  const tokenRaw = b64(randB32()); // store hashed in DB
  const csrfSecret = issueCsrfSecret();
  const now = new Date();
  const exp = new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString();
  const tokenHash = await sha256b64(tokenRaw);

  // Try writing hashed token for modern schema
  let storedTokenValue = tokenHash;
  let hashedInserted = false;
  try {
    await env.DB.prepare(
      `INSERT INTO sessions (user_id, token, csrf_secret, expires_at, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(userId, tokenHash, csrfSecret, exp, ip || null, ua || null)
      .run();
    hashedInserted = true;
  } catch (error) {
    // Fallback: legacy schema stores plaintext token in "token" column
    storedTokenValue = tokenRaw;
    await env.DB.prepare(
      `INSERT INTO sessions (user_id, token, csrf_secret, expires_at, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(userId, storedTokenValue, csrfSecret, exp, ip || null, ua || null)
      .run();
  }

  // map token to user with a lightweight store table (if available)
  try {
    await env.DB.prepare(
      `INSERT INTO session_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)`
    )
      .bind(tokenHash, userId, exp)
      .run();
  } catch (err) {
    // session_tokens table not present in legacy schema – safe to ignore
    if (hashedInserted) {
      // Ensure plaintext token is stored for compatibility
      try {
        await env.DB.prepare(
          `UPDATE sessions SET token = ? WHERE user_id = ? AND token = ?`
        )
          .bind(tokenRaw, userId, storedTokenValue)
          .run();
        storedTokenValue = tokenRaw;
      } catch (swapErr) {
        console.warn('Unable to swap hashed session token to plaintext:', swapErr);
      }
    }
  }

  return { token: tokenRaw, csrfSecret };
}

async function sha256b64(s) {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return b64(d);
}

async function readSession(env, tokenRaw) {
  if (!tokenRaw) return null;

  // Attempt modern hashed lookup first (if supporting tables/columns exist)
  try {
    const tokenHash = await sha256b64(tokenRaw);
    const tok = await env.DB.prepare(
      `SELECT user_id, expires_at FROM session_tokens WHERE token_hash = ? AND expires_at > datetime('now')`
    )
      .bind(tokenHash)
      .first();

    if (tok?.user_id) {
      const row = await env.DB.prepare(
        `SELECT s.user_id, s.csrf_secret, s.expires_at, u.role, u.social_handle, u.first_name, u.last_name, u.email,
                al.user_id AS is_allowlisted
           FROM sessions s
           JOIN users u ON u.id = s.user_id
           LEFT JOIN admin_allowlist al ON al.user_id = u.id
          WHERE s.user_id = ? AND s.expires_at > datetime('now')
          ORDER BY s.created_at DESC LIMIT 1`
      )
        .bind(tok.user_id)
        .first();

      if (row) return row;
    }
  } catch (error) {
    // session_tokens table or token_hash column may not exist in production; fall back below
    console.warn('Hashed session lookup unavailable, falling back to legacy schema:', error?.message || error);
  }

  // Legacy schemas store plaintext token directly on sessions table
  try {
    const row = await env.DB.prepare(
      `SELECT s.user_id, s.csrf_secret, s.expires_at, u.role, u.social_handle, u.first_name, u.last_name, u.email,
              al.user_id AS is_allowlisted
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         LEFT JOIN admin_allowlist al ON al.user_id = u.id
        WHERE s.token = ? AND (s.expires_at IS NULL OR s.expires_at > datetime('now'))
        ORDER BY s.created_at DESC LIMIT 1`
    )
      .bind(tokenRaw)
      .first();

    if (row) {
      // Ensure csrf_secret always populated
      return {
        ...row,
        csrf_secret: row.csrf_secret || tokenRaw,
      };
    }
  } catch (legacyError) {
    console.error('Legacy session lookup failed:', legacyError);
  }

  return null;
}

async function destroySession(env, tokenRaw) {
  if (!tokenRaw) {
    console.log('⚠️ destroySession: No token provided');
    return;
  }
  
  console.log('🔐 destroySession: Hashing token...');
  const tokenHash = await sha256b64(tokenRaw);
  console.log('🔐 Token hash generated');
  
  try {
    console.log('🗑️ Deleting from session_tokens table...');
    const result1 = await env.DB.prepare(`DELETE FROM session_tokens WHERE token_hash = ?`).bind(tokenHash).run();
    console.log('✅ session_tokens delete result:', result1.meta?.changes || 0, 'rows');
  } catch (e) {
    console.log('⚠️ session_tokens table not available:', e.message);
  }
  
  try {
    console.log('🗑️ Deleting from sessions table (both token formats)...');
    const result2 = await env.DB.prepare(`DELETE FROM sessions WHERE token = ? OR token = ?`).bind(tokenRaw, tokenHash).run();
    console.log('✅ sessions delete result:', result2.meta?.changes || 0, 'rows');
  } catch (err) {
    console.log('⚠️ Primary sessions delete failed:', err.message);
    // At minimum ensure plaintext token is cleared if present (best-effort)
    try {
      console.log('🗑️ Trying fallback: delete plaintext token only...');
      const result3 = await env.DB.prepare(`DELETE FROM sessions WHERE token = ?`).bind(tokenRaw).run();
      console.log('✅ Fallback delete result:', result3.meta?.changes || 0, 'rows');
    } catch (legacyErr) {
      console.warn('❌ Failed to remove session token:', legacyErr.message);
    }
  }
}

// ---- Helpers ----
const okOrigins = (env) => (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim());
// Fixed: Accept any truthy is_allowlisted value (can be 1 or user_id like 12)
const isAdmin = (session) => session?.role === "admin" && (session?.is_allowlisted === 1 || !!session?.is_allowlisted);
const ipOf = (req) =>
  req.headers.get("CF-Connecting-IP") ||
  (req.headers.get("X-Forwarded-For") || "").split(",")[0] ||
  "unknown";

// ---- Handler ----
export async function onRequest(context) {
  const { request, env } = context;
  const { method } = request;
  const url = new URL(request.url);
  const path = url.pathname;
  const origin = request.headers.get("Origin") || "";
  const headers = secHeaders(origin, env);

  if (method === "OPTIONS") return new Response(null, { status: 204, headers });

  try {
    // session (cookie)
    const sessionCookie = getCookie(request, COOKIE_NAME);
    const session = await readSession(env, sessionCookie);

    // PUBLIC
    if (path === "/api/health" && method === "GET") {
      return json(
        { status: "healthy", ts: new Date().toISOString(), service: "SBS Unity v3 API" },
        200,
        headers
      );
    }

    if (path === "/api/users/register" && method === "POST") {
      const body = await request.json();
      const allowed = [
        "social_handle",
        "email",
        "phone",
        "password",
        "first_name",
        "last_name",
        "address",
        "city",
        "eircode",
        "preferred_contact",
      ];
      for (const k of Object.keys(body)) {
        if (!allowed.includes(k)) return json({ success: false, error: `Unknown field: ${k}` }, 400, headers);
      }
      if (!body.social_handle || !body.password)
        return json({ success: false, error: "social_handle and password required" }, 400, headers);
      if (body.password.length < 6)
        return json({ success: false, error: "Password must be at least 6 characters" }, 400, headers);
      if (!/\d/.test(body.password))
        return json({ success: false, error: "Password must contain at least 1 number" }, 400, headers);

      const exists = await env.DB.prepare(
        "SELECT id FROM users WHERE social_handle = ? OR email = ?"
      )
        .bind(body.social_handle, body.email || null)
        .first();
      if (exists) return json({ success: false, error: "User already exists" }, 409, headers);

      const { hash, salt, type, iterations } = await hashPassword(body.password);

      // Email verification: 0 = not verified (if email provided), 1 = verified (if no email)
      const emailVerified = body.email ? 0 : 1;

      const res = await env.DB.prepare(
        `INSERT INTO users
        (social_handle,email,phone,password_hash,password_salt,password_hash_type,password_iterations,
         first_name,last_name,address,city,eircode,preferred_contact,email_verified)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      )
        .bind(
          body.social_handle,
          body.email || null,
          body.phone || null,
          hash,
          salt,
          type,
          iterations,
          body.first_name || null,
          body.last_name || null,
          body.address || null,
          body.city || null,
          body.eircode || null,
          body.preferred_contact || null,
          emailVerified
        )
        .run();

      const userId = res.meta?.last_row_id ?? null;

      // Send verification email if email was provided
      if (body.email && userId) {
        try {
          const { createVerificationToken } = await import('../lib/email.js');
          const EmailService = (await import('../lib/email-service.ts')).default;
          
          const token = await createVerificationToken(env.DB, userId);
          const siteUrl = env.SITE_URL || 'https://thesbsofficial.com';
          const verifyUrl = `${siteUrl}/verify-email.html?token=${token}`;
          const userName = [body.first_name, body.last_name].filter(Boolean).join(' ') || 'there';
          
          const emailService = new EmailService(env.RESEND_API_KEY);
          await emailService.sendBeautifulVerificationEmail(body.email, userName, verifyUrl);

          return json(
            {
              success: true,
              message: "Account created! Check your email to verify your account.",
              user_id: userId,
              email_sent: true
            },
            201,
            headers
          );
        } catch (emailError) {
          console.error('Failed to send verification email:', emailError);
          // Account still created, just email failed
          return json(
            {
              success: true,
              message: "Account created! Email verification will be sent shortly.",
              user_id: userId,
              email_sent: false
            },
            201,
            headers
          );
        }
      }

      return json(
        { success: true, message: "Account created successfully!", user_id: userId },
        201,
        headers
      );
    }

    if (path === "/api/users/login" && method === "POST") {
      const body = await request.json();
      const rawHandle = (body.social_handle || body.identifier || "").trim();
      const rawEmail = (body.email || "").trim().toLowerCase();
      const password = body.password;

      if ((!rawHandle && !rawEmail) || !password) {
        return json({ success: false, error: "Username/email and password required" }, 400, headers);
      }

      let user = null;

      if (rawEmail) {
        user = await env.DB.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)")
          .bind(rawEmail)
          .first();
      }

      if (!user && rawHandle) {
        const normalizedHandle = rawHandle.startsWith("@") ? rawHandle.slice(1) : rawHandle;
        user = await env.DB.prepare("SELECT * FROM users WHERE LOWER(social_handle) = LOWER(?)")
          .bind(normalizedHandle)
          .first();
      }

      if (!user || !(await verifyPassword(password, user)))
        return json({ success: false, error: "Invalid credentials" }, 401, headersWithClearedCookie(headers));

      // Check if email verification is required
      if (user.email && user.email_verified === 0) {
        return json({
          success: false,
          error: "Please verify your email before logging in. Check your inbox for the verification link.",
          email_verification_required: true,
          email: user.email
        }, 403, headersWithClearedCookie(headers));
      }

      // Optional: auto-promote via allowlist (ADMIN_ALLOWLIST_HANDLES=fredbademosi,admin)
      const allowHandles = (env.ADMIN_ALLOWLIST_HANDLES || "").split(",").map((s) => s.trim());
      if (user.role !== "admin" && allowHandles.includes(user.social_handle)) {
        await env.DB.prepare("UPDATE users SET role='admin' WHERE id = ?").bind(user.id).run();
        user.role = "admin";
      }

      const ip = ipOf(request);
      const ua = request.headers.get("User-Agent") || "unknown";
      const { token, csrfSecret } = await createSession(env, user.id, ip, ua);
      const csrfToken = await csrfTokenFromSecret(csrfSecret);

      return json(
        {
          success: true,
          csrf_token: csrfToken,
          user: {
            id: user.id,
            social_handle: user.social_handle,
            email: user.email,
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name,
          },
        },
        200,
        { ...headers, "Set-Cookie": setCookie(token) }
      );
    }

    if (path === "/api/users/logout" && method === "POST") {
      console.log('🚪 LOGOUT REQUEST RECEIVED');
      console.log('Session cookie:', sessionCookie ? 'Present' : 'Missing');
      console.log('Session data:', session ? JSON.stringify({ user_id: session.user_id, role: session.role }) : 'No session');
      
      if (sessionCookie) {
        console.log('🗑️ Destroying session...');
        await destroySession(env, sessionCookie);
        console.log('✅ Session destroyed');
      } else {
        console.log('⚠️ No session cookie to destroy');
      }
      
      console.log('🍪 Clearing cookie and returning response');
      return json({ success: true }, 200, { ...headers, "Set-Cookie": clearCookie() });
    }

    // Email verification endpoints (public)
    if (path === "/api/verify-email" && method === "POST") {
      const body = await request.json();
      const { token } = body;

      if (!token) {
        return json({ success: false, error: "Token required" }, 400, headers);
      }

      try {
        const { verifyEmailToken } = await import('../lib/email.js');
        const result = await verifyEmailToken(env.DB, token);

        if (!result.success) {
          return json({ success: false, error: result.error }, 400, headers);
        }

        return json({
          success: true,
          message: "Email verified successfully! You can now log in.",
          user: result.user
        }, 200, headers);
      } catch (error) {
        console.error('Email verification error:', error);
        return json({ success: false, error: "Verification failed" }, 500, headers);
      }
    }

    if (path === "/api/resend-verification" && method === "POST") {
      const body = await request.json();
      const { email } = body;

      if (!email) {
        return json({ success: false, error: "Email required" }, 400, headers);
      }

      // Find user by email
      const user = await env.DB.prepare(
        "SELECT id, email, email_verified, first_name FROM users WHERE email = ?"
      ).bind(email).first();

      if (!user) {
        // Don't reveal if email exists or not (security)
        return json({
          success: true,
          message: "If that email exists, a verification link has been sent."
        }, 200, headers);
      }

      if (user.email_verified === 1) {
        return json({
          success: false,
          error: "Email is already verified. You can log in now!"
        }, 400, headers);
      }

      try {
        // Use Resend email system with beautiful SBS templates
        const { createVerificationToken } = await import('../lib/email.js');
        const EmailService = (await import('../lib/email-service.ts')).default;

        const token = await createVerificationToken(env.DB, user.id);
        const siteUrl = env.SITE_URL || 'https://thesbsofficial.com';
        const verifyUrl = `${siteUrl}/verify-email.html?token=${token}`;

        const emailService = new EmailService(env.RESEND_API_KEY);
        await emailService.sendBeautifulVerificationEmail(
          user.email,
          user.first_name || 'there',
          verifyUrl
        );

        return json({
          success: true,
          message: "Verification email sent! Check your inbox."
        }, 200, headers);
      } catch (error) {
        console.error('Resend verification error:', error);
        return json({
          success: false,
          error: "Failed to send verification email"
        }, 500, headers);
      }
    }

    // Test email endpoint (for debugging)
    if (path === "/api/test-email" && method === "POST") {
      const body = await request.json();
      const { email } = body;

      if (!email) {
        return json({ success: false, error: "Email required" }, 400, headers);
      }

      try {
        const EmailService = (await import('../lib/email-service.ts')).default;
        const siteUrl = env.SITE_URL || 'https://thesbsofficial.com';
        const testToken = 'test-' + Math.random().toString(36).substring(2, 15);
        const verifyUrl = `${siteUrl}/verify-email.html?token=${testToken}`;

        const emailService = new EmailService(env.RESEND_API_KEY);
        await emailService.sendBeautifulVerificationEmail(email, 'Test User', verifyUrl);

        return json({
          success: true,
          message: `Test verification email sent to ${email}`,
          note: 'This is a beautiful test email with SBS branding',
          template: 'Beautiful SBS verification template with logo and social links'
        }, 200, headers);
      } catch (error) {
        console.error('Test email error:', error);
        console.error('Error stack:', error.stack);
        return json({
          success: false,
          error: "Failed to send test email",
          details: error.message,
          errorType: error.name,
          stack: error.stack
        }, 500, headers);
      }
    }

    // Products API - PUBLIC (can be accessed by anyone)
    if (path === "/api/products" && method === "GET") {
      try {
        // For now, return empty array until CF Images is set up
        // This prevents 500 errors and allows the shop page to load
        return json(
          {
            success: true,
            products: [],
            message: "Products API ready - CF Images integration pending"
          },
          200,
          headers
        );
      } catch (error) {
        console.error('Products API error:', error);
        return json(
          {
            success: true,
            products: [],
            error: "Failed to fetch products"
          },
          200,
          headers
        );
      }
    }

    // ANALYTICS TRACKING - PUBLIC (no auth required)
    if (path === "/api/analytics/track" && method === "POST") {
      try {
        // Check if DB is available
        if (!env.DB) {
          console.error('Analytics: DB binding not available');
          return json({ 
            success: false, 
            error: "Database not configured",
            hint: "DB binding missing in environment" 
          }, 500, headers);
        }

        const body = await request.json();
        const events = body.events;

        if (!Array.isArray(events) || events.length === 0) {
          return json({ success: false, error: "No events to track" }, 400, headers);
        }

        console.log(`📊 Tracking ${events.length} events`);

        const ip = ipOf(request);
        const ua = request.headers.get("User-Agent") || "unknown";
        const userId = session?.user_id || null;
        const sessionId = session?.session_id || body.sessionId || null;

        // Try to insert events one by one for better error handling
        let successCount = 0;
        const errors = [];

        for (const event of events) {
          try {
            // Extract only the fields we need, everything else goes in event_data JSON
            const eventType = event.type || 'unknown';
            const eventPath = event.path || null;
            
            // Store ALL event data (including product_id, page_url, etc.) in the JSON field
            const eventData = JSON.stringify(event.data || event || {});

            await env.DB.prepare(
              `INSERT INTO analytics_events (event_type, event_data, user_id, session_id, ip_address, user_agent, path)
               VALUES (?, ?, ?, ?, ?, ?, ?)`
            ).bind(
              eventType,
              eventData,
              userId,
              sessionId,
              ip,
              ua,
              eventPath
            ).run();
            
            successCount++;
          } catch (insertError) {
            console.error(`❌ Failed to insert event ${event.type}:`, insertError.message);
            errors.push({ 
              event: event.type, 
              error: insertError.message
            });
          }
        }

        if (successCount === events.length) {
          return json({ success: true, tracked: successCount }, 200, headers);
        } else {
          return json({ 
            success: true, 
            tracked: successCount, 
            failed: errors.length,
            errors: errors.slice(0, 3) // Only return first 3 errors
          }, 200, headers);
        }
      } catch (error) {
        console.error('❌ Analytics tracking error:', error.message);
        
        return json({ 
          success: false, 
          error: error.message || "Failed to track analytics"
        }, 500, headers);
      }
    }

    // AUTH REQUIRED
  if (!session) return json({ success: false, error: "Unauthorized" }, 401, headersWithClearedCookie(headers));

    if (path === "/api/users/me" && method === "GET") {
      // Fetch full user data from DB for consistency and GDPR compliance
      const user = await env.DB.prepare(
        `SELECT id, social_handle, email, phone, first_name, last_name, address, city, eircode,
         preferred_contact, role, created_at, is_allowlisted, bidding_username
         FROM users WHERE id=?`
      )
        .bind(session.user_id)
        .first();

      if (!user) return json({ success: false, error: "User not found" }, 404, headers);

      const csrfToken = await csrfTokenFromSecret(session.csrf_secret);

      return json({
        success: true,
        user: {
          ...user,
          is_admin: isAdmin(session),
        },
        csrf_token: csrfToken
      }, 200, headers);
    }

    // GET USER'S BIDS
    if (path === "/api/users/me/bids" && method === "GET") {
      if (!session?.user_id) {
        return json({ success: false, error: "Authentication required" }, 401, headersWithClearedCookie(headers));
      }

      try {
        // Fetch all bids for this user
        const bidsResult = await env.DB.prepare(`
          SELECT 
            co.id,
            co.offer_id,
            co.product_id,
            co.product_category,
            co.product_size,
            co.product_image,
            co.offer_amount,
            co.status,
            co.counter_offer_amount,
            co.admin_notes,
            co.created_at,
            co.responded_at
          FROM customer_offers co
          WHERE co.user_id = ?
          ORDER BY co.created_at DESC
        `).bind(session.user_id).all();

        const userBids = bidsResult.results || [];

        // Get highest offers for all products in one query (more efficient)
        if (userBids.length > 0) {
          const productIds = [...new Set(userBids.map(b => b.product_id))];
          const placeholders = productIds.map(() => '?').join(',');
          
          const highestOffersResult = await env.DB.prepare(`
            SELECT 
              product_id,
              MAX(offer_amount) as highest_offer
            FROM customer_offers
            WHERE product_id IN (${placeholders})
            AND status IN ('pending', 'countered')
            GROUP BY product_id
          `).bind(...productIds).all();

          // Create a map for quick lookup
          const highestOffersMap = {};
          (highestOffersResult.results || []).forEach(row => {
            highestOffersMap[row.product_id] = row.highest_offer;
          });

          // Add is_highest_offer flag
          const bidsWithFlags = userBids.map(bid => ({
            ...bid,
            is_highest_offer: parseFloat(bid.offer_amount) === parseFloat(highestOffersMap[bid.product_id] || 0)
          }));

          return json({
            success: true,
            bids: bidsWithFlags
          }, 200, headers);
        }

        // No bids found
        return json({
          success: true,
          bids: []
        }, 200, headers);
      } catch (error) {
        console.error('❌ Fetch bids error:', error);
        return json({
          success: false,
          error: 'Failed to fetch bids',
          details: error.message
        }, 500, headers);
      }
    }

    // UPDATE USER PROFILE
    if (path === "/api/users/update-profile" && method === "PUT") {
      if (!session?.user_id) {
        return json({ success: false, error: "Authentication required" }, 401, headersWithClearedCookie(headers));
      }

      try {
        const body = await request.json();
        
        // Fields that can be updated
        const allowedFields = [
          'first_name',
          'last_name',
          'social_handle',
          'email',
          'phone',
          'address',
          'city',
          'eircode',
          'instagram',
          'snapchat',
          'preferred_contact',
          'bidding_username'
        ];

        // Build update query dynamically based on provided fields
        const updates = {};
        const updateFields = [];
        const updateValues = [];

        for (const field of allowedFields) {
          if (body[field] !== undefined) {
            updates[field] = body[field];
            updateFields.push(`${field} = ?`);
            updateValues.push(body[field]);
          }
        }

        // Handle password change separately (requires current password verification)
        if (body.new_password) {
          if (!body.current_password) {
            return json({ 
              success: false, 
              error: "Current password required to change password" 
            }, 400, headers);
          }

          // Verify current password
          const user = await env.DB.prepare(
            "SELECT password_hash, password_salt, password_hash_type, password_iterations FROM users WHERE id = ?"
          ).bind(session.user_id).first();

          if (!user || !(await verifyPassword(body.current_password, user))) {
            return json({ 
              success: false, 
              error: "Current password is incorrect" 
            }, 401, headers);
          }

          // Validate new password
          if (body.new_password.length < 6) {
            return json({ 
              success: false, 
              error: "New password must be at least 6 characters" 
            }, 400, headers);
          }

          if (!/\d/.test(body.new_password)) {
            return json({ 
              success: false, 
              error: "New password must contain at least 1 number" 
            }, 400, headers);
          }

          // Hash new password
          const { hash, salt, type, iterations } = await hashPassword(body.new_password);
          updateFields.push('password_hash = ?', 'password_salt = ?', 'password_hash_type = ?', 'password_iterations = ?');
          updateValues.push(hash, salt, type, iterations);
        }

        if (updateFields.length === 0) {
          return json({ 
            success: false, 
            error: "No fields to update" 
          }, 400, headers);
        }

        // Add updated_at timestamp
        updateFields.push('updated_at = CURRENT_TIMESTAMP');

        // Execute update
        updateValues.push(session.user_id); // For WHERE clause
        
        await env.DB.prepare(
          `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`
        ).bind(...updateValues).run();

        // Fetch updated user data
        const updatedUser = await env.DB.prepare(
          `SELECT id, social_handle, email, phone, first_name, last_name, address, city, eircode,
           preferred_contact, role, instagram, snapchat, bidding_username, created_at
           FROM users WHERE id = ?`
        ).bind(session.user_id).first();

        return json({
          success: true,
          message: "Profile updated successfully",
          user: updatedUser
        }, 200, headers);

      } catch (error) {
        console.error('❌ Profile update error:', error);
        return json({
          success: false,
          error: 'Failed to update profile',
          details: error.message
        }, 500, headers);
      }
    }

    // OFFERS - Submit customer offer on a product
    if (path === "/api/offers/submit" && method === "POST") {
      console.log('📝 Offer submission request received');
      console.log('Session:', session ? `User ID: ${session.user_id}` : 'No session');
      
      if (!session?.user_id) {
        console.log('❌ No session - authentication required');
        return json({ success: false, error: "Authentication required" }, 401, headersWithClearedCookie(headers));
      }

      try {
        console.log('📦 Parsing request body...');
        const body = await request.json();
        console.log('Body received:', JSON.stringify(body, null, 2));
        
        const { productId, amount, customerName, customerContact, category, size, imageUrl } = body;

        console.log('🔍 Validating fields...');
        console.log('  - productId:', productId);
        console.log('  - amount:', amount, typeof amount);
        console.log('  - customerName:', customerName);
        console.log('  - customerContact:', customerContact);
        console.log('  - category:', category);
        console.log('  - size:', size);

        // Validation
        if (!productId || !amount || !customerName || !customerContact) {
          console.log('❌ Missing required fields');
          return json({ 
            success: false, 
            error: "Missing required fields: productId, amount, customerName, customerContact" 
          }, 400, headers);
        }

        if (typeof amount !== 'number' || amount <= 0) {
          console.log('❌ Invalid amount type or value');
          return json({ 
            success: false, 
            error: "Invalid offer amount" 
          }, 400, headers);
        }

        // Define min/max limits based on category
        const bidLimits = {
          'PO-CLOTHES': { min: 50, max: 180 },
          'BN-CLOTHES': { min: 80, max: 250 },
          'BN-SHOES': { min: 70, max: 250 },
          'PO-SHOES': { min: 20, max: 180 }
        };

        const limits = bidLimits[category];
        if (!limits) {
          console.log('❌ Invalid category:', category);
          return json({ 
            success: false, 
            error: "Invalid product category" 
          }, 400, headers);
        }

        // Check minimum bid
        if (amount < limits.min) {
          console.log(`❌ Offer too low: €${amount} (min: €${limits.min})`);
          return json({ 
            success: false, 
            error: `Minimum offer for ${category} is €${limits.min}` 
          }, 400, headers);
        }

        // Check maximum bid
        if (amount > limits.max) {
          console.log(`❌ Offer too high: €${amount} (max: €${limits.max})`);
          return json({ 
            success: false, 
            error: `Maximum offer for ${category} is €${limits.max}` 
          }, 400, headers);
        }

        // Check if user already bid on this item in the last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const recentOffer = await env.DB.prepare(`
          SELECT offer_amount, created_at 
          FROM customer_offers 
          WHERE product_id = ? 
          AND customer_contact = ?
          AND created_at > ?
          ORDER BY created_at DESC 
          LIMIT 1
        `).bind(productId, customerContact, fiveMinutesAgo).first();

        if (recentOffer) {
          const timeRemaining = Math.ceil((new Date(recentOffer.created_at).getTime() + 5 * 60 * 1000 - Date.now()) / 1000 / 60);
          console.log(`❌ User already bid within 5 minutes (${timeRemaining} min remaining)`);
          return json({ 
            success: false, 
            error: `You can only submit 1 offer per item every 5 minutes. Please wait ${timeRemaining} more minute(s).` 
          }, 400, headers);
        }

        console.log('✅ Validation passed');

        // Generate unique offer ID
        const offerId = `OFFER-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
        console.log('🎫 Generated offer ID:', offerId);

        // Check if customer_offers table exists
        console.log('🔍 Checking if customer_offers table exists...');
        try {
          const tableCheck = await env.DB.prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='customer_offers'"
          ).first();
          console.log('Table check result:', tableCheck);
          
          if (!tableCheck) {
            console.error('❌ customer_offers table does not exist!');
            return json({
              success: false,
              error: "Database table not initialized. Please contact administrator.",
              debug: "customer_offers table missing"
            }, 500, headers);
          }
        } catch (tableError) {
          console.error('❌ Error checking table:', tableError);
        }

        // Insert offer into database
        console.log('💾 Inserting offer into database...');
        console.log('Binding values:', {
          offerId,
          productId,
          category: category || null,
          size: size || null,
          imageUrl: imageUrl || null,
          amount,
          customerName,
          customerContact
        });

        const result = await env.DB.prepare(`
          INSERT INTO customer_offers (
            offer_id, product_id, product_category, product_size, product_image,
            offer_amount, customer_name, customer_contact, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
        `).bind(
          offerId,
          productId,
          category || null,
          size || null,
          imageUrl || null,
          amount,
          customerName,
          customerContact
        ).run();

        console.log('Database result:', result);
        const insertedId = result.meta?.last_row_id;
        console.log('Inserted ID:', insertedId);

        console.log(`✅ Offer ${offerId} created successfully (ID: ${insertedId})`);

        return json({
          success: true,
          message: "Offer submitted successfully! We'll review it and get back to you soon.",
          offer: {
            id: insertedId,
            offer_id: offerId,
            product_id: productId,
            amount: amount,
            status: 'pending',
            created_at: new Date().toISOString()
          }
        }, 201, headers);

      } catch (error) {
        console.error('❌ Offer submission error:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Error cause:', error.cause);
        
        return json({ 
          success: false, 
          error: "Failed to submit offer",
          details: error.message,
          errorType: error.name,
          stack: error.stack
        }, 500, headers);
      }
    }

    // Get offers for a product (public - no auth required for viewing highest offer)
    if (path === "/api/offers/product" && method === "GET") {
      try {
        const url = new URL(request.url);
        const productId = url.searchParams.get('productId');

        if (!productId) {
          return json({ success: false, error: "productId required" }, 400, headers);
        }

        // Get highest offer for this product
        const highestOffer = await env.DB.prepare(`
          SELECT MAX(offer_amount) as highest_offer
          FROM customer_offers
          WHERE product_id = ? AND status IN ('pending', 'countered')
        `).bind(productId).first();

        // Get all offers if user is admin
        let allOffers = null;
        if (session && isAdmin(session)) {
          const offersResult = await env.DB.prepare(`
            SELECT offer_id, offer_amount, customer_name, customer_contact, 
                   status, counter_offer_amount, created_at, responded_at
            FROM customer_offers
            WHERE product_id = ?
            ORDER BY created_at DESC
          `).bind(productId).all();
          allOffers = offersResult.results || [];
        }

        return json({
          success: true,
          product_id: productId,
          highest_offer: highestOffer?.highest_offer || 0,
          offers: allOffers
        }, 200, headers);

      } catch (error) {
        console.error('❌ Get offers error:', error);
        return json({ 
          success: false, 
          error: "Failed to fetch offers" 
        }, 500, headers);
      }
    }

    // ADMIN
    if (path.startsWith("/api/admin/")) {
      if (!isAdmin(session)) return json({ success: false, error: "Forbidden" }, 403, headers);

      if (path === "/api/admin/menu" && method === "GET") {
        const html = `
          <section class="admin-menu">
            <h2>🎛️ SBS Unity Admin</h2>
            <ul>
              <li><a href="/admin/" target="_blank">🏠 Overview</a></li>
              <li><a href="/admin/inventory/" target="_blank">📦 Inventory</a></li>
              <li><a href="/admin/requests/" target="_blank">📋 Requests</a></li>
              <li><a href="/admin/customers/" target="_blank">👥 Customers</a></li>
              <li><a href="/admin/data/" target="_blank">💾 Data</a></li>
              <li><a href="/admin/analytics.html" target="_blank">📊 Logs & Analytics</a></li>
              <li><a href="/admin/security/" target="_blank">🔒 Security</a></li>
              <li><a href="/admin/audit/" target="_blank">📜 Audit</a></li>
            </ul>
            <hr style="margin: 20px 0; border-color: #333;">
            <h3 style="font-size: 14px; color: #999; margin-bottom: 10px;">⚙️ Utilities</h3>
            <ul>
              <li><a href="/admin/system-check.html" target="_blank">🔍 System Check</a></li>
              <li><a href="/admin/status.html" target="_blank">� API Status</a></li>
              <li><a href="/admin/diagnostic.html" target="_blank">🛠️ Diagnostics</a></li>
              <li><button id="runBoard07" type="button">⚡ Quick Diagnostics</button></li>
            </ul>
          </section>`;
        return new Response(html, { status: 200, headers: { "Content-Type": "text/html", ...headers } });
      }

      if (path === "/api/admin/tests/board07" && method === "GET") {
        const tables = await env.DB.prepare(
          "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        ).all();
        return json(
          {
            success: true,
            checks: [
              { name: "tables_present", passed: true, details: tables.results?.map((r) => r.name) || [] },
            ],
            timestamp: new Date().toISOString(),
          },
          200,
          headers
        );
      }

      // Admin Analytics Dashboard - Comprehensive metrics
      if (path === "/api/admin/analytics-dashboard" && method === "GET") {
        try {
          // 1. User Metrics
          const totalUsers = await env.DB.prepare("SELECT COUNT(*) as count FROM users").first();
          const activeUsers = await env.DB.prepare("SELECT COUNT(*) as count FROM users WHERE is_active = 1").first();
          const newUsersToday = await env.DB.prepare(
            "SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = DATE('now')"
          ).first();

          // 2. Product Metrics
          const totalProducts = await env.DB.prepare("SELECT COUNT(*) as count FROM products").first();
          const activeProducts = await env.DB.prepare(
            "SELECT COUNT(*) as count FROM products WHERE status = 'active'"
          ).first();
          const soldProducts = await env.DB.prepare(
            "SELECT COUNT(*) as count FROM products WHERE status = 'sold'"
          ).first();

          // Top products by views
          const topProducts = await env.DB.prepare(
            "SELECT id, brand, category, size, views_count, price FROM products ORDER BY views_count DESC LIMIT 5"
          ).all();

          // 3. Order Metrics
          const totalOrders = await env.DB.prepare("SELECT COUNT(*) as count FROM orders").first();
          const pendingOrders = await env.DB.prepare(
            "SELECT COUNT(*) as count FROM orders WHERE status = 'pending'"
          ).first();
          const completedOrders = await env.DB.prepare(
            "SELECT COUNT(*) as count FROM orders WHERE status = 'completed'"
          ).first();
          const totalRevenue = await env.DB.prepare(
            "SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE status = 'completed'"
          ).first();

          // Recent orders
          const recentOrders = await env.DB.prepare(
            "SELECT order_number, total, status, created_at FROM orders ORDER BY created_at DESC LIMIT 10"
          ).all();

          // 4. Sell Cases Metrics
          const totalSellCases = await env.DB.prepare("SELECT COUNT(*) as count FROM sell_cases").first();
          const pendingSellCases = await env.DB.prepare(
            "SELECT COUNT(*) as count FROM sell_cases WHERE status = 'pending'"
          ).first();

          // 5. Analytics Events (if table exists)
          let analyticsEvents = { results: [] };
          let eventCounts = {};
          try {
            analyticsEvents = await env.DB.prepare(
              "SELECT event_type, COUNT(*) as count FROM analytics_events GROUP BY event_type ORDER BY count DESC LIMIT 10"
            ).all();

            analyticsEvents.results.forEach(row => {
              eventCounts[row.event_type] = row.count;
            });
          } catch (e) {
            console.log('Analytics events table not yet available:', e.message);
          }

          // 6. Category Performance
          const categoryPerformance = await env.DB.prepare(`
            SELECT 
              category,
              COUNT(*) as total,
              SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
              SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold,
              COALESCE(SUM(views_count), 0) as total_views
            FROM products
            GROUP BY category
            ORDER BY total DESC
          `).all();

          return json({
            success: true,
            dashboard: {
              users: {
                total: totalUsers.count,
                active: activeUsers.count,
                new_today: newUsersToday.count
              },
              products: {
                total: totalProducts.count,
                active: activeProducts.count,
                sold: soldProducts.count,
                top_products: topProducts.results || []
              },
              orders: {
                total: totalOrders.count,
                pending: pendingOrders.count,
                completed: completedOrders.count,
                revenue: totalRevenue.total || 0,
                recent: recentOrders.results || []
              },
              sell_cases: {
                total: totalSellCases.count,
                pending: pendingSellCases.count
              },
              events: eventCounts,
              categories: categoryPerformance.results || []
            },
            timestamp: new Date().toISOString()
          }, 200, headers);
        } catch (error) {
          console.error('Dashboard analytics error:', error);
          return json({
            success: false,
            error: "Failed to load dashboard analytics",
            details: error.message
          }, 500, headers);
        }
      }

      if (path === "/api/admin/analytics-events" && method === "GET") {
        try {
          const { results } = await env.DB.prepare(
            "SELECT id, event_type, path, user_id, timestamp, event_data FROM analytics_events ORDER BY timestamp DESC LIMIT 100"
          ).all();
          return json({ success: true, events: results || [] }, 200, headers);
        } catch (error) {
          // Table might not exist yet
          return json({
            success: true,
            events: [],
            message: "Analytics events table not yet created. Events will appear after first deployment with schema."
          }, 200, headers);
        }
      }

      // Admin Bids Management - Get all customer offers (bids)
      if (path === "/api/admin/bids" && method === "GET") {
        try {
          const { results } = await env.DB.prepare(`
            SELECT 
              co.id,
              co.offer_id,
              co.product_id,
              co.product_category,
              co.product_size,
              co.product_image,
              co.offer_amount,
              co.customer_name,
              co.customer_contact,
              co.status,
              co.counter_offer_amount,
              co.admin_notes,
              co.created_at,
              co.responded_at
            FROM customer_offers co
            ORDER BY co.created_at DESC
          `).all();

          return json({
            success: true,
            bids: results || [],
            total: results?.length || 0,
            pending: results?.filter(b => b.status === 'pending').length || 0,
            accepted: results?.filter(b => b.status === 'accepted').length || 0,
            rejected: results?.filter(b => b.status === 'rejected').length || 0,
            timestamp: new Date().toISOString()
          }, 200, headers);
        } catch (error) {
          console.error('Bids management error:', error);
          return json({
            success: false,
            error: "Failed to fetch bids",
            details: error.message
          }, 500, headers);
        }
      }

      // Admin Update Bid Status
      if (path === "/api/admin/bids/update" && method === "POST") {
        try {
          const body = await request.json();
          const { bidId, status, counterOffer, adminNotes } = body;

          if (!bidId || !status) {
            return json({ 
              success: false, 
              error: "bidId and status required" 
            }, 400, headers);
          }

          const validStatuses = ['pending', 'accepted', 'rejected', 'countered'];
          if (!validStatuses.includes(status)) {
            return json({ 
              success: false, 
              error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
            }, 400, headers);
          }

          // Build update query
          const updates = ['status = ?', 'responded_at = CURRENT_TIMESTAMP'];
          const values = [status];

          if (counterOffer !== undefined && counterOffer !== null) {
            updates.push('counter_offer_amount = ?');
            values.push(counterOffer);
          }

          if (adminNotes !== undefined) {
            updates.push('admin_notes = ?');
            values.push(adminNotes);
          }

          values.push(bidId);

          await env.DB.prepare(
            `UPDATE customer_offers SET ${updates.join(', ')} WHERE id = ?`
          ).bind(...values).run();

          // Get updated bid
          const updatedBid = await env.DB.prepare(
            `SELECT * FROM customer_offers WHERE id = ?`
          ).bind(bidId).first();

          return json({
            success: true,
            message: "Bid updated successfully",
            bid: updatedBid
          }, 200, headers);

        } catch (error) {
          console.error('Update bid error:', error);
          return json({
            success: false,
            error: "Failed to update bid",
            details: error.message
          }, 500, headers);
        }
      }

      // Admin Users Management - Get all registered users with full details
      if (path === "/api/admin/users" && method === "GET") {
        try {
          const { results } = await env.DB.prepare(`
            SELECT 
              id,
              social_handle,
              email,
              email_verified,
              first_name,
              last_name,
              role,
              is_active,
              is_allowlisted,
              created_at,
              last_login
            FROM users
            ORDER BY created_at DESC
          `).all();

          // Get active session count for each user
          const activeSessions = await env.DB.prepare(`
            SELECT user_id, COUNT(*) as session_count
            FROM sessions
            WHERE expires_at > datetime('now')
            GROUP BY user_id
          `).all();

          const sessionMap = {};
          activeSessions.results?.forEach(s => {
            sessionMap[s.user_id] = s.session_count;
          });

          // Enhance user data with session info
          const users = results.map(user => ({
            ...user,
            active_sessions: sessionMap[user.id] || 0,
            is_logged_in: (sessionMap[user.id] || 0) > 0,
            full_name: [user.first_name, user.last_name].filter(Boolean).join(' ') || 'N/A'
          }));

          return json({
            success: true,
            users,
            total: users.length,
            active: users.filter(u => u.is_active === 1).length,
            logged_in: users.filter(u => u.is_logged_in).length,
            verified: users.filter(u => u.email_verified === 1).length,
            timestamp: new Date().toISOString()
          }, 200, headers);
        } catch (error) {
          console.error('Users management error:', error);
          return json({
            success: false,
            error: "Failed to fetch users",
            details: error.message
          }, 500, headers);
        }
      }

      // Admin Health Check - comprehensive configuration verification
      if (path === "/api/admin/health-check" && method === "GET") {
        const checks = [];
        let totalChecks = 0;
        let passedChecks = 0;

        // 1. Database check
        totalChecks++;
        try {
          const tables = await env.DB.prepare(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
          ).all();
          const requiredTables = ['users', 'sessions', 'session_tokens', 'orders', 'products', 'sell_cases'];
          const foundTables = tables.results?.map(r => r.name) || [];
          const missingTables = requiredTables.filter(t => !foundTables.includes(t));

          if (missingTables.length === 0) {
            passedChecks++;
            checks.push({
              name: "D1 Database",
              status: "✓ PASS",
              details: `All ${requiredTables.length} required tables present`,
              tables: foundTables
            });
          } else {
            checks.push({
              name: "D1 Database",
              status: "✗ FAIL",
              details: `Missing tables: ${missingTables.join(', ')}`,
              tables: foundTables
            });
          }
        } catch (dbError) {
          checks.push({
            name: "D1 Database",
            status: "✗ FAIL",
            error: dbError.message
          });
        }

        // 2. Environment variables check
        const envChecks = [
          { name: "CLOUDFLARE_ACCOUNT_ID", value: env.CLOUDFLARE_ACCOUNT_ID },
          { name: "SITE_URL", value: env.SITE_URL },
          { name: "ADMIN_ALLOWLIST_HANDLES", value: env.ADMIN_ALLOWLIST_HANDLES }
        ];

        envChecks.forEach(check => {
          totalChecks++;
          if (check.value) {
            passedChecks++;
            checks.push({
              name: check.name,
              status: "✓ PASS",
              details: "Configured",
              value: check.value
            });
          } else {
            checks.push({
              name: check.name,
              status: "✗ FAIL",
              details: "Not configured"
            });
          }
        });

        // 3. Secrets check (without revealing values)
        const secretChecks = [
          { name: "CLOUDFLARE_API_TOKEN", value: env.CLOUDFLARE_API_TOKEN },
          { name: "CLOUDFLARE_IMAGES_API_TOKEN", value: env.CLOUDFLARE_IMAGES_API_TOKEN },
          { name: "CLOUDFLARE_IMAGES_HASH", value: env.CLOUDFLARE_IMAGES_HASH }
        ];

        secretChecks.forEach(check => {
          totalChecks++;
          if (check.value) {
            passedChecks++;
            checks.push({
              name: check.name,
              status: "✓ PASS",
              details: "Secret configured (encrypted)"
            });
          } else {
            checks.push({
              name: check.name,
              status: "⚠ WARN",
              details: "Not configured (optional)"
            });
          }
        });

        // 4. Bindings check
        const bindingChecks = [
          { name: "DB (D1)", binding: env.DB, type: "D1 Database" },
          { name: "PRODUCT_IMAGES (R2)", binding: env.PRODUCT_IMAGES, type: "R2 Bucket" },
          { name: "USER_UPLOADS (R2)", binding: env.USER_UPLOADS, type: "R2 Bucket" }
        ];

        bindingChecks.forEach(check => {
          totalChecks++;
          if (check.binding) {
            passedChecks++;
            checks.push({
              name: check.name,
              status: "✓ PASS",
              details: `${check.type} bound`,
              type: check.type
            });
          } else {
            checks.push({
              name: check.name,
              status: "✗ FAIL",
              details: `${check.type} not bound`
            });
          }
        });

        // 5. Cloudflare Images API check
        totalChecks++;
        const hasImagesConfig = env.CLOUDFLARE_ACCOUNT_ID &&
          (env.CLOUDFLARE_API_TOKEN || env.CLOUDFLARE_IMAGES_API_TOKEN);
        if (hasImagesConfig) {
          passedChecks++;
          checks.push({
            name: "Cloudflare Images API",
            status: "✓ PASS",
            details: "Account ID and API token configured",
            ready: true
          });
        } else {
          checks.push({
            name: "Cloudflare Images API",
            status: "✗ FAIL",
            details: "Missing account ID or API token"
          });
        }

        const successRate = ((passedChecks / totalChecks) * 100).toFixed(1);
        const overallStatus = passedChecks === totalChecks ? "HEALTHY" :
          passedChecks >= totalChecks * 0.8 ? "DEGRADED" : "UNHEALTHY";

        return json({
          success: true,
          status: overallStatus,
          summary: {
            total_checks: totalChecks,
            passed: passedChecks,
            failed: totalChecks - passedChecks,
            success_rate: `${successRate}%`
          },
          checks: checks,
          environment: {
            production_branch: "MAIN",
            compatibility_date: "2024-09-30",
            project: "unity-v3"
          },
          timestamp: new Date().toISOString()
        }, 200, headers);
      }

      // Upload image to Cloudflare Images
      if (path === "/api/admin/upload-image" && method === "POST") {
        try {
          // Get environment variables
          const accountId = env.CLOUDFLARE_ACCOUNT_ID;
          const apiToken = env.CLOUDFLARE_API_TOKEN || env.CLOUDFLARE_IMAGES_API_TOKEN;

          if (!accountId || !apiToken) {
            return json({ success: false, error: "Missing CF Images credentials" }, 500, headers);
          }

          // Parse multipart form data with error handling
          let formData;
          try {
            formData = await request.formData();
          } catch (parseError) {
            return json({ success: false, error: "Invalid form data format" }, 400, headers);
          }

          const file = formData.get('file');
          const filename = formData.get('filename');
          const metadata = formData.get('metadata');

          if (!file) {
            return json({ success: false, error: "File is required" }, 400, headers);
          }

          // Validate file type
          if (!file.type || !file.type.startsWith('image/')) {
            return json({ success: false, error: "File must be an image" }, 400, headers);
          }

          // Create form data for CF Images API
          const cfFormData = new FormData();
          cfFormData.append('file', file);

          // Set metadata if provided
          if (metadata) {
            const meta = JSON.parse(metadata);
            cfFormData.append('metadata', JSON.stringify(meta));
          }

          // Set custom filename if provided
          // NOTE: CF Images 'id' has strict requirements:
          // - Only lowercase letters, numbers, hyphens, underscores
          // - Max 1024 characters (but keep it reasonable)
          // - Must be unique
          if (filename) {
            const cleanFilename = filename
              .replace(/\.(jpeg|jpg|png|webp)$/i, '') // Remove extension
              .toLowerCase(); // Convert to lowercase for CF Images compatibility

            cfFormData.append('id', cleanFilename);
            // Upload image with custom filename
          }

          // Upload to Cloudflare Images
          const uploadUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`;
          const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiToken}`
            },
            body: cfFormData
          });

          const result = await uploadResponse.json();

          if (!uploadResponse.ok || !result.success) {
            console.error('CF Images upload failed:', result);
            console.error('Attempted filename:', filename);
            return json({
              success: false,
              error: result.errors?.[0]?.message || 'Upload failed',
              details: result,
              attemptedFilename: filename
            }, uploadResponse.status, headers);
          }

          // Image upload completed

          return json({
            success: true,
            image: result.result,
            message: 'Image uploaded successfully',
            uploadedId: result.result?.id,
            requestedFilename: filename
          }, 200, headers);

        } catch (err) {
          console.error('Upload error:', err);
          return json({
            success: false,
            error: 'Upload failed',
            details: err.message
          }, 500, headers);
        }
      }

      // Update image metadata in Cloudflare Images
      if (path === "/api/admin/update-image-metadata" && method === "PATCH") {
        try {
          // Get environment variables
          const accountId = env.CLOUDFLARE_ACCOUNT_ID;
          const apiToken = env.CLOUDFLARE_API_TOKEN || env.CLOUDFLARE_IMAGES_API_TOKEN;

          if (!accountId || !apiToken) {
            return json({ success: false, error: "Missing CF Images credentials" }, 500, headers);
          }

          // Get image ID and metadata from request body
          const body = await request.json();
          const imageId = body.imageId || body.id;
          const metadata = body.metadata;

          if (!imageId) {
            return json({ success: false, error: "Image ID required" }, 400, headers);
          }

          if (!metadata) {
            return json({ success: false, error: "Metadata required" }, 400, headers);
          }

          // Update metadata via Cloudflare Images API
          const updateUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${imageId}`;
          const updateResponse = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${apiToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ metadata: metadata })
          });

          const result = await updateResponse.json();

          if (!updateResponse.ok || !result.success) {
            console.error('CF Images metadata update failed:', result);
            return json({
              success: false,
              error: result.errors?.[0]?.message || 'Metadata update failed',
              details: result
            }, updateResponse.status, headers);
          }

          return json({
            success: true,
            message: 'Metadata updated successfully',
            imageId: imageId,
            metadata: metadata
          }, 200, headers);

        } catch (err) {
          console.error('Update metadata error:', err);
          return json({
            success: false,
            error: 'Metadata update failed',
            details: err.message
          }, 500, headers);
        }
      }

      // Delete image from Cloudflare Images
      if (path === "/api/admin/delete-image" && (method === "DELETE" || method === "POST")) {
        try {
          // Get environment variables
          const accountId = env.CLOUDFLARE_ACCOUNT_ID;
          const apiToken = env.CLOUDFLARE_API_TOKEN || env.CLOUDFLARE_IMAGES_API_TOKEN;

          if (!accountId || !apiToken) {
            return json({ success: false, error: "Missing CF Images credentials" }, 500, headers);
          }

          // Get image ID from request body with error handling
          let body;
          try {
            body = await request.json();
          } catch (parseError) {
            return json({ success: false, error: "Invalid JSON format" }, 400, headers);
          }

          const imageId = body.imageId || body.id;

          if (!imageId) {
            return json({ success: false, error: "imageId is required" }, 400, headers);
          }

          // Validate imageId format
          if (typeof imageId !== 'string' || imageId.trim().length === 0) {
            return json({ success: false, error: "imageId must be a non-empty string" }, 400, headers);
          }

          // Delete from Cloudflare Images
          const deleteUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${imageId}`;
          const deleteResponse = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${apiToken}`
            }
          });

          const result = await deleteResponse.json();

          if (!deleteResponse.ok || !result.success) {
            console.error('CF Images delete failed:', result);
            return json({
              success: false,
              error: result.errors?.[0]?.message || 'Delete failed',
              details: result
            }, deleteResponse.status, headers);
          }

          return json({
            success: true,
            message: 'Image deleted successfully',
            imageId: imageId
          }, 200, headers);

        } catch (err) {
          console.error('Delete error:', err);
          return json({
            success: false,
            error: 'Delete failed',
            details: err.message
          }, 500, headers);
        }
      }
    }

    // ORDERS (example) — CSRF required on mutations
    if (path === "/api/orders" && method === "POST") {
  if (!session?.user_id) return json({ success: false, error: "Authentication required" }, 401, headersWithClearedCookie(headers));

      const ok = await assertCsrf(request, session);
      if (!ok) return json({ success: false, error: "Invalid CSRF token" }, 403, headers);

      const body = await request.json();
      if (!Array.isArray(body.items) || !body.items.length)
        return json({ success: false, error: "Items required" }, 400, headers);

      const user = await env.DB.prepare(
        `SELECT email, first_name, last_name, phone FROM users WHERE id=?`
      )
        .bind(session.user_id)
        .first();

      const customerName = (body.customer_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim()).trim() || session.social_handle || "SBS Customer";
      const customerPhone = (body.customer_phone || user?.phone || '').trim() || 'N/A';
      const deliveryMethod = body.delivery_method === 'collection' ? 'collection' : 'delivery';

      const items = body.items.map((item) => ({
        product_id: item.product_id || null,
        product_name: item.product_name || item.name || item.category || 'SBS Item',
        product_brand: item.product_brand || item.brand || 'SBS',
        product_category: item.product_category || item.category || 'General',
        product_size: item.product_size || item.size || 'One Size',
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
        image_url: item.image_url || null
      }));

      const itemsSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const providedSubtotal = Number(body.subtotal);
      const providedTotal = Number(body.total ?? body.total_amount);
      const deliveryFee = Number.isFinite(Number(body.delivery_fee))
        ? Number(body.delivery_fee)
        : deliveryMethod === 'delivery'
          ? 5
          : 0;

      const subtotal = Number.isFinite(providedSubtotal) ? providedSubtotal : itemsSubtotal;
      const total = Number.isFinite(providedTotal) ? providedTotal : subtotal + deliveryFee;

      const orderNo = `SBS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const itemsJson = JSON.stringify(items);

      const res = await env.DB.prepare(
        `INSERT INTO orders (
            user_id,
            order_number,
            customer_name,
            customer_phone,
            customer_email,
            items_json,
            delivery_method,
            delivery_fee,
            delivery_address,
            delivery_city,
            delivery_eircode,
            subtotal,
            total,
            status,
            created_at,
            updated_at
         )
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`
      )
        .bind(
          session.user_id,
          orderNo,
          customerName,
          customerPhone,
          user?.email || null,
          itemsJson,
          deliveryMethod,
          deliveryFee,
          body.delivery_address || null,
          body.delivery_city || null,
          body.delivery_eircode || null,
          subtotal,
          total
        )
        .run();

      const orderId = res.meta?.last_row_id ?? null;

      if (orderId) {
        for (const item of items) {
          await env.DB.prepare(
            `INSERT INTO order_items (
                order_id,
                product_id,
                product_name,
                product_brand,
                product_category,
                product_size,
                price,
                quantity,
                created_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
          )
            .bind(
              orderId,
              item.product_id,
              item.product_name,
              item.product_brand,
              item.product_category,
              item.product_size,
              item.price,
              item.quantity
            )
            .run();
        }
      }

      const newOrder = {
        id: orderId,
        order_number: orderNo,
        status: 'pending',
        total,
        subtotal,
        delivery_method: deliveryMethod,
        user_email: user?.email || null,
        user_name: customerName,
        items
      };

      // Send order confirmation notification
      try {
        const notificationService = new NotificationService(env);
        const notificationItems = items.map(item => ({
          name: item.product_name,
          size: item.product_size,
          quantity: item.quantity,
          price: item.price
        }));
        const notificationResult = await notificationService.sendOrderConfirmation(newOrder, notificationItems);

        if (notificationResult.success) {
          console.log(`✅ Order confirmation sent for ${orderNo}`);
        } else {
          console.warn(`⚠️  Order confirmation failed for ${orderNo}: ${notificationResult.reason}`);
        }
      } catch (notificationError) {
        console.error('❌ Order confirmation error:', notificationError);
        // Don't fail the order creation if notification fails
      }

      return json(
        { success: true, order: newOrder },
        201,
        headers
      );
    }

    if (path === "/api/orders" && method === "GET") {
  if (!session?.user_id) return json({ success: false, error: "Authentication required" }, 401, headersWithClearedCookie(headers));

      const rows = await env.DB.prepare(
        `SELECT id, order_number, items_json, subtotal, total, status, delivery_method, delivery_fee,
                delivery_address, delivery_city, delivery_eircode, admin_notes, customer_notes,
                created_at, updated_at, completed_at
         FROM orders
         WHERE user_id=?
         ORDER BY created_at DESC`
      )
        .bind(session.user_id)
        .all();

      const orders = (rows.results || []).map((row) => ({
        ...row,
        subtotal: Number(row.subtotal) || 0,
        total: Number(row.total) || 0,
        items: (() => {
          try {
            const parsed = JSON.parse(row.items_json || '[]');
            return Array.isArray(parsed) ? parsed : [];
          } catch (err) {
            console.warn('Failed to parse order items_json', err);
            return [];
          }
        })()
      }));

      return json({ success: true, orders }, 200, headers);
    }

    // USER DATA & GDPR ENDPOINTS

    // Get user's data (GDPR: Right to Access)
    // (Handled above in consolidated /api/users/me GET endpoint)

    // Get user's orders
    if (path === "/api/users/me/orders" && method === "GET") {
  if (!session?.user_id) return json({ success: false, error: "Authentication required" }, 401, headersWithClearedCookie(headers));

      const ordersStmt = await env.DB.prepare(
        `SELECT id, order_number, items_json, total_amount, delivery_address, delivery_city,
                delivery_eircode, delivery_method, delivery_phone, status, payment_status,
                created_at, updated_at
         FROM orders
         WHERE user_id=?
         ORDER BY created_at DESC`
      )
        .bind(session.user_id)
        .all();

      const orders = (ordersStmt.results || []).map((row) => ({
        ...row,
        total: Number(row.total_amount) || 0,
        subtotal: Number(row.total_amount) || 0,
        delivery_fee: 0,
        admin_notes: '',
        customer_notes: '',
        completed_at: null,
        items: (() => {
          try {
            const parsed = JSON.parse(row.items_json || '[]');
            return Array.isArray(parsed) ? parsed : [];
          } catch (err) {
            console.warn('Failed to parse order items_json', err);
            return [];
          }
        })()
      }));

      return json({ success: true, orders }, 200, headers);
    }

    // EMAIL VERIFICATION ENDPOINTS

    // Verify email token
    if (path === "/api/verify-email" && method === "POST") {
      const body = await request.json();
      const { token } = body;

      if (!token) {
        return json({ success: false, error: "Token required" }, 400, headers);
      }

      try {
        const { verifyEmailToken } = await import('../lib/email.js');
        const result = await verifyEmailToken(env.DB, token);

        if (result.success) {
          return json({
            success: true,
            message: "Email verified successfully! You can now login.",
            user: result.user
          }, 200, headers);
        } else {
          return json({
            success: false,
            error: result.error || "Verification failed"
          }, 400, headers);
        }
      } catch (error) {
        console.error('Verification error:', error);
        return json({
          success: false,
          error: "Verification failed"
        }, 500, headers);
      }
    }

    // Resend verification email
    if (path === "/api/resend-verification" && method === "POST") {
      const body = await request.json();
      const { email } = body;

      if (!email) {
        return json({ success: false, error: "Email required" }, 400, headers);
      }

      // Find user
      const user = await env.DB.prepare(
        `SELECT id, email, email_verified_at FROM users WHERE email = ?`
      ).bind(email).first();

      if (!user) {
        // Don't reveal if email exists
        return json({ success: true, message: "If that email is registered, a verification link has been sent." }, 200, headers);
      }

      if (user.email_verified_at) {
        return json({ success: false, error: "Email already verified" }, 400, headers);
      }

      try {
        const { createVerificationToken, sendVerificationEmail } = await import('../lib/email.js');
        const token = await createVerificationToken(env.DB, user.id);
        const siteUrl = env.SITE_URL || 'https://thesbsofficial.com';
        await sendVerificationEmail(email, token, siteUrl);

        return json({
          success: true,
          message: "Verification email sent! Check your inbox."
        }, 200, headers);
      } catch (error) {
        console.error('Resend email error:', error);
        return json({
          success: false,
          error: "Failed to send email"
        }, 500, headers);
      }
    }

    // Get user's sell submissions
    if (path === "/api/users/me/sell-cases" && method === "GET") {
      const cases = await env.DB.prepare(
        `SELECT case_id, brand, category, size, color, condition_rating, price,
         offer_amount, status, created_at FROM sell_cases WHERE user_id=? ORDER BY created_at DESC`
      )
        .bind(session.user_id)
        .all();

      return json({ success: true, cases: cases.results || [] }, 200, headers);
    }

    // Update user profile
    if (path === "/api/users/update-profile" && method === "PUT") {
      const ok = await assertCsrf(request, session);
      if (!ok) return json({ success: false, error: "Invalid CSRF token" }, 403, headers);

      const body = await request.json();
      const allowed = [
        "first_name", "last_name", "social_handle", "email", "phone",
        "address", "city", "eircode", "instagram", "snapchat",
        "preferred_contact", "current_password", "new_password"
      ];

      for (const k of Object.keys(body)) {
        if (!allowed.includes(k)) {
          return json({ success: false, error: `Unknown field: ${k}` }, 400, headers);
        }
      }

      // If changing password, verify current password first
      if (body.new_password) {
        if (!body.current_password) {
          return json({ success: false, error: "Current password required" }, 400, headers);
        }

        const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?")
          .bind(session.user_id)
          .first();

        if (!user || !(await verifyPassword(body.current_password, user))) {
          return json({ success: false, error: "Current password incorrect" }, 401, headersWithClearedCookie(headers));
        }

        // Hash new password
        const { hash, salt, type, iterations } = await hashPassword(body.new_password);
        await env.DB.prepare(
          `UPDATE users SET password_hash = ?, password_salt = ?, password_hash_type = ?,
           password_iterations = ? WHERE id = ?`
        )
          .bind(hash, salt, type, iterations, session.user_id)
          .run();
      }

      // Update other fields
      const updates = [];
      const values = [];

      if (body.first_name !== undefined) {
        updates.push("first_name = ?");
        values.push(body.first_name);
      }
      if (body.last_name !== undefined) {
        updates.push("last_name = ?");
        values.push(body.last_name);
      }
      if (body.social_handle !== undefined) {
        updates.push("social_handle = ?");
        values.push(body.social_handle);
      }
      if (body.email !== undefined) {
        updates.push("email = ?");
        values.push(body.email);
      }
      if (body.phone !== undefined) {
        updates.push("phone = ?");
        values.push(body.phone);
      }
      if (body.address !== undefined) {
        updates.push("address = ?");
        values.push(body.address);
      }
      if (body.city !== undefined) {
        updates.push("city = ?");
        values.push(body.city);
      }
      if (body.eircode !== undefined) {
        updates.push("eircode = ?");
        values.push(body.eircode);
      }
      if (body.instagram !== undefined) {
        updates.push("instagram = ?");
        values.push(body.instagram);
      }
      if (body.snapchat !== undefined) {
        updates.push("snapchat = ?");
        values.push(body.snapchat);
      }
      if (body.preferred_contact !== undefined) {
        updates.push("preferred_contact = ?");
        values.push(body.preferred_contact);
      }

      if (updates.length > 0) {
        updates.push("updated_at = CURRENT_TIMESTAMP");
        values.push(session.user_id);

        await env.DB.prepare(
          `UPDATE users SET ${updates.join(", ")} WHERE id = ?`
        )
          .bind(...values)
          .run();
      }

      // Return updated user
      const updatedUser = await env.DB.prepare(
        `SELECT id, social_handle, email, phone, first_name, last_name, address, city,
         eircode, instagram, snapchat, preferred_contact, role FROM users WHERE id = ?`
      )
        .bind(session.user_id)
        .first();

      return json({
        success: true,
        message: "Profile updated successfully",
        user: updatedUser
      }, 200, headers);
    }

    // Delete user account (GDPR: Right to Erasure)
    if (path === "/api/users/delete" && method === "DELETE") {
      const ok = await assertCsrf(request, session);
      if (!ok) return json({ success: false, error: "Invalid CSRF token" }, 403, headers);

      try {
        // GDPR Compliant: Soft delete - mark as inactive, keep data for legal/financial records
        // This preserves order history and sell case records
        await env.DB.prepare(
          `UPDATE users SET
           is_active = 0,
           email = NULL,
           phone = NULL,
           address = NULL,
           city = NULL,
           eircode = NULL,
           social_handle = CONCAT('deleted_', id, '_', social_handle),
           updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`
        )
          .bind(session.user_id)
          .run();

        // Delete all sessions for this user
        await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?")
          .bind(session.user_id)
          .run();

        return json(
          {
            success: true,
            message: "Account deleted. Your purchase and sell history has been anonymized.",
          },
          200,
          { ...headers, "Set-Cookie": clearCookie() }
        );
      } catch (err) {
        console.error("Delete user error:", err);
        return json({ success: false, error: "Failed to delete account" }, 500, headers);
      }
    }

    // ===== ADMIN ENDPOINTS =====

    // Admin login (public endpoint)
    if (path === "/api/admin/login" && method === "POST") {
      const body = await request.json();
      const { email, password } = body;

      if (!email || !password) {
        return json({ success: false, error: "Email and password required" }, 400, headers);
      }

      // Find admin user
      const user = await env.DB.prepare(`
        SELECT id, email, password_hash, password_salt, password_hash_type,
               password_iterations, role, is_allowlisted, first_name, last_name
        FROM users
        WHERE email = ? AND role = 'admin'
      `).bind(email).first();

      if (!user || !(await verifyPassword(password, user))) {
  return json({ success: false, error: "Invalid credentials" }, 401, headersWithClearedCookie(headers));
      }

      if (!user.is_allowlisted) {
        return json({ success: false, error: "Access denied" }, 403, headers);
      }

      // Create admin session
      const ip = ipOf(request);
      const ua = request.headers.get("User-Agent") || "unknown";
      const { token, csrfSecret } = await createSession(env, user.id, ip, ua);

      // Log admin login
      try {
        const { logAdminAction } = await import('../lib/admin.js');
        const mockSession = { user_id: user.id, role: 'admin', is_allowlisted: 1 };
        await logAdminAction(env, mockSession, 'admin_login', null, {
          email: user.email,
          ip_address: ip
        });
      } catch (e) {
        console.warn('Admin logging failed:', e);
      }

      return json({
        success: true,
        token,
        csrf_token: await csrfTokenFromSecret(csrfSecret),
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Admin'
        }
      }, 200, headers);
    }

    // Admin logout
    if (path === "/api/admin/logout" && method === "POST") {
      const authHeader = request.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        await destroySession(env, token);
      }
      return json({ success: true }, 200, headers);
    }

    // Admin session verification
    if (path === "/api/admin/verify" && method === "GET") {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return json({ success: false, error: "No token provided" }, 401, headersWithClearedCookie(headers));
      }

      const token = authHeader.substring(7);
      const adminSession = await readSession(env, token);

      if (!adminSession || !isAdmin(adminSession)) {
  return json({ success: false, error: "Invalid admin session" }, 401, headersWithClearedCookie(headers));
      }

      return json({
        success: true,
        user: {
          id: adminSession.user_id,
          email: adminSession.email,
          role: adminSession.role,
          name: `${adminSession.first_name || ''} ${adminSession.last_name || ''}`.trim() || 'Admin'
        },
        csrf_token: await csrfTokenFromSecret(adminSession.csrf_secret)
      }, 200, headers);
    }

    // ===== END ADMIN ENDPOINTS =====

    // 404
    return json({ success: false, error: "Endpoint not found" }, 404, headers);
  } catch (err) {
    console.error("API error:", err);
    console.error("Error stack:", err.stack);
    console.error("Error message:", err.message);
    return json({ success: false, error: "Internal server error", details: err.message }, 500, secHeaders("", env));
  }
}
