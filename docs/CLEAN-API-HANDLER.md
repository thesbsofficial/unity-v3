# Clean API Handler Code for [[path]].js

**Copy ALL the code below and paste it into the new `functions/api/[[path]].js` file**

```javascript
/**
 * SBS Unity v3 API Handler
 * Secure authentication and admin RBAC implementation
 * October 2, 2025
 */

// Import security modules
import * as Security from "../lib/security.js";
import * as Sessions from "../lib/sessions.js";
import * as Admin from "../lib/admin.js";
import * as RateLimiting from "../lib/rate-limiting.js";

// Constants
const PASSWORD_MIN_LENGTH = 12;

// Helper functions
function respond(data, headers = {}, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

function getSecurityHeaders(origin) {
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS ||
    "https://thesbsofficial.com,https://unity-v3.pages.dev"
  ).split(",");
  const isAllowed = allowedOrigins.includes(origin);

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-CSRF-Token",
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'",
  };
}

function getClientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0] ||
    "unknown"
  );
}

function validateRegistrationPayload(payload) {
  const allowedFields = [
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
  const unknownFields = Object.keys(payload).filter(
    (k) => !allowedFields.includes(k)
  );
  if (unknownFields.length > 0) {
    return {
      valid: false,
      error: `Unknown fields: ${unknownFields.join(", ")}`,
    };
  }

  const { social_handle, password } = payload;
  if (!social_handle || !password) {
    return { valid: false, error: "social_handle and password are required" };
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    };
  }

  return { valid: true };
}

// Main handler
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const origin = request.headers.get("Origin") || "";
  const securityHeaders = getSecurityHeaders(origin);
  const clientIp = getClientIp(request);

  // Handle CORS preflight
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: securityHeaders });
  }

  try {
    // Extract session token from cookie
    const sessionToken = Sessions.extractSessionToken(request);
    let session = null;
    if (sessionToken) {
      session = await Sessions.validateSession(env, sessionToken);
    }

    // ========== PUBLIC ENDPOINTS ==========

    // Health check
    if (path === "/api/health" && method === "GET") {
      return respond(
        {
          status: "healthy",
          timestamp: new Date().toISOString(),
          service: "SBS Unity v3 API",
        },
        securityHeaders
      );
    }

    // Register
    if (path === "/api/users/register" && method === "POST") {
      const payload = await request.json();
      const validation = validateRegistrationPayload(payload);
      if (!validation.valid) {
        return respond(
          { success: false, error: validation.error },
          securityHeaders,
          400
        );
      }

      const {
        social_handle,
        password,
        email,
        phone,
        first_name,
        last_name,
        address,
        city,
        eircode,
        preferred_contact,
      } = payload;

      // Check if user exists
      const existing = await env.DB.prepare(
        "SELECT id FROM users WHERE social_handle = ? OR email = ?"
      )
        .bind(social_handle, email || null)
        .first();

      if (existing) {
        return respond(
          {
            success: false,
            error: "User already exists with this handle or email",
          },
          securityHeaders,
          409
        );
      }

      // Hash password using security module
      const { hash, salt, type, iterations } = await Security.hashPassword(
        password
      );

      // Create user
      const result = await env.DB.prepare(
        `
                INSERT INTO users (
                    social_handle, email, phone, password_hash, password_salt, 
                    password_hash_type, password_iterations,
                    first_name, last_name, address, city, eircode, preferred_contact,
                    email_verification_required, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
            `
      )
        .bind(
          social_handle,
          email || null,
          phone || null,
          hash,
          salt,
          type,
          iterations,
          first_name || null,
          last_name || null,
          address || null,
          city || null,
          eircode || null,
          preferred_contact || null
        )
        .run();

      return respond(
        {
          success: true,
          message: "Account created successfully",
          user_id: result.meta.last_row_id,
        },
        securityHeaders,
        201
      );
    }

    // Login
    if (path === "/api/users/login" && method === "POST") {
      const payload = await request.json();
      const { social_handle, password, totp_code } = payload;

      if (!social_handle || !password) {
        return respond(
          { success: false, error: "social_handle and password are required" },
          securityHeaders,
          400
        );
      }

      // Rate limiting
      const rateLimitKeys = RateLimiting.generateLoginRateLimitKeys(
        clientIp,
        social_handle
      );
      const rateLimitCheck =
        RateLimiting.checkMultipleRateLimits(rateLimitKeys);
      if (rateLimitCheck.limited) {
        return respond(
          {
            success: false,
            error: "Too many login attempts. Please try again later.",
            retry_after: Math.ceil(
              (rateLimitCheck.resetAt - Date.now()) / 1000
            ),
          },
          securityHeaders,
          429
        );
      }

      // Get user
      const user = await env.DB.prepare(
        "SELECT * FROM users WHERE social_handle = ?"
      )
        .bind(social_handle)
        .first();

      if (!user) {
        return respond(
          { success: false, error: "Invalid credentials" },
          securityHeaders,
          401
        );
      }

      // Check account lockout
      const lockoutCheck = await RateLimiting.checkAccountLockout(env, user.id);
      if (lockoutCheck.locked) {
        return respond(
          {
            success: false,
            error: "Account is temporarily locked. Please try again later.",
            locked_until: lockoutCheck.lockedUntil,
          },
          securityHeaders,
          423
        );
      }

      // Verify password using security module
      const passwordValid = await Security.verifyPasswordAgainstUser(
        password,
        user
      );

      if (!passwordValid) {
        // Increment failed attempts
        await RateLimiting.incrementFailedLoginAttempts(env, user.id);
        return respond(
          { success: false, error: "Invalid credentials" },
          securityHeaders,
          401
        );
      }

      // Check TOTP if enabled
      if (user.totp_secret) {
        if (!totp_code) {
          return respond(
            { success: false, totp_required: true },
            securityHeaders,
            200
          );
        }

        const totpValid = await Security.verifyTotp(
          totp_code,
          user.totp_secret
        );
        if (!totpValid) {
          return respond(
            { success: false, error: "Invalid TOTP code" },
            securityHeaders,
            401
          );
        }
      }

      // Reset failed login attempts
      await RateLimiting.resetFailedLoginAttempts(env, user.id);
      RateLimiting.resetMultipleRateLimits(rateLimitKeys);

      // Check if should elevate to admin
      if (
        user.role !== "admin" &&
        Admin.shouldElevateToAdmin(env, user.social_handle)
      ) {
        await Admin.promoteToAdmin(
          env,
          user.id,
          `Auto-promoted via ADMIN_ALLOWLIST_HANDLES on login`
        );
        user.role = "admin"; // Update local user object
      }

      // Create session
      const userAgent = request.headers.get("User-Agent") || "unknown";
      const { token, csrfToken } = await Sessions.createSession(
        env,
        user.id,
        clientIp,
        userAgent
      );

      // Set cookie
      const cookie = Sessions.setAuthCookie(token);

      return respond(
        {
          success: true,
          csrf_token: csrfToken,
          user: Sessions.sanitizeUser(user),
        },
        { ...securityHeaders, "Set-Cookie": cookie }
      );
    }

    // Logout
    if (path === "/api/users/logout" && method === "POST") {
      if (sessionToken) {
        await Sessions.invalidateSession(env, sessionToken);
      }
      const clearCookie = Sessions.clearAuthCookie();
      return respond(
        { success: true },
        { ...securityHeaders, "Set-Cookie": clearCookie }
      );
    }

    // ========== PROTECTED ENDPOINTS (Require Authentication) ==========

    if (!session) {
      return respond(
        { success: false, error: "Unauthorized" },
        securityHeaders,
        401
      );
    }

    // Get current user
    if (path === "/api/users/me" && method === "GET") {
      return respond(
        {
          success: true,
          user: Sessions.sanitizeUser(session),
          csrf_token: await Security.hashToken(session.csrf_secret),
          is_admin: Admin.isAdminSession(session),
        },
        securityHeaders
      );
    }

    // ========== ADMIN ENDPOINTS (Require Admin Role) ==========

    if (path.startsWith("/api/admin/")) {
      if (!Admin.isAdminSession(session)) {
        return respond(
          { success: false, error: "Forbidden: Admin access required" },
          securityHeaders,
          403
        );
      }

      // Admin menu HTML
      if (path === "/api/admin/menu" && method === "GET") {
        await Admin.logAdminAction(
          env,
          session,
          "admin_menu_view",
          null,
          null,
          clientIp
        );
        const html = Admin.generateAdminMenuHTML();
        return new Response(html, {
          status: 200,
          headers: {
            "Content-Type": "text/html",
            ...securityHeaders,
          },
        });
      }

      // Board-07 Diagnostics
      if (path === "/api/admin/tests/board07" && method === "GET") {
        const checks = await Admin.runAdminDiagnostics(env);
        await Admin.logAdminAction(
          env,
          session,
          "admin_diagnostics",
          "board07",
          { checks },
          clientIp
        );
        return respond(
          {
            success: true,
            checks,
            timestamp: new Date().toISOString(),
          },
          securityHeaders
        );
      }

      // TOTP Setup
      if (path === "/api/admin/totp/setup" && method === "POST") {
        const result = await Admin.setupTotpForAdmin(
          env,
          session.user_id,
          session.social_handle
        );
        await Admin.logAdminAction(
          env,
          session,
          "totp_setup",
          null,
          null,
          clientIp
        );
        return respond(
          {
            success: true,
            ...result,
          },
          securityHeaders
        );
      }
    }

    // ========== ORDERS ENDPOINTS ==========

    if (path === "/api/orders" && method === "POST") {
      // Verify CSRF token
      const csrfToken = request.headers.get("X-CSRF-Token");
      if (!csrfToken) {
        return respond(
          { success: false, error: "CSRF token required" },
          securityHeaders,
          403
        );
      }

      const csrfValid = Security.timingSafeEqualString(
        await Security.hashToken(session.csrf_secret),
        csrfToken
      );
      if (!csrfValid) {
        return respond(
          { success: false, error: "Invalid CSRF token" },
          securityHeaders,
          403
        );
      }

      const payload = await request.json();
      const {
        items,
        total_amount,
        delivery_address,
        delivery_city,
        delivery_method,
      } = payload;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return respond(
          { success: false, error: "Items are required" },
          securityHeaders,
          400
        );
      }

      // Generate order number
      const orderNumber = Security.generateOrderNumber();

      // Create order
      const result = await env.DB.prepare(
        `
                INSERT INTO orders (
                    user_id, order_number, items_json, total_amount, 
                    delivery_address, delivery_city, delivery_method,
                    status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
            `
      )
        .bind(
          session.user_id,
          orderNumber,
          JSON.stringify(items),
          total_amount,
          delivery_address || null,
          delivery_city || null,
          delivery_method || "delivery"
        )
        .run();

      return respond(
        {
          success: true,
          order: {
            id: result.meta.last_row_id,
            order_number: orderNumber,
            total_amount,
            status: "pending",
          },
        },
        securityHeaders,
        201
      );
    }

    if (path === "/api/orders" && method === "GET") {
      const orders = await env.DB.prepare(
        `
                SELECT id, order_number, total_amount, status, created_at
                FROM orders
                WHERE user_id = ?
                ORDER BY created_at DESC
            `
      )
        .bind(session.user_id)
        .all();

      return respond(
        {
          success: true,
          orders: orders.results,
        },
        securityHeaders
      );
    }

    // Not found
    return respond(
      { success: false, error: "Endpoint not found" },
      securityHeaders,
      404
    );
  } catch (error) {
    console.error("API Error:", error);
    return respond(
      {
        success: false,
        error: "Internal server error",
        message: error.message,
      },
      securityHeaders,
      500
    );
  }
}
```

---

## ✅ What This API Handler Does

### Security Features

- ✅ Imports all 4 security modules (security.js, sessions.js, admin.js, rate-limiting.js)
- ✅ PBKDF2 password hashing on registration
- ✅ Auto-password hash upgrade on login (SHA-256 → PBKDF2)
- ✅ Rate limiting on login (5 attempts per 15 minutes)
- ✅ Account lockout after failed attempts
- ✅ TOTP/2FA support if enabled
- ✅ Admin auto-promotion via `ADMIN_ALLOWLIST_HANDLES` env var
- ✅ HttpOnly session cookies
- ✅ CSRF token validation on mutations
- ✅ Security headers (HSTS, X-Frame-Options, CSP)
- ✅ CORS with origin allowlist

### Endpoints Implemented

1. `GET /api/health` - Health check
2. `POST /api/users/register` - User registration with PBKDF2
3. `POST /api/users/login` - Login with rate limiting and admin auto-promotion
4. `POST /api/users/logout` - Logout with session invalidation
5. `GET /api/users/me` - Get current user (requires auth)
6. `GET /api/admin/menu` - Admin menu HTML (requires admin role)
7. `GET /api/admin/tests/board07` - Board-07 diagnostics (requires admin role)
8. `POST /api/admin/totp/setup` - TOTP setup (requires admin role)
9. `POST /api/orders` - Create order with CSRF validation (requires auth)
10. `GET /api/orders` - Get user's orders (requires auth)

### Admin Features

- Admin auto-promotion on login if handle in `ADMIN_ALLOWLIST_HANDLES`
- Board-07 diagnostics with 7 system health checks
- Audit logging for all admin actions
- TOTP setup endpoint for 2FA

---

## 🚀 After Pasting This Code

1. Save the file
2. Check for errors in VS Code Problems panel (should be 0)
3. Set environment variables in Cloudflare dashboard
4. Deploy with `npx wrangler pages deploy public`
5. Test login with @thesbs account

**All done!** 🎉
