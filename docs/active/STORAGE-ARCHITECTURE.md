# Storage Architecture - SBS Sell Platform

## Overview
This document outlines the storage strategy for user-uploaded photos separate from business/product images.

## Storage Strategy

### 1. **Cloudflare Images** (Your existing setup - KEEP USING THIS)
- **Purpose**: Official product photos, marketing images, hero images, shop products
- **Access**: Public read via Cloudflare Images CDN with variants
- **Management**: Admin-controlled uploads only via dashboard
- **URL Pattern**: `https://imagedelivery.net/{account-hash}/{image-id}/public`
- **Features**: 
  - Automatic image optimization
  - Multiple variants (thumbnail, medium, large)
  - Built-in CDN delivery
  - Image resizing on-the-fly
- **Cost**: $5/month for 100,000 images + $1/month per 100,000 additional
- **Use for**: Shop listings, hero images, brand logos, marketing content
- ⚠️ **DO NOT** mix user submissions here

### 2. **Cloudflare R2 - User Uploads** (NEW - for seller photos)
- **Bucket**: `sbs-user-uploads`
- **Purpose**: User-submitted item photos from Quick Builder
- **Access**: Private by default, signed URLs for viewing
- **Lifecycle**: Auto-delete after 60 days (or after case closed)
- **URL Pattern**: `https://pub-{id}.r2.dev/{case-id}/{filename}`
- **Folder Structure**:
  ```
  sbs-user-uploads/
  ├── cases/
  │   ├── CASE-2025-001/
  │   │   ├── photo-1.jpg
  │   │   ├── photo-2.jpg
  │   │   └── photo-3.jpg
  │   ├── CASE-2025-002/
  │   └── ...
  └── temp/
      └── {upload-session-id}/
  ```

## D1 Database Schema

```sql
-- sell_cases table
CREATE TABLE sell_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id TEXT UNIQUE NOT NULL,         -- e.g., 'CASE-2025-001'
    user_id INTEGER,                       -- NULL if not registered
    category TEXT NOT NULL,
    brand TEXT NOT NULL,
    condition TEXT NOT NULL,
    size TEXT,
    price REAL NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    eircode TEXT,
    defects TEXT,
    contact_phone TEXT NOT NULL,           -- E.164 format
    contact_channel TEXT NOT NULL,         -- 'instagram' or 'snapchat'
    contact_handle TEXT NOT NULL,          -- username
    contact_email TEXT,
    photo_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',         -- pending, reviewing, offered, accepted, rejected, collected
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- case_photos table (references to R2)
CREATE TABLE case_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    r2_key TEXT NOT NULL,                  -- Full R2 path: cases/{case-id}/{filename}
    file_size INTEGER,                      -- bytes
    mime_type TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES sell_cases(case_id) ON DELETE CASCADE
);

-- Index for faster lookups
CREATE INDEX idx_case_photos_case_id ON case_photos(case_id);
CREATE INDEX idx_sell_cases_status ON sell_cases(status);
CREATE INDEX idx_sell_cases_created ON sell_cases(created_at);
```

## Photo Upload Flow

### Frontend (sell.html)
```javascript
// When user selects photos
const photoInput = document.createElement('input');
photoInput.type = 'file';
photoInput.accept = 'image/jpeg,image/png,image/webp';
photoInput.multiple = true;
photoInput.max = 5; // Max 5 photos per submission

photoInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    
    // Validate: max 10MB per file
    for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
            alert('Each photo must be under 10MB');
            return;
        }
    }
    
    // Upload to backend
    const formData = new FormData();
    files.forEach(file => formData.append('photos', file));
    
    const response = await fetch('/api/cases/upload-photos', {
        method: 'POST',
        body: formData
    });
    
    const { uploadIds } = await response.json();
    // Store uploadIds for later submission
});
```

### Backend (Cloudflare Pages Function)

**File**: `functions/api/cases/upload-photos.js`
```javascript
export async function onRequestPost(context) {
    const { request, env } = context;
    const formData = await request.formData();
    const photos = formData.getAll('photos');
    
    // Generate temporary upload session
    const sessionId = crypto.randomUUID();
    const uploadedFiles = [];
    
    for (const photo of photos) {
        const filename = `${Date.now()}-${photo.name}`;
        const r2Key = `temp/${sessionId}/${filename}`;
        
        // Upload to R2 user-uploads bucket
        await env.USER_UPLOADS_R2.put(r2Key, photo.stream(), {
            httpMetadata: {
                contentType: photo.type
            }
        });
        
        uploadedFiles.push({
            filename,
            r2Key,
            size: photo.size,
            mimeType: photo.type
        });
    }
    
    return Response.json({
        sessionId,
        uploadedFiles
    });
}
```

