// functions/api/[[path]].js
// SBS Unity v3 — Secure API Handler (RBAC, Sessions, CSRF, D1)
// Paste this file as-is. Requires env.DB (D1) + ALLOWED_ORIGINS.
// Oct 2, 2025

import NotificationService from '../lib/notification-service.js';

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
const clearCookie = () => `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;

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

async function verifyPassword(password, user) {
  if (!user?.password_hash || !user?.password_salt) return false;
  const iters = Number(user.password_iterations || 100000);
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: b64toBuf(user.password_salt), iterations: iters },
    key,
    256
  );
  return timingSafeEq(b64(bits), user.password_hash);
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

  await env.DB.prepare(
    `INSERT INTO sessions (user_id, token, csrf_secret, expires_at, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(userId, tokenHash, csrfSecret, exp, ip || null, ua || null)
    .run();

  // map token to user with a lightweight store table
  await env.DB.prepare(
    `INSERT INTO session_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)`
  )
    .bind(tokenHash, userId, exp)
    .run();

  return { token: tokenRaw, csrfSecret };
}

async function sha256b64(s) {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return b64(d);
}

async function readSession(env, tokenRaw) {
  if (!tokenRaw) return null;
  const tokenHash = await sha256b64(tokenRaw);
  const tok = await env.DB.prepare(
    `SELECT user_id, expires_at FROM session_tokens WHERE token_hash = ? AND expires_at > datetime('now')`
  )
    .bind(tokenHash)
    .first();
  if (!tok) return null;
  const row = await env.DB.prepare(
    `SELECT s.user_id, s.csrf_secret, s.expires_at, u.role, u.social_handle, u.first_name, u.last_name, u.email, u.is_allowlisted
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.user_id = ? AND s.expires_at > datetime('now')
      ORDER BY s.created_at DESC LIMIT 1`
  )
    .bind(tok.user_id)
    .first();
  return row || null;
}

async function destroySession(env, tokenRaw) {
  if (!tokenRaw) return;
  const tokenHash = await sha256b64(tokenRaw);
  await env.DB.prepare(`DELETE FROM session_tokens WHERE token_hash = ?`).bind(tokenHash).run();
  // (Let per-user sessions table expire naturally; optional: also DELETE sessions by user_id)
}

