// Beautiful SBS Unity V3 Email Templates
// Warm, professional, and engaging templates with social links

interface EmailTemplateData {
  name?: string;
  email: string;
  verifyUrl?: string;
  resetUrl?: string;
  [key: string]: any;
}

class SBSEmailTemplates {
  
  static getBaseStyles(): string {
    return `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Int             <div class="email-container">
          <div class="header">
            <img src="https://thesbsofficial.com/SBS%20(Your%20Story).png" alt="SBS Logo" class="logo-image">
            <h1 class="logo">SBS</h1>
            <p class="business-name">SwordsBuySale</p>
            <p class="tagline">The King Pre-Owned Clothing</p>
          </div>iv class="email-container">
          <div class="header">
            <h1 class="logo">SBS</h1>
            <p class="business-name">SwordsBuySale</p>
            <p class="tagline">The King Pre-Owned Clothing</p>
          </div>ht@400;600;700;900&display=swap');
        
        .email-container {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        
        .header {
          background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
          padding: 40px 30px;
          text-align: center;
          position: relative;
        }
        
        .header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="1" fill="rgba(0,0,0,0.05)"/><circle cx="80" cy="80" r="1" fill="rgba(0,0,0,0.05)"/><circle cx="40" cy="60" r="1" fill="rgba(0,0,0,0.05)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
          opacity: 0.1;
        }
        
        .logo {
          font-size: 2.5rem;
          font-weight: 900;
          color: #1a1a1a;
          margin: 0;
          letter-spacing: 2px;
          position: relative;
          z-index: 1;
        }
        
        .logo-image {
          max-width: 200px;
          height: auto;
          margin: 0 auto 15px auto;
          display: block;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
        }
        
        .business-name {
          color: #1a1a1a;
          font-size: 1.1rem;
          font-weight: 600;
          margin-top: 8px;
          opacity: 0.95;
        }
        
        .tagline {
          color: #1a1a1a;
          font-size: 1rem;
          font-weight: 600;
          margin: 8px 0 0 0;
          opacity: 0.8;
          position: relative;
          z-index: 1;
        }
        
        .content {
          background: white;
          padding: 40px 30px;
        }
        
        .greeting {
          font-size: 1.4rem;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 20px 0;
          line-height: 1.4;
        }
        
        .message {
          color: #4a5568;
          font-size: 1.05rem;
          line-height: 1.7;
          margin: 0 0 30px 0;
        }
        
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
          color: #1a1a1a;
          text-decoration: none;
          padding: 16px 32px;
          border-radius: 50px;
          font-weight: 700;
          font-size: 1.1rem;
          text-align: center;
          box-shadow: 0 8px 25px rgba(255, 215, 0, 0.4);
          transition: all 0.3s ease;
          letter-spacing: 0.5px;
        }
        
        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 35px rgba(255, 215, 0, 0.6);
        }
        
        .divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
          margin: 40px 0;
        }
        
        .social-section {
          text-align: center;
          padding: 30px;
          background: #f8f9fa;
        }
        
        .social-heading {
          font-size: 1.2rem;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 20px 0;
        }
        
        .social-links {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin: 20px 0;
          flex-wrap: wrap;
        }
        
        .social-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #1a1a1a;
          color: white;
          text-decoration: none;
          padding: 12px 20px;
          border-radius: 25px;
          font-weight: 600;
          font-size: 0.9rem;
          transition: all 0.3s ease;
        }
        
        .social-link:hover {
          background: #FFD700;
          color: #1a1a1a;
          transform: translateY(-2px);
        }
        
        .footer {
          background: #1a1a1a;
          color: #a0aec0;
          padding: 30px;
          text-align: center;
        }
        
        .footer-text {
          font-size: 0.9rem;
          line-height: 1.6;
          margin: 0 0 15px 0;
        }
        
        .unsubscribe {
          color: #718096;
          text-decoration: none;
          font-size: 0.8rem;
        }
        
        .trust-badges {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin: 20px 0;
          flex-wrap: wrap;
        }
        
        .trust-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #68d391;
          font-size: 0.85rem;
          font-weight: 600;
        }
        
        @media (max-width: 600px) {
          .email-container { margin: 10px; border-radius: 12px; }
          .header { padding: 30px 20px; }
          .content { padding: 30px 20px; }
          .social-section { padding: 25px 20px; }
          .footer { padding: 25px 20px; }
          .logo { font-size: 2rem; }
          .greeting { font-size: 1.2rem; }
          .social-links { gap: 15px; }
          .social-link { padding: 10px 16px; font-size: 0.85rem; }
        }
      </style>
    `;
  }

