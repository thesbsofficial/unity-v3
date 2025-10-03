# 🚀 SBS Unity V3 - Quick Deploy Guide

## Production Deployment (Updates thesbsofficial.com)

**Simple One-Command Deploy:**
```powershell
.\scripts\deploy-production.ps1
```

That's it! This will:
- ✅ Deploy to main branch (production)
- ✅ Update https://thesbsofficial.com
- ✅ Force upload all files (even if unchanged)
- ✅ Deploy all Workers/Functions

---

## 🔬 System Test Page

After deploying, test everything at:
- **https://thesbsofficial.com/debug.html** ← Easy to remember!
- **https://thesbsofficial.com/test.html**
- **https://thesbsofficial.com/admin/system-test.html**

Or click **🔬 System Test** button in your admin panel!

---

## 📍 Admin Access

- **Main Admin:** https://thesbsofficial.com/admin/
- **Inventory Manager:** https://thesbsofficial.com/admin/inventory/
- **Overview Dashboard:** https://thesbsofficial.com/admin/overview.html
- **System Test:** https://thesbsofficial.com/debug.html

---

## ⚡ Quick Commands

```powershell
# Navigate to project
cd "C:\Users\fredb\Desktop\unity-v3\public (4)"

# Deploy to PRODUCTION (main branch)
.\scripts\deploy-production.ps1
```

---

## 🎯 What Gets Deployed

When you run `deploy-production.ps1`, everything updates:
- ✅ All HTML pages (shop, admin, etc.)
- ✅ All API endpoints (/functions/api/)
- ✅ Admin panels and tools
- ✅ System test page
- ✅ Cloudflare Images integration
- ✅ Smart filename generator

---

## 🔑 Remember

- **Always use `deploy-production.ps1`** to update your live site (main branch)
- The script includes `--commit-dirty=true` so you don't need to commit first
- Check the system test page after deploying to verify everything works

---

## ⚡ BONUS: See Changes Instantly!

**Enable Development Mode in Cloudflare:**

1. Go to: https://dash.cloudflare.com/
2. Select **thesbsofficial.com** 
3. Click **Caching** → Toggle **Development Mode ON**
4. Now when you deploy, changes appear instantly (no cache wait!)

**Full guide:** See `DEVELOPMENT-MODE.md`

---

**That's it! Just run `.\scripts\deploy-production.ps1` whenever you want to update your site! 🚀**
