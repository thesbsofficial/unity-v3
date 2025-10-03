// SBS Unity V3 - Beautiful Email Template Demo
// Test endpoint to showcase warm verification emails with social links

import EmailService from '../lib/email-service';

export async function onRequestPost(context: any) {
  try {
    const { request, env } = context;
    
    // Get email from request
    const formData = await request.formData();
    const email = formData.get('email');
    const templateType = formData.get('template') || 'verification';
    
    if (!email) {
      return new Response(JSON.stringify({ 
        error: 'Email address is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialize email service with Resend API key
    const emailService = new EmailService(env.RESEND_API_KEY);
    
    // Send beautiful template email
    const result = await emailService.sendTestTemplateEmail(
      email as string, 
      templateType as 'verification' | 'welcome' | 'reset'
    );

    return new Response(JSON.stringify({ 
      success: true,
      message: `🎉 Beautiful ${templateType} email sent successfully!`,
      id: result.id,
      details: {
        template: templateType,
        recipient: email,
        sentAt: new Date().toISOString(),
        features: [
          'Warm, personalized messaging',
          'SBS gold & black branding',
          'Social media integration',
          'Mobile-responsive design',
          'Instagram & Snapchat links',
          'Professional typography'
        ]
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Template demo error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to send template email',
      details: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Simple GET endpoint for testing
export async function onRequestGet() {
  return new Response(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>SBS Unity V3 - Beautiful Email Template Demo</title>
      <style>
        body { 
          font-family: 'Segoe UI', Arial, sans-serif; 
          max-width: 600px; 
          margin: 50px auto; 
          padding: 20px;
          background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
          color: #fff;
          border-radius: 16px;
        }
        .header {
          text-align: center;
          background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 30px;
        }
        form { 
          background: rgba(255, 255, 255, 0.1);
          padding: 30px; 
          border-radius: 12px; 
          backdrop-filter: blur(10px);
        }
        input, select, button { 
          display: block; 
          width: 100%; 
          margin: 15px 0; 
          padding: 12px; 
          border-radius: 8px; 
          border: 1px solid rgba(255, 215, 0, 0.3);
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          font-size: 16px;
        }
        input::placeholder {
          color: rgba(255, 255, 255, 0.7);
        }
        button { 
          background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); 
          color: #1a1a1a; 
          border: none; 
          cursor: pointer; 
          font-weight: bold;
          transition: all 0.3s ease;
        }
        button:hover { 
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(255, 215, 0, 0.3);
        }
        .features {
          background: rgba(255, 215, 0, 0.1);
          padding: 20px;
          border-radius: 8px;
          margin-top: 20px;
        }
        .features h3 {
          color: #FFD700;
          margin-top: 0;
        }
        .features ul {
          list-style: none;
          padding: 0;
        }
        .features li {
          padding: 5px 0;
          border-left: 3px solid #FFD700;
          padding-left: 15px;
          margin: 10px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎨 SBS Unity V3</h1>
        <h2>Beautiful Email Template Demo</h2>
      </div>
      
      <form method="POST">
        <label>Email Address:</label>
        <input type="email" name="email" placeholder="your-email@example.com" required>
        
        <label>Template Type:</label>
        <select name="template">
          <option value="verification">🎉 Verification Email (Warm Welcome)</option>
          <option value="welcome">🔥 Welcome Email (Family Vibes)</option>
          <option value="reset">🔒 Password Reset (Secure)</option>
        </select>
        
        <button type="submit">Send Beautiful Template Email ✨</button>
      </form>
      
      <div class="features">
        <h3>✨ Template Features</h3>
        <ul>
          <li>🎨 Warm, family-oriented messaging</li>
          <li>🏆 SBS gold & black premium branding</li>
          <li>📱 Mobile-responsive design</li>
          <li>🔗 Social media integration</li>
          <li>📸 Instagram (@thesbsofficial) links</li>
          <li>👻 Snapchat (@thesbs2.0) integration</li>
          <li>🌳 Linktree connection</li>
          <li>💫 Professional typography</li>
        </ul>
      </div>
    </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html' }
  });
}