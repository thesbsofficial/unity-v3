/**
 * Session Management Module
 * Handles session CRUD operations, cookie generation, and validation
 */

import { generateSecureToken, hashToken } from './security.js';

// Constants
const SESSION_COOKIE_NAME = 'sbs_session';
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

// ==================== Session Creation ====================

/**
 * Create new session in database
 * @param {Object} env - Cloudflare environment (with DB binding)
 * @param {number} userId - User ID
 * @param {string} ipAddress - Client IP address
 * @param {string} userAgent - Client user agent
 * @returns {Promise<{token: string, csrfToken: string}>}
 */
export async function createSession(env, userId, ipAddress = null, userAgent = null) {
    // Generate session token and CSRF secret
    const sessionToken = generateSecureToken(32); // 256-bit
    const csrfSecret = generateSecureToken(32); // 256-bit

    // Hash tokens before storage
    const sessionTokenHash = await hashToken(sessionToken);
    const csrfSecretHash = await hashToken(csrfSecret);

    // Calculate expiry
    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();

    // Insert session into database
    await env.DB.prepare(`
        INSERT INTO sessions (
            user_id, token_hash, csrf_secret, expires_at, 
            ip_address, user_agent, last_seen_at
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
        userId,
        sessionTokenHash,
        csrfSecretHash,
        expiresAt,
        ipAddress,
        userAgent
    ).run();

    return {
        token: sessionToken,
        csrfToken: csrfSecret
    };
}

/**
 * Validate session token and return session data with user info
 * @param {Object} env - Cloudflare environment
 * @param {string} token - Plain text session token from cookie
 * @returns {Promise<Object|null>} Session object with user data, or null if invalid
 */
export async function validateSession(env, token) {
    if (!token) return null;

    const tokenHash = await hashToken(token);

    const result = await env.DB.prepare(`
        SELECT 
            s.id as session_id,
            s.user_id,
            s.csrf_secret,
            s.expires_at,
            s.invalidated_at,
            s.ip_address,
            s.user_agent,
            u.social_handle,
            u.email,
            u.phone,
            u.instagram,
            u.snapchat,
            u.preferred_contact,
            u.first_name,
            u.last_name,
            u.role,
            u.totp_secret,
            u.email_verified_at,
            u.email_verification_required,
            u.locked_until,
            a.user_id as is_allowlisted
        FROM sessions s
        INNER JOIN users u ON s.user_id = u.id
        LEFT JOIN admin_allowlist a ON u.id = a.user_id
        WHERE s.token_hash = ?
            AND s.expires_at > datetime('now')
            AND s.invalidated_at IS NULL
    `).bind(tokenHash).first();

    if (!result) return null;

    // Check if account is locked
    if (result.locked_until) {
        const lockedUntil = new Date(result.locked_until);
        if (lockedUntil > new Date()) {
            return null; // Account is locked
        }
    }

    // Update last_seen_at
    await env.DB.prepare(`
        UPDATE sessions 
        SET last_seen_at = CURRENT_TIMESTAMP 
        WHERE id = ?
    `).bind(result.session_id).run();

    return result;
}

/**
 * Invalidate single session
 * @param {Object} env
 * @param {number} sessionId
 */
export async function invalidateSession(env, sessionId) {
    await env.DB.prepare(`
        UPDATE sessions 
        SET invalidated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
    `).bind(sessionId).run();
}

/**
 * Invalidate all sessions for a user
 * @param {Object} env
 * @param {number} userId
 */
export async function invalidateSessionsForUser(env, userId) {
    await env.DB.prepare(`
        UPDATE sessions 
        SET invalidated_at = CURRENT_TIMESTAMP 
        WHERE user_id = ? AND invalidated_at IS NULL
    `).bind(userId).run();
}

/**
 * Rotate session (invalidate old, create new)
 * @param {Object} env
 * @param {number} oldSessionId
 * @param {number} userId
 * @param {string} ipAddress
 * @param {string} userAgent
 * @returns {Promise<{token: string, csrfToken: string}>}
 */
export async function rotateSession(env, oldSessionId, userId, ipAddress, userAgent) {
    // Invalidate old session
    await invalidateSession(env, oldSessionId);

    // Create new session
    return await createSession(env, userId, ipAddress, userAgent);
}

// ==================== Cookie Helpers ====================

/**
 * Generate Set-Cookie header for session
 * @param {string} token - Session token
 * @param {number} maxAgeSeconds - Max age in seconds (default 30 days)
 * @returns {string} Set-Cookie header value
 */
export function setAuthCookie(token, maxAgeSeconds = SESSION_TTL_SECONDS) {
    const cookieValue = `${SESSION_COOKIE_NAME}=${token}`;
    const attributes = [
        'HttpOnly',
        'Secure',
        'SameSite=Strict',
        'Path=/',
        `Max-Age=${maxAgeSeconds}`
    ];

    return `${cookieValue}; ${attributes.join('; ')}`;
}

/**
 * Generate Set-Cookie header to clear session cookie
 * @returns {string} Set-Cookie header value
 */
export function clearAuthCookie() {
    return `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

/**
 * Parse cookies from Cookie header
 * @param {string} cookieHeader - Cookie header value
 * @returns {Object} Object with cookie name-value pairs
 */
export function parseCookies(cookieHeader) {
    if (!cookieHeader) return {};

    return cookieHeader.split(';').reduce((cookies, cookie) => {
        const [name, ...rest] = cookie.trim().split('=');
        if (name) {
            cookies[name] = rest.join('=');
        }
        return cookies;
    }, {});
}

/**
 * Extract session token from request
 * @param {Request} request - Fetch API Request object
 * @returns {string|null} Session token or null
 */
export function extractSessionToken(request) {
    const cookieHeader = request.headers.get('Cookie');
    const cookies = parseCookies(cookieHeader);
    return cookies[SESSION_COOKIE_NAME] || null;
}

// ==================== User Sanitization ====================

/**
 * Remove sensitive fields from user object before sending to client
 * @param {Object} user - User object from database
 * @returns {Object} Sanitized user object
 */
export function sanitizeUser(user) {
    const {
        password_hash,
        password_salt,
        password_hash_type,
        password_iterations,
        totp_secret,
        totp_recovery_codes,
        failed_login_attempts,
        locked_until,
        ...safeUser
    } = user;

    return safeUser;
}

// ==================== Exports ====================

export const SESSION_CONSTANTS = {
    SESSION_COOKIE_NAME,
    SESSION_TTL_SECONDS
};
