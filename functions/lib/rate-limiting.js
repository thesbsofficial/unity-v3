/**
 * Rate Limiting Module
 * Implements per-IP and per-account rate limiting with exponential backoff
 */

// In-memory rate limit store (ephemeral - resets on Worker restart)
const rateLimitStore = new Map();

// Rate limit configurations
const RATE_LIMITS = {
    LOGIN: {
        maxAttempts: 5,
        windowSeconds: 900, // 15 minutes
        backoffMultiplier: 2
    },
    PASSWORD_RESET: {
        maxAttempts: 3,
        windowSeconds: 3600, // 1 hour
        backoffMultiplier: 2
    },
    ADMIN: {
        maxAttempts: 10,
        windowSeconds: 300, // 5 minutes
        backoffMultiplier: 1.5
    }
};

// ==================== Rate Limiting ====================

/**
 * Check if request should be rate limited
 * @param {string} key - Rate limit key (e.g., "login:192.168.1.1" or "login:user@example.com")
 * @param {Object} config - Rate limit configuration
 * @returns {{limited: boolean, remaining: number, resetAt: number}} Rate limit status
 */
export function checkRateLimit(key, config = RATE_LIMITS.LOGIN) {
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    // No previous attempts
    if (!entry) {
        rateLimitStore.set(key, {
            attempts: 1,
            firstAttempt: now,
            windowEnd: now + (config.windowSeconds * 1000),
            backoffUntil: null
        });

        return {
            limited: false,
            remaining: config.maxAttempts - 1,
            resetAt: now + (config.windowSeconds * 1000)
        };
    }

    // Check if in backoff period
    if (entry.backoffUntil && now < entry.backoffUntil) {
        return {
            limited: true,
            remaining: 0,
            resetAt: entry.backoffUntil,
            reason: 'backoff'
        };
    }

    // Check if window has expired
    if (now > entry.windowEnd) {
        // Reset counter
        rateLimitStore.set(key, {
            attempts: 1,
            firstAttempt: now,
            windowEnd: now + (config.windowSeconds * 1000),
            backoffUntil: null
        });

        return {
            limited: false,
            remaining: config.maxAttempts - 1,
            resetAt: now + (config.windowSeconds * 1000)
        };
    }

    // Increment attempts
    entry.attempts += 1;

    // Check if limit exceeded
    if (entry.attempts > config.maxAttempts) {
        // Calculate exponential backoff
        const breachCount = entry.backoffCount || 0;
        const backoffSeconds = config.windowSeconds * Math.pow(config.backoffMultiplier, breachCount);
        const backoffUntil = now + (backoffSeconds * 1000);

        entry.backoffUntil = backoffUntil;
        entry.backoffCount = breachCount + 1;
        rateLimitStore.set(key, entry);

        return {
            limited: true,
            remaining: 0,
            resetAt: backoffUntil,
            reason: 'limit_exceeded',
            backoffSeconds
        };
    }

    // Update entry
    rateLimitStore.set(key, entry);

    return {
        limited: false,
        remaining: config.maxAttempts - entry.attempts,
        resetAt: entry.windowEnd
    };
}

/**
 * Reset rate limit for a key (called on successful auth)
 * @param {string} key - Rate limit key
 */
export function resetRateLimit(key) {
    rateLimitStore.delete(key);
}

/**
 * Check account lockout status in database
 * @param {Object} env
 * @param {number} userId
 * @returns {Promise<{locked: boolean, until: string|null}>}
 */
export async function checkAccountLockout(env, userId) {
    const user = await env.DB.prepare(`
        SELECT locked_until, failed_login_attempts 
        FROM users 
        WHERE id = ?
    `).bind(userId).first();

    if (!user) {
        return { locked: false, until: null };
    }

    if (user.locked_until) {
        const lockedUntil = new Date(user.locked_until);
        if (lockedUntil > new Date()) {
            return {
                locked: true,
                until: user.locked_until
            };
        }
    }

    return { locked: false, until: null };
}

/**
 * Increment failed login attempts for user
 * @param {Object} env
 * @param {number} userId
 * @param {number} maxAttempts - Max attempts before lockout (default 5)
 */