  static getSocialLinks(): string {
    return `
      <div class="social-section">
        <h3 class="social-heading">🔥 Connect with SBS</h3>
        <p style="color: #666; margin: 0 0 20px 0;">Follow us for the latest drops, exclusive deals, and Dublin streetwear culture!</p>
        
        <div class="social-links">
          <a href="https://instagram.com/thesbsofficial" class="social-link">
            📸 Instagram
          </a>
          <a href="https://www.snapchat.com/add/thesbs2.0" class="social-link">
            👻 Snapchat
          </a>
          <a href="https://linktr.ee/thesbsofficial" class="social-link">
            🔗 All Links
          </a>
        </div>
        
        <div class="trust-badges">
          <div class="trust-badge">✅ 100% Authentic</div>
          <div class="trust-badge">⚡ Same-Day Dublin</div>
          <div class="trust-badge">🚚 Nationwide Shipping</div>
        </div>
      </div>
    `;
  }

  static getFooter(): string {
    return `
      <div class="footer">
        <p class="footer-text">
          <strong>Swords Buy Sale</strong><br>
          King of Pre-Owned Clothing<br>
          North Dublin's No.1 Plug Since 2016 �
        </p>
        <p class="footer-text">
          📍 Swords, Dublin | 🚚 Same-day delivery available | 📦 Nationwide shipping
        </p>
        <p class="footer-text">
          Questions? DM 
          <a href="https://instagram.com/thesbsofficial" style="color: #FFD700;">@thesbsofficial</a>
        </p>
        <p style="margin: 20px 0 0 0;">
          <a href="#" class="unsubscribe">Unsubscribe</a> | 
          <a href="#" class="unsubscribe">Privacy Policy</a>
        </p>
      </div>
    `;
  }

  static generateVerificationEmail(data: EmailTemplateData): string {
    const { name, email, verifyUrl } = data;
    const firstName = name ? name.split(' ')[0] : 'Boss';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify your email to unlock SBS — early drops & same-day Dublin 🚀</title>
        <meta name="description" content="Tap verify to join SwordsBuySale — exclusive drops, instant offers, nationwide shipping.">
        ${this.getBaseStyles()}
      </head>
      <body style="margin: 0; padding: 20px; background: #f0f2f5;">
        <div class="email-container">
          <div class="header">
            <img src="https://thesbsofficial.com/SBS%20(Your%20Story).png" alt="SBS Logo" class="logo-image">
            <h1 class="logo">SBS</h1>
            <p class="business-name">SwordsBuySale</p>
            <p class="tagline">The King Pre-Owned Clothing</p>
          </div>
          
          <div class="content">
            <h2 class="greeting">Hey ${firstName}, welcome to the family �</h2>
            
            <p class="message">
              You're officially part of <strong>SBS (SwordsBuySale)</strong>. Verify your email to activate your account, boss.
            </p>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${verifyUrl}" class="cta-button">
                ✅ Verify My Account
              </a>
            </div>
            
            <p class="message">
              Once verified, you'll get:
            </p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <ul style="margin: 0; padding-left: 20px; color: #4a5568;">
                <li style="margin: 8px 0;">🛒 <strong>Early access to new drops</strong></li>
                <li style="margin: 8px 0;">💰 <strong>Sell to SBS for instant cash offers</strong></li>
                <li style="margin: 8px 0;">⚡ <strong>Same-day Dublin delivery</strong> (order by 6PM)</li>
                <li style="margin: 8px 0;">📦 <strong>Nationwide shipping</strong></li>
                <li style="margin: 8px 0;">🔥 <strong>Member-only deals & bundles</strong></li>
              </ul>
            </div>
            
            <p class="message">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${verifyUrl}" style="color: #3182ce; word-break: break-all;">${verifyUrl}</a>
            </p>
            
            <div class="divider"></div>
            
            <p style="color: #666; font-size: 0.95rem; text-align: center; margin: 20px 0;">
              Welcome to the SBS family - where authentic meets affordable! 💯
            </p>
          </div>
          
          ${this.getSocialLinks()}
          ${this.getFooter()}
        </div>
      </body>
      </html>
    `;
  }

  static generatePasswordResetEmail(data: EmailTemplateData): string {
    const { name, email, resetUrl } = data;
    const firstName = name ? name.split(' ')[0] : 'Boss';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your SBS Unity V3 Password</title>
        ${this.getBaseStyles()}
      </head>
      <body style="margin: 0; padding: 20px; background: #f0f2f5;">
        <div class="email-container">
          <div class="header">
            <img src="https://thesbsofficial.com/SBS%20(Your%20Story).png" alt="SBS Logo" class="logo-image">
            <h1 class="logo">SBS</h1>
            <p class="business-name">SwordsBuySale</p>
            <p class="tagline">Password Reset Request</p>
          </div>
          
          <div class="content">
            <h2 class="greeting">Hey ${firstName},</h2>
            
            <p class="message">
              We received a request to reset your SBS password. Use the button below to set a new one.
            </p>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${resetUrl}" class="cta-button">
                � Reset Password
              </a>
            </div>
            
            <p class="message">
              If you didn't request this, you can ignore this message and your password will stay the same.
            </p>
            
            <p class="message">
              If the button doesn't work, copy and paste this link:<br>
              <a href="${resetUrl}" style="color: #3182ce; word-break: break-all;">${resetUrl}</a>
            </p>
            
            <div class="divider"></div>
            
            <p style="color: #666; font-size: 0.95rem; text-align: center; margin: 20px 0;">
              Need help? DM us on Instagram - we're always here for the SBS family! 💙
            </p>
          </div>
          
          ${this.getSocialLinks()}
          ${this.getFooter()}
        </div>
      </body>
      </html>
    `;
  }

