/**
 * Simple Resend Email Wrapper for JavaScript
 * Works with the beautiful SBS email templates
 */

/**
 * Send verification email using Resend API
 */
export async function sendBeautifulVerificationEmail(apiKey, email, name, token, siteUrl) {
    const verifyUrl = `${siteUrl}/verify-email.html?token=${token}`;
    const firstName = name ? name.split(' ')[0] : 'there';

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #FFD700; font-size: 42px; font-weight: 900; margin: 0; text-shadow: 0 0 20px rgba(255, 215, 0, 0.3);">SBS</h1>
            <p style="color: #FFD700; margin: 8px 0 0 0; font-weight: 600; letter-spacing: 2px; font-size: 14px;">DUBLIN STREETWEAR</p>
        </div>
        
        <!-- Main Content -->
        <div style="background: rgba(26, 26, 26, 0.8); backdrop-filter: blur(10px); border: 2px solid rgba(255, 215, 0, 0.2); border-radius: 16px; padding: 40px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);">
            <h2 style="color: #FFD700; font-size: 28px; margin: 0 0 20px 0; font-weight: 800;">Hey ${firstName}! 👋</h2>
            
            <p style="color: #ffffff; font-size: 17px; line-height: 1.7; margin: 0 0 20px 0;">
                Welcome to the <strong style="color: #FFD700;">SBS crew</strong>! 🚀
            </p>
            
            <p style="color: #ffffff; font-size: 17px; line-height: 1.7; margin: 0 0 30px 0;">
                We're stoked to have you. Just one quick step to unlock <strong style="color: #FFD700;">early drops</strong>, <strong style="color: #FFD700;">same-day Dublin</strong> delivery, and the best streetwear deals in Ireland.
            </p>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 40px 0;">
                <a href="${verifyUrl}" 
                   style="display: inline-block; background: linear-gradient(135deg, #FFD700 0%, #FFC700 100%); color: #000000; padding: 18px 48px; border-radius: 30px; text-decoration: none; font-weight: 800; font-size: 18px; letter-spacing: 1px; box-shadow: 0 10px 30px rgba(255, 215, 0, 0.4); text-transform: uppercase; transition: all 0.3s ease;">
                    ✅ VERIFY MY EMAIL
                </a>
            </p>
            
            <div style="background: rgba(10, 10, 10, 0.6); border-left: 4px solid #FFD700; border-radius: 8px; padding: 20px; margin: 30px 0;">
                <p style="color: #FFD700; font-size: 15px; margin: 0 0 12px 0; font-weight: 600;">
                    🔗 Or copy this link:
                </p>
                <div style="background: #000000; border: 1px solid rgba(255, 215, 0, 0.3); border-radius: 8px; padding: 14px; word-break: break-all;">
                    <code style="color: #FFD700; font-size: 13px;">${verifyUrl}</code>
                </div>
            </div>
            
            <div style="border-top: 1px solid rgba(255, 215, 0, 0.2); margin-top: 32px; padding-top: 24px;">
                <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;">
                    ⏰ <strong>Link expires in 24 hours</strong> — verify soon!
                </p>
                <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 0;">
                    🔒 Didn't sign up? No worries—just ignore this email.
                </p>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px; color: #666666; font-size: 14px; line-height: 1.6;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #FFD700;">SBS</p>
            <p style="margin: 0 0 4px 0;">Dublin's Premier Streetwear Marketplace</p>
            <p style="margin: 0;">📍 Same-Day Dublin Delivery | 🔥 Authenticated Items</p>
        </div>
    </div>
</body>
</html>`;

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: 'SBS Team <noreply@thesbsofficial.com>',
            to: [email],
            subject: `Hey ${firstName}! Verify your email to unlock SBS 🚀`,
            html: html,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Resend API error: ${response.status} - ${error}`);
    }

    return response.json();
}
