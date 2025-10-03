// Test email endpoint using Resend API - v2.0
// Clean Resend implementation without imports

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

class SimpleEmailService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendEmail(request: EmailRequest) {
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

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${response.status} - ${error}`);
    }

    return response.json();
  }
}

interface TestEmailRequest {
  email?: string;
  emails?: string[];
}

export async function onRequestPost(context: any) {
  try {
    const request = context.request;
    const body: TestEmailRequest = await request.json();
    
    console.log('📧 Resend test email request:', JSON.stringify(body, null, 2));
    
    // Get Resend API key from environment
    const apiKey = context.env.RESEND_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({
        error: 'Resend API key not configured',
        setup: 'Run: npx wrangler secret put RESEND_API_KEY'
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
        usage: 'POST with {"emails": ["email1@domain.com", "email2@domain.com"]} or {"email": "single@domain.com"}'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const emailService = new SimpleEmailService(apiKey);
    const results = [];
    let successCount = 0;
    
    // Send test email to each address
    for (const email of emails) {
      try {
        console.log(`📤 Sending test email to: ${email}`);
        
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #28a745; margin: 0;">✅ Email Test Successful!</h1>
              <p style="color: #666; margin: 10px 0;">Your Resend integration is working perfectly</p>
            </div>
            
            <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 30px; margin: 20px 0;">
              <h2 style="color: #155724; margin: 0 0 20px 0;">🚀 System Status: OPERATIONAL</h2>
              <p style="color: #155724; line-height: 1.6; margin: 0 0 20px 0;">
                This test email confirms that your SBS Unity V3 email system is working correctly with Resend.
              </p>
              
              <div style="background: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>📧 Recipient:</strong> ${email}</p>
                <p style="margin: 5px 0;"><strong>🕐 Sent:</strong> ${new Date().toLocaleString()}</p>
                <p style="margin: 5px 0;"><strong>🌐 Domain:</strong> thesbsofficial.com</p>
                <p style="margin: 5px 0;"><strong>📡 Service:</strong> Resend API</p>
                <p style="margin: 5px 0;"><strong>🔧 Status:</strong> WORKING!</p>
              </div>
            </div>
            
            <div style="text-align: center; color: #666; font-size: 14px; margin-top: 30px;">
              <p>Email verification system is ready for production! 🎉</p>
            </div>
          </div>
        `;
        
        const result = await emailService.sendEmail({
          to: email,
          subject: `🧪 Resend Test - ${new Date().toLocaleString()}`,
          html
        });
        
        results.push({
          email,
          success: true,
          id: result.id,
          message: 'Test email sent successfully',
          sent_at: result.created_at
        });
        
        successCount++;
        console.log(`✅ Test email sent to ${email}, ID: ${result.id}`);
        
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
      message: `${successCount}/${emails.length} test emails sent successfully`,
      service: 'Resend API',
      results,
      timestamp: new Date().toISOString()
    }), {
      status: successCount > 0 ? 200 : 207,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Test email error:', error);
    return new Response(JSON.stringify({
      error: 'Test email failed',
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
    endpoint: '/api/test-email',
    method: 'POST',
    description: 'Send test emails using Resend API',
    service: 'Resend (https://resend.com)',
    usage: {
      single_email: { email: 'test@example.com' },
      multiple_emails: { emails: ['test1@example.com', 'test2@example.com'] }
    },
    setup: {
      required: 'RESEND_API_KEY environment variable',
      command: 'npx wrangler secret put RESEND_API_KEY',
      get_key: 'https://resend.com/api-keys'
    },
    status: 'Ready - Resend API configured ✅'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}