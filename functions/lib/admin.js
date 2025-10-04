/**
 * Admin Module - RBAC, Audit Logging, and Diagnostics
 * Handles admin role checking, action logging, and system health checks
 */

import { generateTotpSecret, generateRecoveryCodes, verifyTotp, hashToken } from './security.js';

// ==================== Admin Role Checking ====================

/**
 * Check if session belongs to an admin user
 * @param {Object} session - Session object with user data
 * @returns {boolean}
 */
export function isAdminSession(session) {
    return session?.role === 'admin' && session?.is_allowlisted === 1;
}

/**
 * Verify admin authentication from request headers
 * @param {Request} request - HTTP request object
 * @param {Object} env - Cloudflare environment with DB
 * @returns {Promise<Object|null>} Session object if valid, null if invalid
 */
export async function verifyAdminAuth(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.substring(7);

    // Hash token for database lookup
    const tokenHash = await hashToken(token);

    // Verify admin session using unified sessions table
    const session = await env.DB.prepare(`
        SELECT s.user_id, s.csrf_secret, s.expires_at,
               u.email, u.role, u.is_allowlisted, u.first_name, u.last_name
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token_hash = ? AND s.expires_at > datetime('now')
        AND u.role = 'admin' AND u.is_allowlisted = 1
    `).bind(tokenHash).first();

    return session;
}

/**
 * Check if user should be auto-promoted to admin
 * @param {Object} env - Cloudflare environment (with ADMIN_ALLOWLIST_HANDLES)
 * @param {string} socialHandle - User's social handle (normalized)
 * @returns {boolean}
 */
export function shouldElevateToAdmin(env, socialHandle) {
    const allowlistHandles = env.ADMIN_ALLOWLIST_HANDLES?.split(',')
        .map(h => h.trim().toLowerCase().replace(/^@/, ''))
        .filter(Boolean) || [];

    const normalized = socialHandle.toLowerCase().replace(/^@/, '');
    return allowlistHandles.includes(normalized);
}

/**
 * Promote user to admin role
 * @param {Object} env
 * @param {number} userId
 */
export async function promoteToAdmin(env, userId) {
    // Set role to admin
    await env.DB.prepare(`
        UPDATE users
        SET role = 'admin'
        WHERE id = ?
    `).bind(userId).run();

    // Add to admin allowlist
    await env.DB.prepare(`
        INSERT OR IGNORE INTO admin_allowlist (user_id, notes)
        VALUES (?, 'Auto-promoted via ADMIN_ALLOWLIST_HANDLES')
    `).bind(userId).run();
}

// ==================== Audit Logging ====================

/**
 * Log admin action to audit table
 * @param {Object} env
 * @param {Object} session - Session object with user_id
 * @param {string} action - Action name (e.g., 'admin_menu_view', 'admin_board07')
 * @param {string} resource - Resource affected (optional)
 * @param {Object} metadata - Additional context (optional, will be JSON stringified)
 * @param {string} ipAddress - Client IP address (optional)
 */
export async function logAdminAction(env, session, action, resource = null, metadata = null, ipAddress = null) {
    if (!session?.user_id) return;

    await env.DB.prepare(`
        INSERT INTO admin_audit_logs (
            user_id, action, resource, metadata_json, ip_address
        ) VALUES (?, ?, ?, ?, ?)
    `).bind(
        session.user_id,
        action,
        resource,
        metadata ? JSON.stringify(metadata) : null,
        ipAddress
    ).run();
}

// ==================== Admin Menu HTML ====================

/**
 * Generate admin menu HTML snippet
 * @returns {string} HTML content
 */
export function generateAdminMenuHTML() {
    return `
<section class="admin-menu" style="background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); padding: 1.5rem; border-radius: 12px; margin-bottom: 2rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <h2 style="color: #000; margin: 0 0 1rem 0; font-size: 1.5rem; font-weight: 700;">🛡️ Admin Controls</h2>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <button id="runBoard07" type="button" style="background: #000; color: #FFD700; border: 2px solid #FFD700; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">
            🔍 Run Diagnostics (Board-07)
        </button>
        <button id="setupTOTP" type="button" style="background: #000; color: #FFD700; border: 2px solid #FFD700; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">
            🔐 Setup 2FA/TOTP
        </button>
        <button id="viewAuditLogs" type="button" style="background: #000; color: #FFD700; border: 2px solid #FFD700; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">
            📋 View Audit Logs
        </button>
    </div>
</section>
    `.trim();
}

// ==================== TOTP Setup ====================

/**
 * Generate TOTP setup data for admin
 * @param {Object} env
 * @param {Object} session - Session object with user_id, email, social_handle
 * @returns {Promise<{secret: string, recovery_codes: string[], otpauth_url: string}>}
 */
export async function setupTotpForAdmin(env, session) {
    // Check if TOTP already configured
    const existingUser = await env.DB.prepare(`
        SELECT totp_secret FROM users WHERE id = ?
    `).bind(session.user_id).first();

    if (existingUser?.totp_secret) {
        throw new Error('TOTP is already configured for this account');
    }

    // Generate secret and recovery codes
    const secret = generateTotpSecret();
    const recoveryCodes = generateRecoveryCodes(8);

    // Store in database
    await env.DB.prepare(`
        UPDATE users
        SET totp_secret = ?, totp_recovery_codes = ?
        WHERE id = ?
    `).bind(
        secret,
        JSON.stringify(recoveryCodes),
        session.user_id
    ).run();

    // Generate otpauth:// URL for QR code
    const identifier = encodeURIComponent(
        session.email || session.social_handle || `user-${session.user_id}`
    );
    const issuer = encodeURIComponent('SBS Unity');
    const otpauthUrl = `otpauth://totp/${issuer}:${identifier}?secret=${secret}&issuer=${issuer}&algorithm=SHA256&digits=6&period=30`;

    return {
        secret,
        recovery_codes: recoveryCodes,
        otpauth_url: otpauthUrl
    };
}

