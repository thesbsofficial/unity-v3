/**
 * Email Token Management Utilities
 * 
 * NOTE: Email sending is handled by email-service.ts with beautiful SBS templates
 * This file only manages verification tokens in the database
 */

const enc = new TextEncoder();

// Generate secure random token
function generateToken() {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Hash token for storage (same security as passwords)
async function hashToken(token) {
    const data = enc.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Create verification token and store in database
 */
export async function createVerificationToken(db, userId) {
    const token = generateToken();
    const tokenHash = await hashToken(token);

    // Token expires in 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await db.prepare(
        `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
         VALUES (?, ?, ?)`
    ).bind(userId, tokenHash, expiresAt).run();

    return token; // Return plain token (not hash) to send in email
}

/**
 * Verify token and mark email as verified
 */
export async function verifyEmailToken(db, token) {
    const tokenHash = await hashToken(token);

    // Find token
    const tokenRecord = await db.prepare(
        `SELECT * FROM email_verification_tokens 
         WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime('now')`
    ).bind(tokenHash).first();

    if (!tokenRecord) {
        return { success: false, error: 'Invalid or expired token' };
    }

    // Mark token as used
    await db.prepare(
        `UPDATE email_verification_tokens SET used_at = datetime('now')
         WHERE id = ?`
    ).bind(tokenRecord.id).run();

    // Mark email as verified
    await db.prepare(
        `UPDATE users SET email_verified = 1
         WHERE id = ?`
    ).bind(tokenRecord.user_id).run();

    // Get updated user
    const user = await db.prepare(
        `SELECT id, social_handle, email, first_name, last_name, email_verified
         FROM users WHERE id = ?`
    ).bind(tokenRecord.user_id).first();

    return { success: true, user };
}

/**
 * Cleanup expired tokens (run periodically)
 */
export async function cleanupExpiredTokens(db) {
    await db.prepare(
        `DELETE FROM email_verification_tokens 
         WHERE expires_at < datetime('now', '-7 days')`
    ).run();
}
