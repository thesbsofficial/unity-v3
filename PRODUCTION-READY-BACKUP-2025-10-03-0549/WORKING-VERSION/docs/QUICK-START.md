# 🚀 SBS Media Hub - Quick Start Guide

## Installation & Setup

### 1. Extract Files
Place all files in a dedicated folder on your admin system.

### 2. Launch Server
Double-click `start-media-hub-FINAL.bat`
- Starts CORS-free server on localhost:3000
- Launches Brave browser automatically
- Required for Cloudflare API access

### 3. Upload Images
1. Click "📤 Test Upload"
2. Select JPEG images only (.jpg, .jpeg)
3. Choose Category & Size
4. Select Site Section Tag (Featured, Sale, etc.)
5. Click "🚀 Upload Images"

## Key Features

✅ **JPEG-Only Uploads** - Validated file types  
✅ **1080x1920 Format** - Instagram/Snapchat story format  
✅ **Tag System** - Organizes content for website sections  
✅ **No Cropping** - Full image visibility with pricing details  
✅ **Admin Logging** - Comprehensive error tracking  
✅ **Ready for Integration** - Drop into existing admin system  

## Integration Notes

- **Pricing:** All pricing written on photos (no system pricing)
- **Tags:** Feed different sections of main website automatically
- **Format:** Perfect for social media and mobile display
- **Modular:** Designed for easy admin system integration

---

## 📞 Support Notes

### If Uploads Fail:
1. Check logs with "📋 Show Logs" button
2. Ensure JPEG files only
3. Verify server is running (localhost:3000)
4. Check internet connection for Cloudflare API

### Common Issues:
- **Port conflicts:** Change from 3000 to another port in batch file
- **CORS errors:** Use provided server, don't access directly via file://
- **Authentication:** API token is embedded and working as of creation date

---

**Created:** September 25, 2025  
**Version:** Final Working - Ready for Admin Integration  
**Status:** ✅ STABLE - DO NOT MODIFY