// Send Welcome Email to Admin
const RESEND_API_KEY = 're_HMira9oK_PyHLikiZRpFuWFSCgsCCZbRX';
const email = 'fredbademosi1@icloud.com';
const name = 'Fred';

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
            <h1 style="color: #FFD700; font-size: 48px; font-weight: 900; margin: 0; text-shadow: 0 0 30px rgba(255, 215, 0, 0.5);">SBS</h1>
            <p style="color: #FFD700; margin: 12px 0 0 0; font-weight: 700; letter-spacing: 3px; font-size: 16px;">DUBLIN STREETWEAR</p>
        </div>
        
        <!-- Main Content -->
        <div style="background: rgba(26, 26, 26, 0.9); backdrop-filter: blur(10px); border: 2px solid rgba(255, 215, 0, 0.3); border-radius: 20px; padding: 50px 40px; box-shadow: 0 25px 70px rgba(0, 0, 0, 0.7);">
            <div style="text-align: center; margin-bottom: 30px;">
                <span style="font-size: 60px;">👑</span>
            </div>
            
            <h2 style="color: #FFD700; font-size: 32px; margin: 0 0 25px 0; font-weight: 900; text-align: center; text-transform: uppercase; letter-spacing: 2px;">Welcome, Boss! 🚀</h2>
            
            <p style="color: #ffffff; font-size: 18px; line-height: 1.8; margin: 0 0 25px 0; text-align: center;">
                Your <strong style="color: #FFD700;">ADMIN</strong> account is now active!
            </p>
            
            <div style="background: rgba(255, 215, 0, 0.1); border-left: 4px solid #FFD700; border-radius: 12px; padding: 25px; margin: 30px 0;">
                <p style="color: #FFD700; font-size: 16px; margin: 0 0 15px 0; font-weight: 700;">
                    🔑 Your Login Credentials:
                </p>
                <div style="background: rgba(0, 0, 0, 0.5); border-radius: 8px; padding: 20px; margin: 15px 0;">
                    <p style="color: #ffffff; font-size: 15px; margin: 0 0 10px 0;">
                        <strong style="color: #FFD700;">URL:</strong> <a href="https://main.unity-v3.pages.dev/login" style="color: #FFD700; text-decoration: none;">main.unity-v3.pages.dev/login</a>
                    </p>
                    <p style="color: #ffffff; font-size: 15px; margin: 0 0 10px 0;">
                        <strong style="color: #FFD700;">Username:</strong> <code style="background: rgba(255, 215, 0, 0.2); padding: 4px 8px; border-radius: 4px; color: #FFD700;">ADMIN</code>
                    </p>
                    <p style="color: #ffffff; font-size: 15px; margin: 0;">
                        <strong style="color: #FFD700;">Password:</strong> <code style="background: rgba(255, 215, 0, 0.2); padding: 4px 8px; border-radius: 4px; color: #FFD700;">IAMADMIN</code>
                    </p>
                </div>
            </div>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 40px 0;">
                <a href="https://main.unity-v3.pages.dev/login" 
                   style="display: inline-block; background: linear-gradient(135deg, #FFD700 0%, #FFC700 100%); color: #000000; padding: 20px 50px; border-radius: 35px; text-decoration: none; font-weight: 900; font-size: 18px; letter-spacing: 2px; box-shadow: 0 15px 40px rgba(255, 215, 0, 0.5); text-transform: uppercase;">
                    🚀 LOGIN NOW
                </a>
            </div>
            
            <div style="background: rgba(255, 215, 0, 0.05); border-radius: 12px; padding: 25px; margin: 30px 0;">
                <p style="color: #FFD700; font-size: 16px; margin: 0 0 15px 0; font-weight: 700;">
                    👑 Admin Powers Unlocked:
                </p>
                <ul style="color: #ffffff; font-size: 15px; line-height: 2; margin: 0; padding-left: 20px;">
                    <li>📦 <strong>Inventory Management</strong> - Upload & manage products</li>
                    <li>📊 <strong>Full Dashboard</strong> - All orders & submissions</li>
                    <li>👥 <strong>User Management</strong> - View & manage users</li>
                    <li>✅ <strong>Order Processing</strong> - Approve sell submissions</li>
                    <li>⚡ <strong>Admin Panel</strong> - Complete system control</li>
                </ul>
            </div>
            
            <div style="border-top: 2px solid rgba(255, 215, 0, 0.2); margin-top: 35px; padding-top: 25px; text-align: center;">
                <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 0 0 15px 0;">
                    🔐 <strong>Security Tip:</strong> Change your password after first login
                </p>
                <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 0;">
                    💡 Your email is verified and ready to go!
                </p>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px; color: #666666; font-size: 14px; line-height: 1.8;">
            <p style="margin: 0 0 8px 0; font-weight: 700; color: #FFD700; font-size: 16px;">SBS UNITY V3</p>
            <p style="margin: 0 0 4px 0;">Dublin's Premier Streetwear Marketplace</p>
            <p style="margin: 0;">📍 Same-Day Dublin Delivery | 🔥 Authenticated Items | 👑 Admin Dashboard</p>
        </div>
    </div>
</body>
</html>
`;

const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        from: 'SBS Team <noreply@thesbsofficial.com>',
        to: [email],
        subject: '👑 Your SBS Admin Account is Ready! Login Now 🚀',
        html: html,
    }),
});

if (!response.ok) {
    const error = await response.text();
    console.error(`Error: ${response.status} - ${error}`);
} else {
    const result = await response.json();
    console.log('✅ Admin welcome email sent successfully!');
    console.log('Email ID:', result.id);
}
