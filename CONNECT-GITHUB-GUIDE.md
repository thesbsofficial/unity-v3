# Connect GitHub to Cloudflare Pages - Step by Step

## ✅ Current Status

- **Project**: unity-v3
- **Git Provider**: ❌ Not Connected
- **Manual Deployments**: Working (but with 4,311 files = slow)
- **GitHub Repo**: thesbsofficial/unity-v3
- **Branch**: MAIN

---

## 🔗 Steps to Connect GitHub

### **1. Open Cloudflare Pages Dashboard**

Direct link to your project:
https://dash.cloudflare.com/625959b904a63f24f6bb7ec9b8c1ed7c/pages/view/unity-v3

### **2. Go to Settings**

- Click **"Settings"** tab in the project

### **3. Connect to Git**

- Scroll to **"Build & deployments"** section
- Look for **"Source"** or **"Connect to Git"** button
- Click it

### **4. Authorize GitHub**

- Select **GitHub** as provider
- Click **"Connect GitHub"**
- Authorize Cloudflare to access your GitHub account
- Grant access to repositories

### **5. Select Repository**

- Choose **thesbsofficial/unity-v3**
- Select branch: **MAIN**

### **6. Configure Build Settings**

```
Build command: npx wrangler pages functions build
Build output directory: .
Root directory: (leave blank or use "public (4)" if needed)
```

### **7. Environment Variables (Already Set)**

These should automatically transfer:

- ✅ CLOUDFLARE_ACCOUNT_ID
- ✅ SITE_URL
- ✅ ADMIN_ALLOWLIST_HANDLES

### **8. Save and Deploy**

- Click **"Save and Deploy"**
- First deployment will start automatically

---

## 🎯 After Connection

### **Automatic Deployments**

Every `git push origin MAIN` will:

1. Trigger automatic Cloudflare build
2. Deploy to production
3. Update https://thesbsofficial.com

### **Manual Deployments (Backup)**

Still available via:

```bash
npx wrangler pages deploy . --project-name=unity-v3 --branch=MAIN
```

---

## 🚀 Alternative: Create New Pages Project with Git

If connection fails, create fresh:

### **Via Dashboard:**

1. Go to: https://dash.cloudflare.com/625959b904a63f24f6bb7ec9b8c1ed7c/pages
2. Click **"Create application"**
3. Select **"Connect to Git"**
4. Choose **thesbsofficial/unity-v3**
5. Name it **unity-v3** (or unity-v3-git)
6. Configure build settings (see above)
7. Click **"Save and Deploy"**

### **Then Update Bindings:**

After creation, go to Settings → Functions:

- Add D1 binding: `DB` → `unity-v3`
- Add R2 binding: `PRODUCT_IMAGES` → `sbs-product-images`
- Add R2 binding: `USER_UPLOADS` → `sbs-user-uploads`

---

## 🔍 Verify Connection

After connecting, check:

```bash
npx wrangler pages project list
```

Should show:

```
Git Provider: GitHub
```

---

## 📝 Build Configuration Reference

**Build command:**

```bash
npx wrangler pages functions build
```

**Environment Variables:**

- CLOUDFLARE_ACCOUNT_ID: 625959b904a63f24f6bb7ec9b8c1ed7c
- SITE_URL: https://thesbsofficial.com
- ADMIN_ALLOWLIST_HANDLES: fredbademosi,thesbsofficial

**Secrets (don't touch, already configured):**

- CLOUDFLARE_API_TOKEN
- CLOUDFLARE_IMAGES_API_TOKEN
- CLOUDFLARE_IMAGES_HASH

---

## ⚡ Quick Test After Connection

1. Make a small change (add a comment to any file)
2. Commit and push:

```bash
git add .
git commit -m "Test auto-deploy"
git push origin MAIN
```

3. Watch Cloudflare dashboard for automatic deployment
4. Should see new deployment appear within 2 minutes

---

## 🆘 Need Help?

If GitHub connection fails:

1. Check GitHub permissions (Cloudflare needs repo access)
2. Try disconnecting and reconnecting GitHub authorization
3. Use manual wrangler deploy as backup
4. Contact Cloudflare support if persistent issues

---

**Ready to connect?** Open the dashboard link above! 🚀
