/**
 * 🔐 Admin Authentication API
 * Handles admin login, logout, and session verification
 * Routes: POST /api/admin/auth/login, POST /api/admin/auth/logout, GET /api/admin/auth/verify
 */

import { verifyPassword } from '../../lib/security.js';
import { isAdminSession, logAdminAction } from '../../lib/admin.js';

// Common response helper
function jsonResponse(data, status = 200, headers = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            ...headers
        }
    });
}

// Session token helpers
function generateSessionToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function hashToken(token) {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// GET /api/admin/auth/verify - Verify admin session
export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    if (url.pathname.endsWith('/verify')) {
        return await handleVerifySession(context);
    }

    return jsonResponse({ error: 'Endpoint not found' }, 404);
}

// POST /api/admin/auth/* - Handle login/logout
export async function onRequestPost(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    if (url.pathname.endsWith('/login')) {
        return await handleLogin(context);
    } else if (url.pathname.endsWith('/logout')) {
        return await handleLogout(context);
    }

    return jsonResponse({ error: 'Endpoint not found' }, 404);
}

// Handle admin login
async function handleLogin(context) {
    const { request, env } = context;

    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return jsonResponse({
                success: false,
                error: 'Email and password are required'
            }, 400);
        }

        console.log(`🔐 Admin login attempt for: ${email}`);

        // Find admin user
        const user = await env.DB.prepare(`
            SELECT id, email, password_hash, password_salt, password_hash_type,
                   password_iterations, role, is_allowlisted, first_name, last_name
            FROM users
            WHERE email = ? AND role = 'admin'
        `).bind(email).first();

        if (!user) {
            console.log(`❌ Admin user not found: ${email}`);
            return jsonResponse({
                success: false,
                error: 'Invalid credentials'
            }, 401);
        }

        // Verify password using security helper
        const isValidPassword = await verifyPassword(password, user);

        if (!isValidPassword) {
            console.log(`❌ Invalid password for admin: ${email}`);
            return jsonResponse({
                success: false,
                error: 'Invalid credentials'
            }, 401);
        }

        // Check if admin is allowlisted
        if (!user.is_allowlisted) {
            console.log(`❌ Admin not allowlisted: ${email}`);
            return jsonResponse({
                success: false,
                error: 'Access denied. Contact system administrator.'
            }, 403);
        }

        // Generate session token
        const sessionToken = generateSessionToken();
        const tokenHash = await hashToken(sessionToken);

        // Create admin session (30-day expiry)
        const expiresAt = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString();
        const clientIP = request.headers.get('CF-Connecting-IP') ||
            request.headers.get('X-Forwarded-For') ||
            'unknown';
        const userAgent = request.headers.get('User-Agent') || 'unknown';

        await env.DB.prepare(`
            INSERT INTO sessions (user_id, token_hash, csrf_secret, expires_at, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
            user.id,
            tokenHash,
            generateSessionToken(), // CSRF secret
            expiresAt,
            clientIP,
            userAgent
        ).run();

        // Also add to session_tokens table for compatibility
        await env.DB.prepare(`
            INSERT INTO session_tokens (token_hash, user_id, expires_at)
            VALUES (?, ?, ?)
        `).bind(tokenHash, user.id, expiresAt).run();

        // Log admin action
        const mockSession = { user_id: user.id, role: 'admin', is_allowlisted: 1 };
        await logAdminAction(env, mockSession, 'admin_login', null, {
            email: user.email,
            ip_address: clientIP,
            user_agent: userAgent
        });

        console.log(`✅ Admin login successful: ${email}`);

        return jsonResponse({
            success: true,
            message: 'Login successful',
            token: sessionToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Admin'
            },
            expires_at: expiresAt
        });

    } catch (error) {
        console.error('❌ Admin login error:', error);
        return jsonResponse({
            success: false,
            error: 'Login failed',
            details: error.message
        }, 500);
    }
}

// Handle admin logout
async function handleLogout(context) {
    const { request, env } = context;

    try {
        const authHeader = request.headers.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return jsonResponse({
                success: false,
                error: 'No session token provided'
            }, 400);
        }

        const token = authHeader.substring(7);
        const tokenHash = await hashToken(token);

        // Get session info before deletion for logging
        const session = await env.DB.prepare(`
            SELECT s.user_id, u.email, u.role
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token_hash = ? AND s.expires_at > datetime('now')
        `).bind(tokenHash).first();

        // Delete session
        await env.DB.prepare(`
            DELETE FROM sessions WHERE token_hash = ?
        `).bind(tokenHash).run();

        // Also delete from session_tokens
        await env.DB.prepare(`
            DELETE FROM session_tokens WHERE token_hash = ?
        `).bind(tokenHash).run();

        // Log admin action if session was found
        if (session) {
            const mockSession = { user_id: session.user_id, role: session.role, is_allowlisted: 1 };
            await logAdminAction(env, mockSession, 'admin_logout', null, {
                email: session.email
            });

            console.log(`✅ Admin logout successful: ${session.email}`);
        }

        return jsonResponse({
            success: true,
            message: 'Logout successful'
        });

    } catch (error) {
        console.error('❌ Admin logout error:', error);
        return jsonResponse({
            success: false,
            error: 'Logout failed',
            details: error.message
        }, 500);
    }
}

// Handle session verification
async function handleVerifySession(context) {
    const { request, env } = context;

    try {
        const authHeader = request.headers.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return jsonResponse({
                success: false,
                error: 'No session token provided'
            }, 401);
        }

        const token = authHeader.substring(7);
        const tokenHash = await hashToken(token);

        // Get session with user data
        const session = await env.DB.prepare(`
            SELECT s.user_id, s.csrf_secret, s.expires_at, s.ip_address,
                   u.email, u.role, u.is_allowlisted, u.first_name, u.last_name
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token_hash = ? AND s.expires_at > datetime('now')
        `).bind(tokenHash).first();

        if (!session) {
            return jsonResponse({
                success: false,
                error: 'Invalid or expired session'
            }, 401);
        }

        // Verify admin role and allowlist
        if (!isAdminSession(session)) {
            return jsonResponse({
                success: false,
                error: 'Access denied. Admin privileges required.'
            }, 403);
        }

        // Update last activity (optional - extend session)
        await env.DB.prepare(`
            UPDATE sessions
            SET updated_at = datetime('now')
            WHERE token_hash = ?
        `).bind(tokenHash).run();

        return jsonResponse({
            success: true,
            message: 'Session valid',
            user: {
                id: session.user_id,
                email: session.email,
                role: session.role,
                name: `${session.first_name || ''} ${session.last_name || ''}`.trim() || 'Admin'
            },
            session: {
                expires_at: session.expires_at,
                csrf_secret: session.csrf_secret
            }
        });

    } catch (error) {
        console.error('❌ Admin session verification error:', error);
        return jsonResponse({
            success: false,
            error: 'Session verification failed',
            details: error.message
        }, 500);
    }
}

// OPTIONS handler for CORS
export async function onRequestOptions(context) {
    return jsonResponse(null, 204);
}
