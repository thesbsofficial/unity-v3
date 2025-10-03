// User authentication with Resend email verification
import EmailService from '../lib/email-service';

interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface VerifyRequest {
  token: string;
}

// User registration with email verification
export async function onRequestPost(context: any) {
  try {
    const request = context.request;
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Get environment variables
    const db = context.env.DB;
    const apiKey = context.env.RESEND_API_KEY;
    const siteUrl = context.env.SITE_URL || 'https://thesbsofficial.com';
    
    if (!apiKey) {
      return new Response(JSON.stringify({
        error: 'Email service not configured',
        setup: 'Configure RESEND_API_KEY'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Route to different handlers based on path
    if (path.includes('/register')) {
      return await handleRegister(context, db, apiKey, siteUrl);
    } else if (path.includes('/login')) {
      return await handleLogin(context, db);
    } else if (path.includes('/verify')) {
      return await handleVerify(context, db);
    } else if (path.includes('/resend-verification')) {
      return await handleResendVerification(context, db, apiKey, siteUrl);
    }
    
    return new Response(JSON.stringify({
      error: 'Invalid endpoint',
      available: ['/register', '/login', '/verify', '/resend-verification']
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Auth error:', error);
    return new Response(JSON.stringify({
      error: 'Authentication failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleRegister(context: any, db: any, apiKey: string, siteUrl: string) {
  const body: RegisterRequest = await context.request.json();
  const { email, password, name } = body;
  
  if (!email || !password) {
    return new Response(JSON.stringify({
      error: 'Email and password are required'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // Check if user already exists
    const existingUser = await db.prepare(
      'SELECT id, email_verified FROM users WHERE email = ?'
    ).bind(email).first();
    
    if (existingUser) {
      if (existingUser.email_verified) {
        return new Response(JSON.stringify({
          error: 'User already exists and is verified'
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        // User exists but not verified, resend verification
        return await sendVerificationEmail(db, apiKey, siteUrl, email, existingUser.id);
      }
    }
    
    // Hash password (simple hash for demo - use bcrypt in production)
    const hashedPassword = await hashPassword(password);
    
    // Generate verification token
    const verificationToken = generateSecureToken();
    
    // Create user
    const result = await db.prepare(`
      INSERT INTO users (email, password_hash, name, verification_token, email_verified, created_at)
      VALUES (?, ?, ?, ?, false, datetime('now'))
    `).bind(email, hashedPassword, name || '', verificationToken).run();
    
    const userId = result.meta.last_row_id;
    
    // Send verification email
    await sendVerificationEmail(db, apiKey, siteUrl, email, userId);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      user_id: userId
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    return new Response(JSON.stringify({
      error: 'Registration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function sendVerificationEmail(db: any, apiKey: string, siteUrl: string, email: string, userId: number) {
  const emailService = new EmailService(apiKey);
  
  // Get verification token
  const user = await db.prepare(
    'SELECT verification_token FROM users WHERE id = ?'
  ).bind(userId).first();
  
  if (!user) {
    throw new Error('User not found');
  }
  
  const verifyUrl = `${siteUrl}/verify-email?token=${user.verification_token}`;
  
  try {
    const result = await emailService.sendVerificationEmail(email, verifyUrl);
    console.log(`✅ Verification email sent to ${email}, ID: ${result.id}`);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Verification email sent successfully',
      email_id: result.id
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Email send error:', error);
    throw new Error('Failed to send verification email');
  }
}

async function handleVerify(context: any, db: any) {
  const body: VerifyRequest = await context.request.json();
  const { token } = body;
  
  if (!token) {
    return new Response(JSON.stringify({
      error: 'Verification token is required'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // Find user by verification token
    const user = await db.prepare(
      'SELECT id, email, email_verified FROM users WHERE verification_token = ?'
    ).bind(token).first();
    
    if (!user) {
      return new Response(JSON.stringify({
        error: 'Invalid or expired verification token'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (user.email_verified) {
      return new Response(JSON.stringify({
        message: 'Email already verified',
        email: user.email
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Mark email as verified
    await db.prepare(`
      UPDATE users 
      SET email_verified = true, verification_token = null, verified_at = datetime('now')
      WHERE id = ?
    `).bind(user.id).run();
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Email verified successfully!',
      email: user.email
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Verification error:', error);
    return new Response(JSON.stringify({
      error: 'Email verification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleLogin(context: any, db: any) {
  const body: LoginRequest = await context.request.json();
  const { email, password } = body;
  
  if (!email || !password) {
    return new Response(JSON.stringify({
      error: 'Email and password are required'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // Find user
    const user = await db.prepare(
      'SELECT id, email, password_hash, email_verified, name FROM users WHERE email = ?'
    ).bind(email).first();
    
    if (!user) {
      return new Response(JSON.stringify({
        error: 'Invalid email or password'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return new Response(JSON.stringify({
        error: 'Invalid email or password'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!user.email_verified) {
      return new Response(JSON.stringify({
        error: 'Please verify your email before logging in',
        action: 'verification_required'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Generate session token
    const sessionToken = generateSecureToken();
    
    // Update last login
    await db.prepare(`
      UPDATE users 
      SET last_login = datetime('now'), session_token = ?
      WHERE id = ?
    `).bind(sessionToken, user.id).run();
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        verified: user.email_verified
      },
      session_token: sessionToken
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({
      error: 'Login failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleResendVerification(context: any, db: any, apiKey: string, siteUrl: string) {
  const body = await context.request.json();
  const { email } = body;
  
  if (!email) {
    return new Response(JSON.stringify({
      error: 'Email is required'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const user = await db.prepare(
      'SELECT id, email_verified FROM users WHERE email = ?'
    ).bind(email).first();
    
    if (!user) {
      return new Response(JSON.stringify({
        error: 'User not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (user.email_verified) {
      return new Response(JSON.stringify({
        message: 'Email is already verified'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Generate new verification token
    const verificationToken = generateSecureToken();
    await db.prepare(
      'UPDATE users SET verification_token = ? WHERE id = ?'
    ).bind(verificationToken, user.id).run();
    
    return await sendVerificationEmail(db, apiKey, siteUrl, email, user.id);
    
  } catch (error) {
    console.error('Resend verification error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to resend verification email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Utility functions
function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}