// ---- Helpers ----
const okOrigins = (env) => (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim());
const isAdmin = (session) => session?.role === "admin" && session?.is_allowlisted === 1;
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
          const { createVerificationToken, sendVerificationEmail } = await import('../lib/email.js');
          const token = await createVerificationToken(env.DB, userId);
          const siteUrl = env.SITE_URL || 'https://thesbsofficial.com';
          await sendVerificationEmail(body.email, token, siteUrl);

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
      const { social_handle, password } = body;
      if (!social_handle || !password)
        return json({ success: false, error: "social_handle and password required" }, 400, headers);

      const user = await env.DB.prepare("SELECT * FROM users WHERE social_handle = ?")
        .bind(social_handle)
        .first();
      if (!user || !(await verifyPassword(password, user)))
        return json({ success: false, error: "Invalid credentials" }, 401, headers);

      // Check if email verification is required
      if (user.email && user.email_verified === 0) {
        return json({
          success: false,
          error: "Please verify your email before logging in. Check your inbox for the verification link.",
          email_verification_required: true,
          email: user.email
        }, 403, headers);
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
      if (sessionCookie) await destroySession(env, sessionCookie);
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
        // Use Resend email system with beautiful templates
        const { createVerificationToken } = await import('../lib/email.js');
        const { sendBeautifulVerificationEmail } = await import('../lib/resend-wrapper.js');

        const token = await createVerificationToken(env.DB, user.id);
        const siteUrl = env.SITE_URL || 'https://thesbsofficial.com';

        await sendBeautifulVerificationEmail(
          env.RESEND_API_KEY,
          user.email,
          user.first_name || 'there',
          token,
          siteUrl
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
        const { sendVerificationEmail } = await import('../lib/email.js');
        const testToken = 'test-' + Math.random().toString(36).substring(2, 15);
        const siteUrl = env.SITE_URL || 'https://thesbsofficial.com';

        const result = await sendVerificationEmail(email, testToken, siteUrl);

        return json({
          success: true,
          message: `Test verification email sent to ${email}`,
          note: 'This is a test email with a dummy token',
          mailChannelsResponse: result
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

    // ANALYTICS TRACKING - PUBLIC
    if (path === "/api/analytics/track" && method === "POST") {
      try {
        const body = await request.json();
        const events = body.events;

        if (!Array.isArray(events) || events.length === 0) {
          return json({ success: false, error: "No events to track" }, 400, headers);
        }

        const ip = ipOf(request);
        const ua = request.headers.get("User-Agent") || "unknown";
        const userId = session?.user_id || null;
        const sessionId = session?.session_id || body.sessionId || null; // Allow client to send session ID

        const stmt = env.DB.prepare(
          `INSERT INTO analytics_events (event_type, event_data, user_id, session_id, ip_address, user_agent, path)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        );

        const batch = events.map(event =>
          stmt.bind(
            event.type,
            JSON.stringify(event.data || {}),
            userId,
            sessionId,
            ip,
            ua,
            event.path || null
          )
        );

        await env.DB.batch(batch);

        return json({ success: true, tracked: events.length }, 200, headers);
      } catch (error) {
        console.error('Analytics tracking error:', error);
        return json({ success: false, error: "Failed to track analytics", details: error.message }, 500, headers);
      }
    }

    // AUTH REQUIRED
    if (!session) return json({ success: false, error: "Unauthorized" }, 401, headers);

    if (path === "/api/users/me" && method === "GET") {
      const csrfToken = await csrfTokenFromSecret(session.csrf_secret);
      return json(
        {
          success: true,
          user: {
            id: session.user_id,
            social_handle: session.social_handle,
            email: session.email,
            role: session.role,
            first_name: session.first_name,
            last_name: session.last_name,
            is_allowlisted: session.is_allowlisted,
          },
          csrf_token: csrfToken,
          is_admin: isAdmin(session),
        },
        200,
        headers
      );
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
            "SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = 'completed'"
          ).first();

          // Recent orders
          const recentOrders = await env.DB.prepare(
            "SELECT order_number, total_amount, status, created_at FROM orders ORDER BY created_at DESC LIMIT 10"
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
      const ok = await assertCsrf(request, session);
      if (!ok) return json({ success: false, error: "Invalid CSRF token" }, 403, headers);

      const body = await request.json();
      if (!Array.isArray(body.items) || !body.items.length)
        return json({ success: false, error: "Items required" }, 400, headers);

      const orderNo = `SBS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const res = await env.DB.prepare(
        `INSERT INTO orders (user_id, order_number, items_json, total_amount, delivery_address, delivery_city, delivery_method, status, created_at)
         VALUES (?,?,?,?,?,?,?,'pending',CURRENT_TIMESTAMP)`
      )
        .bind(
          session.user_id,
          orderNo,
          JSON.stringify(body.items),
          body.total_amount || 0,
          body.delivery_address || null,
          body.delivery_city || null,
          body.delivery_method || "delivery"
        )
        .run();

      // Get user email for order confirmation
      const user = await env.DB.prepare(
        `SELECT email, first_name, last_name FROM users WHERE id=?`
      ).bind(session.user_id).first();

      const newOrder = {
        id: res.meta?.last_row_id ?? null,
        order_number: orderNo,
        status: "pending",
        total_amount: body.total_amount || 0,
        user_email: user?.email,
        user_name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : null
      };

      // Send order confirmation notification
      try {
        const notificationService = new NotificationService(env);
        const notificationResult = await notificationService.sendOrderConfirmation(newOrder, body.items);

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
      const rows = await env.DB.prepare(
        `SELECT id, order_number, total_amount, status, created_at FROM orders WHERE user_id=? ORDER BY created_at DESC`
      )
        .bind(session.user_id)
        .all();
      return json({ success: true, orders: rows.results || [] }, 200, headers);
    }

    // USER DATA & GDPR ENDPOINTS

    // Get user's data (GDPR: Right to Access)
    if (path === "/api/users/me" && method === "GET") {
      const user = await env.DB.prepare(
        `SELECT id, social_handle, email, phone, first_name, last_name, address, city, eircode,
         preferred_contact, role, created_at FROM users WHERE id=?`
      )
        .bind(session.user_id)
        .first();

      if (!user) return json({ success: false, error: "User not found" }, 404, headers);

      return json({ success: true, user }, 200, headers);
    }

    // Get user's orders
    if (path === "/api/users/me/orders" && method === "GET") {
      const orders = await env.DB.prepare(
        `SELECT id, order_number, items_json, total_amount, delivery_address, delivery_city,
         delivery_method, status, created_at FROM orders WHERE user_id=? ORDER BY created_at DESC`
      )
        .bind(session.user_id)
        .all();

      return json({ success: true, orders: orders.results || [] }, 200, headers);
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
          return json({ success: false, error: "Current password incorrect" }, 401, headers);
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
        return json({ success: false, error: "Invalid credentials" }, 401, headers);
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
        return json({ success: false, error: "No token provided" }, 401, headers);
      }

      const token = authHeader.substring(7);
      const adminSession = await readSession(env, token);

      if (!adminSession || !isAdmin(adminSession)) {
        return json({ success: false, error: "Invalid admin session" }, 401, headers);
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
