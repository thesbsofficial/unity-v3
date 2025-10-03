# 📧 EMAIL VERIFICATION IMPLEMENTATION PLAN

**Status:** 🚧 NEEDS IMPLEMENTATION  
**Date:** October 2, 2025

---

## 🚨 The Problem

**Current State:**
- ✅ Registration says "Please verify your email"
- ❌ **NO EMAIL IS ACTUALLY SENT**
- ❌ Users can login without verification
- ❌ No verification endpoint exists

**Impact:** False promise to users, security gap

---

## 🎯 Solution Options

### **Option 1: Cloudflare Email Workers (Recommended)**
- **Pros:** Free, built-in, no external service
- **Cons:** Requires domain setup
- **Setup:** 5-10 minutes

### **Option 2: SendGrid API**
- **Pros:** Easy, reliable, free tier (100/day)
- **Cons:** External service, API key needed
- **Setup:** 10 minutes

### **Option 3: Resend (Modern)**
- **Pros:** Developer-friendly, generous free tier
- **Cons:** New service, API key needed
- **Setup:** 5 minutes

### **Option 4: Manual (Social Media)**
- **Pros:** No email needed, matches your brand
- **Cons:** Manual verification via DMs
- **Setup:** 1 minute (just update message)

---

## 📋 Recommended: Option 1 (Cloudflare Email Workers)

### **What We'll Build:**

1. **Email sending function** (`/functions/lib/email.js`)
2. **Verification endpoint** (`/api/verify-email`)
3. **Token generation** (secure random tokens)
4. **Verification table** (track tokens)
5. **Login check** (require verified email)

---

## 🛠️ Implementation Steps

### **Step 1: Add Verification Table**
```sql
-- Already exists in docs, need to apply
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_verification_token_hash 
ON email_verification_tokens(token_hash);
```

### **Step 2: Add Email Verified Column**
```sql
ALTER TABLE users ADD COLUMN email_verified_at DATETIME;
ALTER TABLE users ADD COLUMN email_verification_required INTEGER DEFAULT 1;
```

### **Step 3: Create Email Sending Function**
```javascript
// functions/lib/email.js
export async function sendVerificationEmail(email, token, env) {
    const verifyUrl = `${env.SITE_URL}/verify?token=${token}`;
    
    // Using Cloudflare Email Workers
    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            personalizations: [{ to: [{ email }] }],
            from: { email: 'noreply@thesbsofficial.com', name: 'SBS Unity' },
            subject: '✅ Verify Your SBS Account',
            content: [{
                type: 'text/html',
                value: `
                    <h2>Welcome to SBS Unity!</h2>
                    <p>Click the link below to verify your email:</p>
                    <a href="${verifyUrl}">Verify Email</a>
                    <p>Or copy this link: ${verifyUrl}</p>
                    <p>This link expires in 24 hours.</p>
                `
            }]
        })
    });
    
    return response.ok;
}
```

### **Step 4: Update Register Endpoint**
```javascript
// After creating user
const token = generateToken(); // Random 32 bytes
const tokenHash = await hashToken(token);

await env.DB.prepare(`
    INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
    VALUES (?, ?, datetime('now', '+24 hours'))
`).bind(userId, tokenHash).run();

await sendVerificationEmail(body.email, token, env);

return json({
    success: true,
    message: "Account created! Check your email to verify."
});
```

### **Step 5: Create Verification Endpoint**
```javascript
// /api/verify-email
if (path === "/api/verify-email" && method === "POST") {
    const { token } = await request.json();
    const tokenHash = await hashToken(token);
    
    const record = await env.DB.prepare(`
        SELECT vt.*, u.email 
        FROM email_verification_tokens vt
        JOIN users u ON vt.user_id = u.id
        WHERE vt.token_hash = ? AND vt.expires_at > datetime('now')
    `).bind(tokenHash).first();
    
    if (!record) {
        return json({ success: false, error: "Invalid or expired token" }, 400);
    }
    
    await env.DB.prepare(`
        UPDATE users 
        SET email_verified_at = datetime('now'), 
            email_verification_required = 0
        WHERE id = ?
    `).bind(record.user_id).run();
    
    await env.DB.prepare(`
        DELETE FROM email_verification_tokens WHERE user_id = ?
    `).bind(record.user_id).run();
    
    return json({ success: true, message: "Email verified!" });
}
```

### **Step 6: Update Login Check**
```javascript
// In login endpoint, after finding user:
if (user.email_verification_required && !user.email_verified_at) {
    return json({
        success: false,
        error: "Please verify your email before logging in."
    }, 403);
}
```

### **Step 7: Create Verification Page**
```html
<!-- /public/verify.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Verify Email - SBS Unity</title>
</head>
<body>
    <div id="message">Verifying...</div>
    <script>
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        
        fetch('/api/verify-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                document.getElementById('message').innerHTML = 
                    '✅ Email verified! <a href="/login.html">Login now</a>';
            } else {
                document.getElementById('message').innerHTML = 
                    '❌ ' + data.error;
            }
        });
    </script>
</body>
</html>
```

---

## 📊 Alternative: Skip Email (Social Media Verification)

If you don't want to set up email:

### **Update Register Message**
```javascript
// In register.html
successMessage = 'Account created! DM us on Instagram @sbsofficial to verify your account.';
```

### **Remove Email Requirement**
```javascript
// In login endpoint
// Remove email verification check
// Just let users login immediately
```

---

## 🚀 Quick Start (Simplest Option)

### **Option A: Disable Email Verification**
```javascript
// In functions/api/[[path]].js, register endpoint
// Change message to:
"Account created successfully! You can now login."

// Remove verification check from login
// No email needed
```

### **Option B: Social Media Verification**
```javascript
// Change message to:
"Account created! DM @sbsofficial on Instagram with your username to get verified."

// Add manual verification in admin panel
```

---

## 🎯 Recommendation

**For now:** Disable email verification requirement (Option A)  
**Later:** Implement Cloudflare Email Workers (Option 1)

**Why?** Your brand is social media first. Users expect Instagram DMs, not email verification.

---

## ✅ Checklist

- [ ] Choose verification method
- [ ] Update register endpoint message
- [ ] Update login check (remove or implement)
- [ ] Create verification table (if using email)
- [ ] Implement email sending (if using email)
- [ ] Create verify.html page (if using email)
- [ ] Test flow end-to-end
- [ ] Update documentation

---

**Next Steps:** Pick an option and I'll implement it!
