/**
 * Email Utility Functions
 * Cloudflare Email Workers (via MailChannels)
 * Free email sending without external API keys
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
 * Send verification email using Cloudflare Email Workers
 * Uses MailChannels (free for Cloudflare Pages)
 */
export async function sendVerificationEmail(email, token, siteUrl) {
    const verifyUrl = `${siteUrl}/verify-email.html?token=${token}`;
    
    const emailContent = {
        personalizations: [
            {
                to: [{ email: email }],
                dkim_domain: 'thesbsofficial.com',
                dkim_selector: 'mailchannels'
            }
        ],
        from: {
            email: 'noreply@thesbsofficial.com',
            name: 'SBS Unity'
        },
        subject: '✅ Verify Your SBS Account',
        content: [
            {
                type: 'text/html',
                value: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; background: #0a0a0a; color: #ffffff;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #FFD700; font-size: 32px; font-weight: 900; margin: 0;">SBS</h1>
            <p style="color: #cccccc; margin: 8px 0 0 0;">Dublin's Premier Streetwear</p>
        </div>
        
        <!-- Main Content -->
        <div style="background: #1a1a1a; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 32px;">
            <h2 style="color: #FFD700; font-size: 24px; margin: 0 0 16px 0;">Welcome to SBS Unity! 🎉</h2>
            
            <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Thanks for signing up! Please verify your email address to activate your account and start selling or shopping.
            </p>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 32px 0;">
                <a href="${verifyUrl}" 
                   style="display: inline-block; background: #FFD700; color: #000000; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                    ✅ Verify Email Address
                </a>
            </div>
            
            <p style="color: #cccccc; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
                Or copy and paste this link into your browser:
            </p>
            <div style="background: #0a0a0a; border: 1px solid rgba(255, 215, 0, 0.2); border-radius: 8px; padding: 12px; margin: 12px 0; word-break: break-all;">
                <code style="color: #FFD700; font-size: 14px;">${verifyUrl}</code>
            </div>
            
            <p style="color: #999999; font-size: 12px; line-height: 1.6; margin: 24px 0 0 0; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 16px;">
                ⏰ This link expires in 24 hours.<br>
                🔒 If you didn't create this account, you can safely ignore this email.
            </p>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 32px; color: #666666; font-size: 14px;">
            <p style="margin: 0 0 8px 0;">SBS Unity - Dublin's Premier Streetwear</p>
            <p style="margin: 0;">📍 Dublin, Ireland</p>
        </div>
    </div>
</body>
</html>
                `
            }
        ]
    };

    try {
        const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailContent)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('MailChannels error:', errorText);
            console.error('MailChannels status:', response.status);
            throw new Error(`Email send failed: ${response.status} - ${errorText}`);
        }

        console.log('Email sent successfully via MailChannels');
        return { success: true };
    } catch (error) {
        console.error('Failed to send email:', error);
        console.error('Error details:', error.message);
        throw error; // Re-throw so we can see the actual error
    }
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
