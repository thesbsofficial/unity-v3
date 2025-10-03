# 🎯 ADMIN ACCOUNT SETUP - COMPLETE

**Date**: October 3, 2025  
**Status**: ✅ Account Created | ⚠️ Email Verification Pending

---

## ✅ WHAT'S DONE

### 1. **Admin Account Created in Database**

- **Username**: `ADMIN`
- **Email**: `fredbademosi1@icloud.com`
- **Name**: Fred Bademosi
- **Role**: `admin`
- **Allowlisted**: `1` (you have full admin permissions)
- **Email Verified**: `0` (needs verification)

### 2. **Admin Allowlist Configured**

Added to `wrangler.toml`:

```toml
ADMIN_ALLOWLIST_HANDLES = "ADMIN,fredbademosi,SBS"
```

Any account with these social handles will automatically become admin on login.

### 3. **Deployed to Production**

- Deployment URL: https://e40d36d4.unity-v3.pages.dev
- Main URL: https://main.unity-v3.pages.dev

---

## ⚠️ EMAIL VERIFICATION ISSUE

The verification email failed to send with error:

```
{"success":false,"error":"Failed to send verification email"}
```

This is likely because the `RESEND_API_KEY` secret is not set in the Cloudflare Pages environment.

---

## 🔧 FIX: SET RESEND API KEY

You need to set the Resend API key as a Cloudflare secret:

### Option 1: Via Cloudflare Dashboard

1. Go to https://dash.cloudflare.com
2. Select your account
3. Go to Workers & Pages
4. Click on "unity-v3"
5. Go to "Settings" > "Environment variables"
6. Add new variable:
   - **Name**: `RESEND_API_KEY`
   - **Value**: `re_Fh2qGiv2_4p65paDSf1YqrDFjaz4Cv566`
   - **Type**: Secret (encrypted)
   - **Environment**: Production
7. Save and redeploy

### Option 2: Via Wrangler CLI

```bash
npx wrangler pages secret put RESEND_API_KEY --project-name=unity-v3
# When prompted, paste: re_Fh2qGiv2_4p65paDSf1YqrDFjaz4Cv566
```

---

## 📧 AFTER SETTING API KEY

Once the API key is set, you can:

### Option 1: Trigger Verification Email Manually

Visit this URL in your browser or use the API:

```
POST https://main.unity-v3.pages.dev/api/resend-verification
Body: {"email":"fredbademosi1@icloud.com"}
```

### Option 2: Use the Register Page

1. Go to https://main.unity-v3.pages.dev/register
2. Try to register with `fredbademosi1@icloud.com`
3. It will detect the existing account and offer to resend verification

### Option 3: Manual Database Update (Quick Fix)

If you want to bypass email verification temporarily:

```bash
wrangler d1 execute unity-v3 --remote --command "UPDATE users SET email_verified = 1 WHERE email = 'fredbademosi1@icloud.com';"
```

---

## 🔑 LOGIN INSTRUCTIONS

### After Email is Verified:

1. **Go to Login Page**: https://main.unity-v3.pages.dev/login

2. **Use These Credentials**:
   - **Username/Social Handle**: `ADMIN`
   - **Password**: _(You'll need to set a password first)_

### Setting Your Password:

Since the account was created with a dummy hash, you'll need to reset the password:

#### Option A: Use Password Reset Flow

1. Go to https://main.unity-v3.pages.dev/reset
2. Enter your email: `fredbademosi1@icloud.com`
3. Click "Send Reset Link"
4. Check your email and follow the link
5. Set your new password

#### Option B: Direct Database Update

Run this to set a known password (e.g., "TempAdmin123!"):

```bash
# Generate password hash first
node generate-password-hash.js TempAdmin123!
# Then update database with the hash
```

---

## 🎉 WHAT YOU'LL GET AS ADMIN

Once logged in as admin, you'll have access to:

1. **Admin Panel**: `/admin-panel` link in navigation
2. **Full Dashboard**: See all orders and submissions
3. **Inventory Management**: Upload, edit, delete products
4. **User Management**: View and manage all users
5. **Order Processing**: Approve/reject sell submissions
6. **Admin Badge**: Special admin indicator in UI

---

## 🚀 QUICK START (After API Key is Set)

1. **Set RESEND_API_KEY** in Cloudflare Dashboard
2. **Manually verify email** (Option 3 above for quick fix):
   ```bash
   wrangler d1 execute unity-v3 --remote --command "UPDATE users SET email_verified = 1 WHERE email = 'fredbademosi1@icloud.com';"
   ```
3. **Set a password** using password reset flow
4. **Login** with username `ADMIN` and your new password
5. **Access Admin Panel** from the navigation

---

## 📋 SUMMARY

✅ Admin account created  
✅ Admin permissions granted  
✅ Allowlist configured  
✅ Deployed to production  
⚠️ Need to set RESEND_API_KEY  
⚠️ Need to verify email  
⚠️ Need to set password

**Next Step**: Set the RESEND_API_KEY in Cloudflare Dashboard, then verify your email!
