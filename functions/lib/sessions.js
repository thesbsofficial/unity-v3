/**
 * Session Management Module
 * Handles session CRUD operations, cookie generation, and validation
 */

import { generateSecureToken, hashToken } from './security.js';

// Cached session column metadata (refresh every 5 minutes)
let cachedSessionColumns = null;
let cachedSessionColumnsFetchedAt = 0;

const SESSION_SCHEMA_CACHE_TTL_MS = 5 * 60 * 1000;

async function getSessionColumns(env) {
    const now = Date.now();
    if (cachedSessionColumns && (now - cachedSessionColumnsFetchedAt) < SESSION_SCHEMA_CACHE_TTL_MS) {
        return cachedSessionColumns;
    }

    try {
        const result = await env.DB.prepare(`PRAGMA table_info('sessions')`).all();
        cachedSessionColumns = new Set((result?.results || []).map(col => col.name));
    } catch (error) {
        console.error('Failed to read sessions schema:', error);
        cachedSessionColumns = new Set();
    }

    cachedSessionColumnsFetchedAt = now;
    return cachedSessionColumns;
}

function hasColumn(columns, name) {
    return columns?.has?.(name);
}

function buildSessionQuery(columns, predicate) {
    const selectParts = [
        's.id AS session_id',
        's.user_id'
    ];

    if (hasColumn(columns, 'token')) {
        selectParts.push('s.token AS session_token');
    } else {
        selectParts.push('NULL AS session_token');
    }

    if (hasColumn(columns, 'csrf_secret')) {
        selectParts.push('s.csrf_secret');
    } else {
        selectParts.push('NULL AS csrf_secret');
    }

    if (hasColumn(columns, 'expires_at')) {
        selectParts.push('s.expires_at');
    } else {
        selectParts.push('NULL AS expires_at');
    }

    if (hasColumn(columns, 'invalidated_at')) {
        selectParts.push('s.invalidated_at');
    } else {
        selectParts.push('NULL AS invalidated_at');
    }

    if (hasColumn(columns, 'ip_address')) {
        selectParts.push('s.ip_address');
    } else {
        selectParts.push('NULL AS ip_address');
    }

    if (hasColumn(columns, 'user_agent')) {
        selectParts.push('s.user_agent');
    } else {
        selectParts.push('NULL AS user_agent');
    }

    if (hasColumn(columns, 'last_seen_at')) {
        selectParts.push('s.last_seen_at');
    } else {
        selectParts.push('NULL AS last_seen_at');
    }

    const selectSql = `SELECT ${selectParts.join(', ')} FROM sessions s`;

    const whereParts = [];
    if (hasColumn(columns, 'expires_at')) {
        whereParts.push(`s.expires_at > datetime('now')`);
    }
    if (hasColumn(columns, 'invalidated_at')) {
        whereParts.push('(s.invalidated_at IS NULL OR s.invalidated_at = "")');
    }
    whereParts.push(predicate);

    const whereSql = `WHERE ${whereParts.join(' AND ')}`;
    const orderSql = hasColumn(columns, 'created_at') ? ' ORDER BY s.created_at DESC' : '';

    return `${selectSql} ${whereSql}${orderSql} LIMIT 1`;
}

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
    const sessionToken = generateSecureToken(32);
    const columns = await getSessionColumns(env);
    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();

    const useHashedToken = hasColumn(columns, 'token_hash');
    const useCsrfSecretColumn = hasColumn(columns, 'csrf_secret');
    const trackLastSeen = hasColumn(columns, 'last_seen_at');

    const csrfSecret = useCsrfSecretColumn ? generateSecureToken(32) : sessionToken;
    const storedToken = useHashedToken ? await hashToken(sessionToken) : sessionToken;
    const storedCsrfSecret = useCsrfSecretColumn ? csrfSecret : null;

    const insertColumns = ['user_id'];
    const insertValues = [userId];

    insertColumns.push(useHashedToken ? 'token_hash' : 'token');
    insertValues.push(storedToken);

    if (useCsrfSecretColumn) {
        insertColumns.push('csrf_secret');
        insertValues.push(storedCsrfSecret);
    }

    if (hasColumn(columns, 'expires_at')) {
        insertColumns.push('expires_at');
        insertValues.push(expiresAt);
    }

    if (hasColumn(columns, 'ip_address')) {
        insertColumns.push('ip_address');
        insertValues.push(ipAddress);
    }

    if (hasColumn(columns, 'user_agent')) {
        insertColumns.push('user_agent');
        insertValues.push(userAgent);
    }

    if (trackLastSeen) {
        insertColumns.push('last_seen_at');
        insertValues.push(new Date().toISOString());
    }

    const placeholders = insertColumns.map(() => '?').join(', ');

    await env.DB.prepare(`
        INSERT INTO sessions (${insertColumns.join(', ')})
        VALUES (${placeholders})
    `).bind(...insertValues).run();

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

    const columns = await getSessionColumns(env);
    let sessionRow = null;

    if (hasColumn(columns, 'token_hash')) {
        try {
            const query = buildSessionQuery(columns, 's.token_hash = ?');
            const hashedToken = await hashToken(token);
            sessionRow = await env.DB.prepare(query).bind(hashedToken).first();
        } catch (error) {
            console.error('Hashed session lookup failed:', error);
        }
    }

    if (!sessionRow && hasColumn(columns, 'token')) {
        try {
            const query = buildSessionQuery(columns, 's.token = ?');
            sessionRow = await env.DB.prepare(query).bind(token).first();
        } catch (error) {
            console.error('Plain session lookup failed:', error);
        }
    }

    if (!sessionRow) return null;

    const user = await env.DB.prepare(`SELECT * FROM users WHERE id = ?`).bind(sessionRow.user_id).first();
    if (!user) return null;

    let allowlisted = null;
    try {
        const allowRow = await env.DB.prepare(`SELECT user_id FROM admin_allowlist WHERE user_id = ?`).bind(sessionRow.user_id).first();
        allowlisted = allowRow?.user_id ?? null;
    } catch (error) {
        // admin_allowlist table might not exist in some environments
        allowlisted = null;
    }

    if (sessionRow.locked_until) {
        const lockedUntil = new Date(sessionRow.locked_until);
        if (!Number.isNaN(lockedUntil.getTime()) && lockedUntil > new Date()) {
            return null;
        }
    }

    if (hasColumn(columns, 'last_seen_at')) {
        try {
            await env.DB.prepare(`
                UPDATE sessions
                SET last_seen_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).bind(sessionRow.session_id).run();
        } catch (error) {
            console.warn('Unable to update last_seen_at:', error);
        }
    }

    const sessionData = {
        session_id: sessionRow.session_id,
        user_id: sessionRow.user_id,
        csrf_secret: sessionRow.csrf_secret || sessionRow.session_token || token,
        expires_at: sessionRow.expires_at || null,
        invalidated_at: sessionRow.invalidated_at || null,
        ip_address: sessionRow.ip_address || null,
        user_agent: sessionRow.user_agent || null,
        last_seen_at: sessionRow.last_seen_at || null,
        social_handle: user.social_handle || user.username || user.instagram_handle || null,
        email: user.email || null,
        phone: user.phone || user.contact_phone || null,
        instagram: user.instagram || user.instagram_handle || null,
        snapchat: user.snapchat || user.snapchat_handle || null,
        preferred_contact: user.preferred_contact || user.preferred_contact_method || 'email',
        first_name: user.first_name || null,
        last_name: user.last_name || null,
        role: user.role || (user.is_admin ? 'admin' : 'customer'),
        totp_secret: user.totp_secret || null,
        email_verified_at: user.email_verified_at || (user.email_verified === 1 ? user.updated_at : null) || null,
        email_verification_required: user.email_verification_required ?? null,
        locked_until: user.locked_until || null,
        is_allowlisted: allowlisted
    };

    return sessionData;
}

/**
 * Invalidate single session
 * @param {Object} env
 * @param {number} sessionId
 */
export async function invalidateSession(env, sessionId) {
    const columns = await getSessionColumns(env);

    if (hasColumn(columns, 'invalidated_at')) {
        await env.DB.prepare(`
            UPDATE sessions
            SET invalidated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).bind(sessionId).run();
    } else {
        await env.DB.prepare(`
            DELETE FROM sessions
            WHERE id = ?
        `).bind(sessionId).run();
    }
}

/**
 * Invalidate all sessions for a user
 * @param {Object} env
 * @param {number} userId
 */
export async function invalidateSessionsForUser(env, userId) {
    const columns = await getSessionColumns(env);

    if (hasColumn(columns, 'invalidated_at')) {
        await env.DB.prepare(`
            UPDATE sessions
            SET invalidated_at = CURRENT_TIMESTAMP
            WHERE user_id = ? AND invalidated_at IS NULL
        `).bind(userId).run();
    } else {
        await env.DB.prepare(`
            DELETE FROM sessions
            WHERE user_id = ?
        `).bind(userId).run();
    }
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