  static generateWelcomeEmail(data: EmailTemplateData): string {
    const { name, email } = data;
    const firstName = name ? name.split(' ')[0] : 'Boss';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to SBS Unity V3 - You're In!</title>
        ${this.getBaseStyles()}
      </head>
      <body style="margin: 0; padding: 20px; background: #f0f2f5;">
        <div class="email-container">
          <div class="header">
            <img src="https://thesbsofficial.com/SBS%20(Your%20Story).png" alt="SBS Logo" class="logo-image">
            <h1 class="logo">SBS</h1>
            <p class="business-name">SwordsBuySale</p>
            <p class="tagline">The King Pre-Owned Clothing</p>
          </div>
          
          <div class="content">
            <h2 class="greeting">Welcome to SBS, ${firstName}! 🎉</h2>
            
            <p class="message">
              Your email is verified and you're officially part of the <strong>SBS (SwordsBuySale)</strong> family! 
              From humble beginnings to becoming the king of pre-owned clothing - 
              you're now part of that story.
            </p>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 12px; margin: 30px 0; text-align: center;">
              <h3 style="margin: 0 0 15px 0; font-size: 1.3rem;">🔥 You're Ready to Roll!</h3>
              <p style="margin: 0; opacity: 0.95;">Browse exclusive drops, sell your gear, and join Dublin's streetwear culture</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0;">
              <h4 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 1.1rem;">What's Next?</h4>
              <div style="display: grid; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span style="background: #FFD700; color: #1a1a1a; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem;">1</span>
                  <span style="color: #4a5568;">Browse our latest drops and exclusive pieces</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span style="background: #FFD700; color: #1a1a1a; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem;">2</span>
                  <span style="color: #4a5568;">Follow us on socials for instant updates</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span style="background: #FFD700; color: #1a1a1a; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem;">3</span>
                  <span style="color: #4a5568;">Got gear to sell? DM us for instant offers</span>
                </div>
              </div>
            </div>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="https://thesbsofficial.com/shop.html" class="cta-button">
                🛒 Start Shopping
              </a>
            </div>
            
            <div class="divider"></div>
            
            <p style="color: #666; font-size: 0.95rem; text-align: center; margin: 20px 0; font-style: italic;">
              "Built for the culture, by the culture" - that's not just a tagline, that's our promise to you. 🔥
            </p>
          </div>
          
          ${this.getSocialLinks()}
          ${this.getFooter()}
        </div>
      </body>
      </html>
    `;
  }

  static generateAccountClosureConfirmationEmail(data: EmailTemplateData): string {
    const { name, email, closeConfirmUrl } = data;
    const firstName = name ? name.split(' ')[0] : 'Boss';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirm your SBS account closure ❌</title>
        <meta name="description" content="Click below to confirm closing your account.">
        ${this.getBaseStyles()}
      </head>
      <body style="margin: 0; padding: 20px; background: #f0f2f5;">
        <div class="email-container">
          <div class="header">
            <img src="https://thesbsofficial.com/SBS%20(Your%20Story).png" alt="SBS Logo" class="logo-image">
            <h1 class="logo">SBS</h1>
            <p class="business-name">SwordsBuySale</p>
            <p class="tagline">The King Pre-Owned Clothing</p>
          </div>
          
          <div class="content">
            <h2 class="greeting">Hey ${firstName},</h2>
            
            <p class="message">
              You asked to close your SBS account. Tap below to confirm.
            </p>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${closeConfirmUrl}" class="cta-button" style="background: #dc3545;">
                🛑 Confirm Account Closure
              </a>
            </div>
            
            <p class="message">
              If you didn't request this, ignore this message and your account will remain active.
            </p>
            
            <p class="message">
              Questions? DM @thesbsofficial
            </p>
          </div>
          
          ${this.getSocialLinks()}
          ${this.getFooter()}
        </div>
      </body>
      </html>
    `;
  }

