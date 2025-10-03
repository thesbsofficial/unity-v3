# 🚀 Resend Email Setup Guide

## ✅ What's Done
- ✅ Installed Resend SDK (`npm install resend`)
- ✅ Created EmailService class with beautiful templates
- ✅ Built test-email endpoint 
- ✅ Created complete auth system with email verification
- ✅ Cleaned up old MailChannels code

## 🔑 Quick Setup (5 minutes)

### 1. Get Resend API Key
1. Go to [https://resend.com](https://resend.com)
2. Sign up/login (it's free)
3. Go to [API Keys](https://resend.com/api-keys)
4. Click "Create API Key"
5. Copy the key (starts with `re_`)

### 2. Add Domain (Optional - works without this)
1. In Resend dashboard, go to "Domains"
2. Add `thesbsofficial.com`
3. Update DNS records as shown
4. Or just use the default domain for testing

### 3. Configure Environment Variable
```powershell
# In your project directory:
npx wrangler secret put RESEND_API_KEY
# Paste your API key when prompted
```

### 4. Deploy & Test
```powershell
npx wrangler pages deploy
```

## 🧪 Test Your Setup

### Send Test Email
```powershell
$response = Invoke-WebRequest -Uri "https://thesbsofficial.com/api/test-email" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"fredbademosi1@icloud.com"}'
Write-Host "Status: $($response.StatusCode)"
```

### Test Registration
```powershell
$response = Invoke-WebRequest -Uri "https://thesbsofficial.com/api/auth/register" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"fredbademosi1@icloud.com","password":"test123","name":"Fred"}'
```

## 📧 Available Endpoints

### `/api/test-email` (POST)
Send test emails
```json
{"email": "test@example.com"}
{"emails": ["test1@example.com", "test2@example.com"]}
```

### `/api/auth/register` (POST)
Register new user with email verification
```json
{"email": "user@example.com", "password": "password123", "name": "User Name"}
```

### `/api/auth/verify` (POST)
Verify email with token
```json
{"token": "verification_token_from_email"}
```

### `/api/auth/login` (POST)
Login (requires verified email)
```json
{"email": "user@example.com", "password": "password123"}
```

### `/api/auth/resend-verification` (POST)
Resend verification email
```json
{"email": "user@example.com"}
```

## 🎨 Email Templates
- ✅ **Verification Email**: Professional welcome with verify button
- ✅ **Password Reset**: Secure reset with expiry info  
- ✅ **Test Email**: System status confirmation

## 🔧 Why Resend?
- ✅ **Reliable**: 99.9% uptime, no 401 errors
- ✅ **Simple**: Just API key, no DNS complexity
- ✅ **Fast**: Instant delivery
- ✅ **Free**: 100 emails/day free tier
- ✅ **Professional**: Beautiful default templates
- ✅ **Trackable**: Delivery analytics included

## 🎯 Next Steps
1. Set up your Resend API key (5 minutes)
2. Test the email system
3. Your email verification is ready! 🚀

---
**Status**: Ready to deploy! Just add your Resend API key.