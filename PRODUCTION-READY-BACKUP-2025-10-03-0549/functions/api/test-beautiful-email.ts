// Quick test for beautiful verification email
// Send POST with JSON to test the warm verification template

import EmailService from '../lib/email-service';

export async function onRequestPost(context: any) {
  try {
    const request = context.request;
    const body = await request.json();
    
    const email = body.email;
    if (!email) {
      return new Response(JSON.stringify({ 
        error: 'Email address is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get Resend API key from environment
    const apiKey = context.env.RESEND_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({
        error: 'Resend API key not configured'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialize email service
    const emailService = new EmailService(apiKey);
    
    // Send beautiful verification email with warm messaging
    const result = await emailService.sendBeautifulVerificationEmail(
      email, 
      'Test User', 
      'https://thesbsofficial.com/verify-email?token=demo123'
    );

    return new Response(JSON.stringify({ 
      success: true,
      message: '🎉 Beautiful verification email sent! Check your inbox for warm SBS welcome with social links',
      id: result.id,
      recipient: email,
      features: [
        '✨ Warm "Welcome to the SBS family" messaging',
        '🏆 Premium gold & black SBS branding', 
        '📱 Mobile-responsive design',
        '📸 Instagram (@thesbsofficial) integration',
        '👻 Snapchat (@thesbs2.0) links',
        '🌳 Linktree social hub',
        '💫 Professional typography'
      ]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Beautiful email test error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to send beautiful verification email',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}