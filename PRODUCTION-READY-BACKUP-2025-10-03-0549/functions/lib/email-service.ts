// SBS Unity V3 Email Service with Beautiful Templates
// Documentation: https://resend.com/docs
import SBSEmailTemplates from './sbs-email-templates';

interface EmailRequest {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

interface ResendResponse {
  id: string;
  from: string;
  to: string[];
  created_at: string;
}

interface EmailTemplateData {
  name?: string;
  email: string;
  verifyUrl?: string;
  resetUrl?: string;
  [key: string]: any;
}

class EmailService {
  private apiKey: string;
  private defaultFrom: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.defaultFrom = 'SBS Unity V3 <noreply@thesbsofficial.com>';
  }

  async sendEmail(request: EmailRequest): Promise<ResendResponse> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: request.from || this.defaultFrom,
        to: Array.isArray(request.to) ? request.to : [request.to],
        subject: request.subject,
        html: request.html,
        text: request.text,
        reply_to: request.replyTo,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // 🎨 Beautiful Template Methods - Warm & Professional

  // 🎨 Beautiful Template Methods - Now with warm, personalized SBS emails!
  async sendBeautifulVerificationEmail(email: string, name: string, verifyUrl: string): Promise<ResendResponse> {
    const html = SBSEmailTemplates.generateVerificationEmail({ email, name, verifyUrl });
    
    return this.sendEmail({
      to: email,
      subject: `Verify your email to unlock SBS — early drops & same-day Dublin 🚀`,
      html,
      from: 'SBS Team <noreply@thesbsofficial.com>',
    });
  }

  async sendBeautifulWelcomeEmail(email: string, name: string): Promise<ResendResponse> {
    const html = SBSEmailTemplates.generateWelcomeEmail({ email, name });
    const firstName = name ? name.split(' ')[0] : 'Boss';
    
    return this.sendEmail({
      to: email,
      subject: `🔥 You're officially part of the SBS family, ${firstName}!`,
      html,
      from: 'SBS Team <noreply@thesbsofficial.com>',
    });
  }

  async sendBeautifulPasswordResetEmail(email: string, name: string, resetUrl: string): Promise<ResendResponse> {
    const html = SBSEmailTemplates.generatePasswordResetEmail({ email, name, resetUrl });
    const firstName = name ? name.split(' ')[0] : 'there';
    
    return this.sendEmail({
      to: email,
      subject: `Reset your SBS password 🔒`,
      html,
      from: 'SBS Security <noreply@thesbsofficial.com>',
    });
  }

  async sendAccountClosureConfirmationEmail(email: string, name: string, closeConfirmUrl: string): Promise<ResendResponse> {
    const html = SBSEmailTemplates.generateAccountClosureConfirmationEmail({ email, name, closeConfirmUrl });
    
    return this.sendEmail({
      to: email,
      subject: `Confirm your SBS account closure ❌`,
      html,
      from: 'SBS Account Team <noreply@thesbsofficial.com>',
    });
  }

  async sendAccountClosedEmail(email: string, name: string): Promise<ResendResponse> {
    const html = SBSEmailTemplates.generateAccountClosedEmail({ email, name });
    
    return this.sendEmail({
      to: email,
      subject: `Your SBS account has been closed 📴`,
      html,
      from: 'SBS Team <noreply@thesbsofficial.com>',
    });
  }

  // 🧪 Beautiful Template Testing Method
  async sendTestTemplateEmail(email: string, templateType: 'verification' | 'welcome' | 'reset' | 'close-confirm' | 'closed' = 'verification'): Promise<ResendResponse> {
    const testData = {
      email,
      name: 'Test User',
      verifyUrl: 'https://thesbsofficial.com/verify-email?token=test123',
      resetUrl: 'https://thesbsofficial.com/reset?token=test123',
      closeConfirmUrl: 'https://thesbsofficial.com/close-account?token=test123',
    };

    switch (templateType) {
      case 'welcome':
        return this.sendBeautifulWelcomeEmail(email, testData.name);
      case 'reset':
        return this.sendBeautifulPasswordResetEmail(email, testData.name, testData.resetUrl);
      case 'close-confirm':
        return this.sendAccountClosureConfirmationEmail(email, testData.name, testData.closeConfirmUrl);
      case 'closed':
        return this.sendAccountClosedEmail(email, testData.name);
      default:
        return this.sendBeautifulVerificationEmail(email, testData.name, testData.verifyUrl);
    }
  }

  // Legacy methods for backward compatibility - now use beautiful templates
  async sendVerificationEmail(email: string, verifyUrl: string): Promise<ResendResponse> {
    return this.sendBeautifulVerificationEmail(email, 'Valued Customer', verifyUrl);
  }

  async sendPasswordResetEmail(email: string, resetUrl: string): Promise<ResendResponse> {
    return this.sendBeautifulPasswordResetEmail(email, 'Valued Customer', resetUrl);
  }

  async sendTestEmail(email: string): Promise<ResendResponse> {
    return this.sendTestTemplateEmail(email, 'verification');
  }
}

export default EmailService;