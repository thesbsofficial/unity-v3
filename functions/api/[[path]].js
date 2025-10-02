// functions/api/[[path]].js
// SBS Unity v3 — Secure API Handler (RBAC, Sessions, CSRF, D1)
// Paste this file as-is. Requires env.DB (D1) + ALLOWED_ORIGINS.
// Oct 2, 2025

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
const cookieAttrs = "; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000"; // 30d
const setCookie = (token) => `${COOKIE_NAME}=${token}${cookieAttrs}`;
const clearCookie = () => `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;

function getCookie(request, name) {
  const h = request.headers.get("Cookie") || "";
  const m = h.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

// ---- Password hashing (PBKDF2-HMAC-SHA256) ----
async function hashPassword(password, iterations = 210000) {
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
  const iters = Number(user.password_iterations || 210000);
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
    `INSERT INTO sessions (id, user_id, csrf_secret, created_at, expires_at, ip_address, user_agent)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)`
  )
    .bind(crypto.randomUUID(), userId, csrfSecret, exp, ip || null, ua || null)
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
    `SELECT s.user_id, s.csrf_secret, s.expires_at, u.role, u.social_handle, u.first_name, u.last_name, u.email
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
const isAdmin = (session) => session?.role === "admin";
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
      if (body.password.length < 12)
        return json({ success: false, error: "Password must be at least 12 characters" }, 400, headers);

      const exists = await env.DB.prepare(
        "SELECT id FROM users WHERE social_handle = ? OR email = ?"
      )
        .bind(body.social_handle, body.email || null)
        .first();
      if (exists) return json({ success: false, error: "User already exists" }, 409, headers);

      const { hash, salt, type, iterations } = await hashPassword(body.password);
      const res = await env.DB.prepare(
        `INSERT INTO users
        (social_handle,email,phone,password_hash,password_salt,password_hash_type,password_iterations,
         first_name,last_name,address,city,eircode,preferred_contact,role,email_verification_required,created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'user',1,CURRENT_TIMESTAMP)`
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
          body.preferred_contact || null
        )
        .run();

      return json(
        { success: true, message: "Account created. Please verify your email.", user_id: res.meta?.last_row_id ?? null },
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
            <h2>Admin Controls</h2>
            <ul>
              <li><a href="/admin/dashboard">Open Admin Dashboard</a></li>
              <li><button id="runBoard07" type="button">Run Admin Diagnostics</button></li>
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

      return json(
        { success: true, order: { id: res.meta?.last_row_id ?? null, order_number: orderNo, status: "pending" } },
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

    // 404
    return json({ success: false, error: "Endpoint not found" }, 404, headers);
  } catch (err) {
    console.error("API error:", err);
    return json({ success: false, error: "Internal server error" }, 500, secHeaders("", env));
  }
}