  static generateAccountClosedEmail(data: EmailTemplateData): string {
    const { name, email } = data;
    const firstName = name ? name.split(' ')[0] : 'Boss';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your SBS account has been closed 📴</title>
        <meta name="description" content="We've closed your account as requested.">
        ${this.getBaseStyles()}
      </head>
      <body style="margin: 0; padding: 20px; background: #f0f2f5;">
        <div class="email-container">
          <div class="header">
            <img src="https://thesbsofficial.com/SBS%20(Your%20Story).png" alt="SBS Logo" class="logo-image">
            <h1 class="logo">SBS</h1>
            <p class="business-name">SwordsBuySale</p>
            <p class="tagline">The King Pre-Owned Clothing</p>
          </div>
          
          <div class="content">
            <h2 class="greeting">Hey ${firstName},</h2>
            
            <p class="message">
              We've closed your SBS account as requested. Thanks for rocking with us. If you ever want to return, you can create a new account anytime — we'll be ready for you, boss.
            </p>
            
            <p class="message">
              Follow to stay in the loop: <a href="https://instagram.com/thesbsofficial" style="color: #3182ce;">Instagram</a> | <a href="https://snapchat.com/add/thesbs2.0" style="color: #3182ce;">Snapchat</a> | <a href="https://linktr.ee/thesbsofficial" style="color: #3182ce;">All Links</a>
            </p>
            
            <p class="message">
              Questions? DM @thesbsofficial
            </p>
          </div>
          
          ${this.getSocialLinks()}
          ${this.getFooter()}
        </div>
      </body>
      </html>
    `;
  }

  static generateTestEmail(data: EmailTemplateData): string {
    const { email } = data;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SBS Unity V3 - Email System Test</title>
        ${this.getBaseStyles()}
      </head>
      <body style="margin: 0; padding: 20px; background: #f0f2f5;">
        <div class="email-container">
          <div class="header">
            <img src="https://thesbsofficial.com/SBS%20(Your%20Story).png" alt="SBS Logo" class="logo-image">
            <h1 class="logo">SBS</h1>
            <p class="business-name">SwordsBuySale</p>
            <p class="tagline">Email System Test</p>
          </div>
          
          <div class="content">
            <h2 class="greeting">🧪 System Test Successful!</h2>
            
            <p class="message">
              This is a test email to confirm your <strong>SBS (SwordsBuySale)</strong> email system is working perfectly. 
              Beautiful templates, warm messaging, and social integration - all systems go! ✅
            </p>
            
            <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; padding: 25px; border-radius: 12px; margin: 30px 0; text-align: center;">
              <h3 style="margin: 0 0 15px 0; font-size: 1.3rem;">🚀 All Systems Operational!</h3>
              <div style="display: grid; gap: 8px; margin-top: 15px;">
                <div>📧 Custom Domain: thesbsofficial.com ✅</div>
                <div>🎨 Beautiful Templates: Active ✅</div>
                <div>🔗 Social Integration: Working ✅</div>
                <div>📱 Mobile Responsive: Perfect ✅</div>
              </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #4a5568;"><strong>📊 Test Details:</strong></p>
              <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #4a5568;">
                <li>Recipient: ${email}</li>
                <li>Sent: ${new Date().toLocaleString()}</li>
                <li>Service: Resend API</li>
                <li>Domain: thesbsofficial.com</li>
                <li>Template: SBS Warm & Professional</li>
              </ul>
            </div>
            
            <div class="divider"></div>
            
            <p style="color: #666; font-size: 0.95rem; text-align: center; margin: 20px 0;">
              Your email verification system is ready for production! 🎉
            </p>
          </div>
          
          ${this.getSocialLinks()}
          ${this.getFooter()}
        </div>
      </body>
      </html>
    `;
  }
}

export default SBSEmailTemplates;