**File**: `functions/api/cases/submit.js`
```javascript
export async function onRequestPost(context) {
    const { request, env } = context;
    const data = await request.json();
    
    // Generate case ID
    const caseId = await generateCaseId(env.DB);
    
    // Insert case into D1
    await env.DB.prepare(`
        INSERT INTO sell_cases (
            case_id, category, brand, condition, size, price,
            address, city, eircode, defects,
            contact_phone, contact_channel, contact_handle, contact_email,
            photo_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        caseId,
        data.category,
        data.brand,
        data.condition,
        data.size,
        data.price,
        data.address,
        data.city,
        data.eircode,
        data.defects,
        data.phone,
        data.socialChannel,
        data.socialHandle,
        data.email,
        data.uploadedFiles.length
    ).run();
    
    // Move photos from temp to permanent case folder
    for (const file of data.uploadedFiles) {
        const newKey = `cases/${caseId}/${file.filename}`;
        
        // Copy from temp to permanent
        const tempObject = await env.USER_UPLOADS_R2.get(file.r2Key);
        await env.USER_UPLOADS_R2.put(newKey, tempObject.body, {
            httpMetadata: {
                contentType: file.mimeType
            }
        });
        
        // Delete temp file
        await env.USER_UPLOADS_R2.delete(file.r2Key);
        
        // Store reference in D1
        await env.DB.prepare(`
            INSERT INTO case_photos (case_id, filename, r2_key, file_size, mime_type)
            VALUES (?, ?, ?, ?, ?)
        `).bind(caseId, file.filename, newKey, file.size, file.mimeType).run();
    }
    
    // Send confirmation email/SMS
    // ...
    
    return Response.json({
        success: true,
        caseId
    });
}
```

## Wrangler Configuration

**File**: `wrangler.toml`
```toml
name = "unity-v3"
compatibility_date = "2024-09-30"
pages_build_output_dir = "./public"

# D1 Database binding for user authentication and orders
[[d1_databases]]
binding = "DB"
database_name = "unity-v3"
database_id = "1235f2c7-7b73-44b7-95c2-b44260e51179"

# R2 Bucket for user-uploaded seller photos ONLY
# (Keep using Cloudflare Images dashboard for your official product images)
[[r2_buckets]]
binding = "USER_UPLOADS"
bucket_name = "sbs-user-uploads"
```

## Summary of Image Storage

| Image Type | Storage Solution | Access Method | Use Case |
|------------|-----------------|---------------|----------|
| **Your Product Images** | Cloudflare Images (Dashboard) | `imagedelivery.net/{account}//{image-id}/public` | Shop products, hero images, logos |
| **User Seller Photos** | R2 `sbs-user-uploads` | Signed URLs (1-hour expiry) | Quick Builder submissions |

**Key Point**: Continue uploading all your official images through the Cloudflare Images dashboard. The R2 bucket is ONLY for temporary user submissions that will be reviewed and deleted after 30 days.

## R2 Bucket Setup

```bash
# Create user uploads bucket
wrangler r2 bucket create sbs-user-uploads

# Set CORS policy for user uploads (if needed)
wrangler r2 bucket cors put sbs-user-uploads --config cors.json
```

**File**: `cors.json`
```json
{
  "AllowedOrigins": ["https://unity-v3.pages.dev", "https://yourdomain.com"],
  "AllowedMethods": ["GET", "PUT", "POST"],
  "AllowedHeaders": ["*"],
  "MaxAgeSeconds": 3600
}
```

## Admin Photo Viewing

**File**: `functions/api/admin/case-photos/[caseId].js`
```javascript
export async function onRequestGet(context) {
    const { params, env } = context;
    const { caseId } = params;
    
    // Auth check here
    // ...
    
    // Get all photos for this case
    const photos = await env.DB.prepare(`
        SELECT * FROM case_photos WHERE case_id = ?
    `).bind(caseId).all();
    
    // Generate signed URLs (valid for 1 hour)
    const photosWithUrls = await Promise.all(
        photos.results.map(async (photo) => {
            const r2Object = await env.USER_UPLOADS_R2.get(photo.r2_key);
            
            // Create temporary public URL
            const signedUrl = await env.USER_UPLOADS_R2.createSignedUrl(
                photo.r2_key,
                3600 // 1 hour expiry
            );
            
            return {
                ...photo,
                url: signedUrl
            };
        })
    );
    
    return Response.json(photosWithUrls);
}
```