export async function incrementFailedLoginAttempts(env, userId, maxAttempts = 5) {
    const user = await env.DB.prepare(`
        SELECT failed_login_attempts FROM users WHERE id = ?
    `).bind(userId).first();

    const attempts = (user?.failed_login_attempts || 0) + 1;

    // Lock account if max attempts reached
    if (attempts >= maxAttempts) {
        const lockDuration = 15 * 60 * 1000; // 15 minutes
        const lockedUntil = new Date(Date.now() + lockDuration).toISOString();

        await env.DB.prepare(`
            UPDATE users 
            SET failed_login_attempts = ?, 
                locked_until = ? 
            WHERE id = ?
        `).bind(attempts, lockedUntil, userId).run();
    } else {
        await env.DB.prepare(`
            UPDATE users 
            SET failed_login_attempts = ? 
            WHERE id = ?
        `).bind(attempts, userId).run();
    }
}

/**
 * Reset failed login attempts for user (called on successful login)
 * @param {Object} env
 * @param {number} userId
 */
export async function resetFailedLoginAttempts(env, userId) {
    await env.DB.prepare(`
        UPDATE users 
        SET failed_login_attempts = 0, 
            locked_until = NULL 
        WHERE id = ?
    `).bind(userId).run();
}

/**
 * Generate rate limit key for login attempts
 * @param {string} ipAddress - Client IP
 * @param {string} identifier - Username/email/handle
 * @returns {string[]} Array of rate limit keys to check
 */
export function generateLoginRateLimitKeys(ipAddress, identifier) {
    const keys = [];

    if (ipAddress) {
        keys.push(`login:ip:${ipAddress}`);
    }

    if (identifier) {
        const normalized = identifier.toLowerCase().trim();
        keys.push(`login:user:${normalized}`);
    }

    return keys;
}

/**
 * Generate rate limit key for admin endpoints
 * @param {string} ipAddress - Client IP
 * @param {number} userId - User ID
 * @returns {string} Rate limit key
 */
export function generateAdminRateLimitKey(ipAddress, userId) {
    return `admin:${userId}:${ipAddress}`;
}

/**
 * Generate rate limit key for password reset
 * @param {string} ipAddress - Client IP
 * @param {string} email - Email address
 * @returns {string[]} Array of rate limit keys to check
 */
export function generatePasswordResetKeys(ipAddress, email) {
    const keys = [];

    if (ipAddress) {
        keys.push(`reset:ip:${ipAddress}`);
    }

    if (email) {
        const normalized = email.toLowerCase().trim();
        keys.push(`reset:email:${normalized}`);
    }

    return keys;
}

/**
 * Check multiple rate limit keys (returns first limited key)
 * @param {string[]} keys - Array of rate limit keys
 * @param {Object} config - Rate limit configuration
 * @returns {{limited: boolean, key: string|null, remaining: number, resetAt: number}}
 */
export function checkMultipleRateLimits(keys, config) {
    for (const key of keys) {
        const result = checkRateLimit(key, config);
        if (result.limited) {
            return { ...result, key };
        }
    }

    // Return result from last key (or first if empty)
    const lastKey = keys[keys.length - 1] || 'unknown';
    return { ...checkRateLimit(lastKey, config), key: null };
}

/**
 * Reset multiple rate limit keys
 * @param {string[]} keys - Array of rate limit keys
 */
export function resetMultipleRateLimits(keys) {
    for (const key of keys) {
        resetRateLimit(key);
    }
}

/**
 * Clean up expired rate limit entries (call periodically)
 */
export function cleanupRateLimitStore() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of rateLimitStore.entries()) {
        // Remove if window expired and no active backoff
        if (entry.windowEnd < now && (!entry.backoffUntil || entry.backoffUntil < now)) {
            rateLimitStore.delete(key);
            cleaned++;
        }
    }

    return cleaned;
}

// ==================== Exports ====================

export const RATE_LIMIT_CONFIGS = RATE_LIMITS;

export const RATE_LIMIT_CONSTANTS = {
    MAX_LOGIN_ATTEMPTS: RATE_LIMITS.LOGIN.maxAttempts,
    LOGIN_WINDOW_SECONDS: RATE_LIMITS.LOGIN.windowSeconds,
    MAX_RESET_ATTEMPTS: RATE_LIMITS.PASSWORD_RESET.maxAttempts,
    RESET_WINDOW_SECONDS: RATE_LIMITS.PASSWORD_RESET.windowSeconds,
    MAX_ADMIN_ATTEMPTS: RATE_LIMITS.ADMIN.maxAttempts,
    ADMIN_WINDOW_SECONDS: RATE_LIMITS.ADMIN.windowSeconds
};
