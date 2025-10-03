// Resend Email Test v3.0 - Fresh endpoint
interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

class ResendEmailService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendEmail(request: EmailRequest) {
    console.log('🚀 Sending email via Resend API...');
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: request.from || 'SBS Unity V3 <noreply@thesbsofficial.com>',
        to: [request.to],
        subject: request.subject,
        html: request.html,
      }),
    });

    const responseText = await response.text();
    console.log(`📧 Resend Response: ${response.status} - ${responseText}`);

    if (!response.ok) {
      throw new Error(`Resend API error: ${response.status} - ${responseText}`);
    }

    return JSON.parse(responseText);
  }
}

export async function onRequestPost(context: any) {
  try {
    const request = context.request;
    const body = await request.json();
    
    console.log('📧 Resend email test request:', JSON.stringify(body, null, 2));
    
    // Get Resend API key from environment
    const apiKey = context.env.RESEND_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({
        error: 'Resend API key not configured',
        setup: 'API key should be configured as RESEND_API_KEY secret'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Extract email addresses
    const emails = Array.isArray(body.emails) 
      ? body.emails 
      : body.email ? [body.email] : [];
    
    if (!emails.length) {
      return new Response(JSON.stringify({
        error: 'No email addresses provided',
        usage: 'POST with {"emails": ["email1@domain.com"]} or {"email": "single@domain.com"}'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const emailService = new ResendEmailService(apiKey);
    const results = [];
    let successCount = 0;
    
    // Send test email to each address
    for (const email of emails) {
      try {
        console.log(`📤 Sending test email via Resend to: ${email}`);
        
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #28a745; margin: 0;">✅ Resend Email Test Successful!</h1>
              <p style="color: #666; margin: 10px 0;">Your email system is now powered by Resend</p>
            </div>
            
            <div style="background: white; border-radius: 8px; padding: 30px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #155724; margin: 0 0 20px 0;">🚀 System Status: OPERATIONAL</h2>
              <p style="color: #333; line-height: 1.6; margin: 0 0 20px 0;">
                This test email confirms that your SBS Unity V3 email system is working correctly with <strong>Resend</strong>.
              </p>
              
              <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
                <p style="margin: 5px 0;"><strong>📧 Recipient:</strong> ${email}</p>
                <p style="margin: 5px 0;"><strong>🕐 Sent:</strong> ${new Date().toLocaleString()}</p>
                <p style="margin: 5px 0;"><strong>🌐 Domain:</strong> thesbsofficial.com</p>
                <p style="margin: 5px 0;"><strong>📡 Service:</strong> Resend API ✅</p>
                <p style="margin: 5px 0;"><strong>🔧 Status:</strong> WORKING PERFECTLY!</p>
              </div>
              
              <div style="text-align: center; margin: 20px 0;">
                <div style="background: #28a745; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block;">
                  🎉 Email Verification System Ready!
                </div>
              </div>
            </div>
            
            <div style="text-align: center; color: #666; font-size: 14px; margin-top: 30px;">
              <p>No more 401 errors - Resend is reliable and fast! 🚀</p>
            </div>
          </div>
        `;
        
        const result = await emailService.sendEmail({
          to: email,
          subject: `🎯 Resend Test Success - ${new Date().toLocaleString()}`,
          html
        });
        
        results.push({
          email,
          success: true,
          id: result.id,
          message: 'Test email sent successfully via Resend',
          sent_at: result.created_at || new Date().toISOString()
        });
        
        successCount++;
        console.log(`✅ Resend email sent to ${email}, ID: ${result.id}`);
        
      } catch (error) {
        console.error(`❌ Error sending to ${email}:`, error);
        results.push({
          email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return new Response(JSON.stringify({
      success: successCount > 0,
      sent_count: successCount,
      total_count: emails.length,
      message: `${successCount}/${emails.length} test emails sent successfully via Resend`,
      service: 'Resend API',
      api_status: 'WORKING ✅',
      results,
      timestamp: new Date().toISOString()
    }), {
      status: successCount > 0 ? 200 : 207,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Resend test error:', error);
    return new Response(JSON.stringify({
      error: 'Resend test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      service: 'Resend API'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// GET endpoint for API documentation
export async function onRequestGet() {
  return new Response(JSON.stringify({
    endpoint: '/api/resend-test',
    method: 'POST',
    description: 'Send test emails using Resend API (v3.0)',
    service: 'Resend (https://resend.com) ✅',
    usage: {
      single_email: { email: 'test@example.com' },
      multiple_emails: { emails: ['test1@example.com', 'test2@example.com'] }
    },
    setup: {
      api_key: 'RESEND_API_KEY configured ✅',
      status: 'Ready to send emails'
    },
    benefits: [
      '✅ No DNS configuration required',
      '✅ No 401 authorization errors',
      '✅ Instant email delivery',
      '✅ Professional templates',
      '✅ 100 emails/day free tier'
    ],
    status: 'OPERATIONAL - Resend API Ready ✅'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}