## Lifecycle Management

### Automatic Cleanup (via Cloudflare Worker Cron)

**File**: `src/cleanup-worker.js`
```javascript
export default {
    async scheduled(event, env, ctx) {
        // Delete temp uploads older than 24 hours
        const tempObjects = await env.USER_UPLOADS_R2.list({
            prefix: 'temp/'
        });
        
        const now = Date.now();
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        
        for (const obj of tempObjects.objects) {
            if (obj.uploaded.getTime() < oneDayAgo) {
                await env.USER_UPLOADS_R2.delete(obj.key);
            }
        }
        
        // Delete case photos for closed cases older than 60 days
        const oldCases = await env.DB.prepare(`
            SELECT case_id FROM sell_cases 
            WHERE status IN ('collected', 'rejected')
            AND updated_at < datetime('now', '-60 days')
        `).all();
        
        for (const case of oldCases.results) {
            // Delete all photos for this case
            const photos = await env.DB.prepare(`
                SELECT r2_key FROM case_photos WHERE case_id = ?
            `).bind(case.case_id).all();
            
            for (const photo of photos.results) {
                await env.USER_UPLOADS_R2.delete(photo.r2_key);
            }
            
            // Clean up database records
            await env.DB.prepare(`
                DELETE FROM case_photos WHERE case_id = ?
            `).bind(case.case_id).run();
        }
    }
};
```

**In wrangler.toml**:
```toml
[triggers]
crons = ["0 2 * * *"]  # Run at 2 AM daily
```

## Cost Estimation

### R2 Storage (User Uploads)
- **Storage**: $0.015/GB/month
- **Class A Operations** (PUT/COPY): $4.50/million
- **Class B Operations** (GET/LIST): $0.36/million
- **Egress**: FREE

**Example**: 1000 cases/month × 3 photos × 2MB = 6GB
- Storage: $0.09/month
- Uploads: ~3000 PUTs = $0.01
- Views: ~15,000 GETs = $0.01
- **Total**: ~$0.11/month

### D1 Database
- **Reads**: 25 million/day (free)
- **Writes**: 50,000/day (free)
- **Storage**: 5GB (free)

## Security Checklist

✅ User uploads in separate bucket from product images  
✅ Private by default (signed URLs only)  
✅ Max file size validation (10MB)  
✅ File type validation (JPEG/PNG/WebP only)  
✅ Automatic cleanup of temp files (24 hours)  
✅ CORS policy restricts origins  
✅ Admin authentication required for viewing  
✅ Auto-delete old case photos (60 days after case closed)  

## How to Upload Your Official Images (Cloudflare Images)

1. Go to Cloudflare Dashboard → Images
2. Click "Upload Images"
3. Drag & drop or select files
4. Copy the image URL: `https://imagedelivery.net/YOUR_ACCOUNT_HASH/IMAGE_ID/public`
5. Use in your shop listings, hero sections, etc.

**Example in HTML:**
```html
<!-- Your product images from Cloudflare Images -->
<img src="https://imagedelivery.net/YOUR_HASH/abc123/public" alt="Zara Dress">

<!-- With variants for different sizes -->
<img src="https://imagedelivery.net/YOUR_HASH/abc123/thumbnail" alt="Zara Dress Thumbnail">
<img src="https://imagedelivery.net/YOUR_HASH/abc123/large" alt="Zara Dress Large">
```

## Migration Path

You don't need to migrate anything! Just:
1. ✅ Keep using Cloudflare Images dashboard for all your official images
2. ✅ R2 `sbs-user-uploads` bucket is ready for user submissions
3. ✅ D1 database schema created for sell cases
4. ⏳ Next: Implement photo upload in Quick Builder (connects to R2 only)

---

**Setup Complete:**
- ✅ R2 bucket `sbs-user-uploads` created
- ✅ D1 tables created: `sell_cases`, `case_photos`, `case_notes`
- ✅ Wrangler config updated with R2 binding
- ✅ Cloudflare Images: Keep using for your products

**Next Steps:**
1. Implement photo upload UI in Quick Builder
2. Create `/api/cases/upload-photos` endpoint (R2 only)
3. Create `/api/cases/submit` endpoint (D1 + R2)
4. Build admin dashboard to review submissions