// ==================== Admin Diagnostics (Board-07) ====================

/**
 * Run system diagnostics and health checks
 * @param {Object} env
 * @returns {Promise<Array>} Array of check results
 */
export async function runAdminDiagnostics(env) {
    const checks = [];

    // Check 1: Verify all required tables exist
    try {
        const tables = await env.DB.prepare(`
            SELECT name FROM sqlite_master
            WHERE type='table'
            ORDER BY name
        `).all();

        const tableNames = tables.results.map(t => t.name);
        const requiredTables = [
            'users',
            'sessions',
            'orders',
            'admin_allowlist',
            'admin_audit_logs',
            'password_reset_tokens',
            'email_verification_tokens'
        ];

        const missingTables = requiredTables.filter(t => !tableNames.includes(t));

        checks.push({
            name: 'tables_present',
            passed: missingTables.length === 0,
            details: tableNames,
            missing: missingTables
        });
    } catch (error) {
        checks.push({
            name: 'tables_present',
            passed: false,
            error: error.message
        });
    }

    // Check 2: Verify users table has required columns
    try {
        const userColumns = await env.DB.prepare(`
            PRAGMA table_info('users')
        `).all();

        const columnNames = userColumns.results.map(c => c.name);
        const requiredColumns = [
            'id', 'social_handle', 'email', 'password_hash',
            'role', 'password_salt', 'password_hash_type',
            'totp_secret', 'email_verified_at', 'locked_until'
        ];

        const missingColumns = requiredColumns.filter(c => !columnNames.includes(c));

        checks.push({
            name: 'users_columns',
            passed: missingColumns.length === 0,
            total_columns: columnNames.length,
            missing: missingColumns
        });
    } catch (error) {
        checks.push({
            name: 'users_columns',
            passed: false,
            error: error.message
        });
    }

    // Check 3: Verify sessions table has security columns
    try {
        const sessionColumns = await env.DB.prepare(`
            PRAGMA table_info('sessions')
        `).all();

        const columnNames = sessionColumns.results.map(c => c.name);
        const requiredColumns = [
            'id', 'user_id', 'token_hash', 'csrf_secret',
            'expires_at', 'invalidated_at', 'ip_address', 'user_agent'
        ];

        const missingColumns = requiredColumns.filter(c => !columnNames.includes(c));

        checks.push({
            name: 'sessions_columns',
            passed: missingColumns.length === 0,
            total_columns: columnNames.length,
            missing: missingColumns
        });
    } catch (error) {
        checks.push({
            name: 'sessions_columns',
            passed: false,
            error: error.message
        });
    }

    // Check 4: Count admin allowlist entries
    try {
        const allowlistCount = await env.DB.prepare(`
            SELECT COUNT(*) as total FROM admin_allowlist
        `).first();

        checks.push({
            name: 'admin_allowlist',
            passed: true,
            total: allowlistCount.total
        });
    } catch (error) {
        checks.push({
            name: 'admin_allowlist',
            passed: false,
            error: error.message
        });
    }

    // Check 5: Count audit log entries (last 24 hours)
    try {
        const auditCount = await env.DB.prepare(`
            SELECT COUNT(*) as total
            FROM admin_audit_logs
            WHERE created_at > datetime('now', '-1 day')
        `).first();

        checks.push({
            name: 'audit_logs_24h',
            passed: true,
            total: auditCount.total
        });
    } catch (error) {
        checks.push({
            name: 'audit_logs_24h',
            passed: false,
            error: error.message
        });
    }

    // Check 6: Count active sessions
    try {
        const sessionCount = await env.DB.prepare(`
            SELECT COUNT(*) as total
            FROM sessions
            WHERE expires_at > datetime('now')
                AND invalidated_at IS NULL
        `).first();

        checks.push({
            name: 'active_sessions',
            passed: true,
            total: sessionCount.total
        });
    } catch (error) {
        checks.push({
            name: 'active_sessions',
            passed: false,
            error: error.message
        });
    }

    // Check 7: Verify environment variables
    const envVars = {
        ADMIN_ALLOWLIST_HANDLES: !!env.ADMIN_ALLOWLIST_HANDLES,
        ALLOWED_ORIGINS: !!env.ALLOWED_ORIGINS,
        NODE_ENV: !!env.NODE_ENV,
        DB: !!env.DB
    };

    checks.push({
        name: 'environment_variables',
        passed: envVars.DB && envVars.ADMIN_ALLOWLIST_HANDLES,
        details: envVars
    });

    return checks;
}

// ==================== Exports ====================

export const ADMIN_CONSTANTS = {
    ADMIN_ACTIONS: {
        MENU_VIEW: 'admin_menu_view',
        BOARD07: 'admin_board07',
        TOTP_SETUP: 'admin_totp_setup',
        AUDIT_LOGS_VIEW: 'admin_audit_logs_view'
    }
};
