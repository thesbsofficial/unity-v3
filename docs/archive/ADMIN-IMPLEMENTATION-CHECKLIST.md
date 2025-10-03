# ✅ **SBS ADMIN TERMINAL - IMPLEMENTATION CHECKLIST**

**Project:** SBS Unity Admin System  
**Date:** October 2, 2025  
**Goal:** Build filename-driven admin terminal for shop + sell uploads

---

## 📋 **PHASE 1: FOUNDATION** (Week 1)

### **Database Setup**
- [ ] Create `inventory` table in D1
  - [ ] Add columns: `id`, `cloudflare_image_id`, `filename`, `condition`, `category`, `size`, `batch`, `upload_date`, `item_number`, `tags_json`, `sku`, `created_at`, `deleted_at`
  - [ ] Add index: `idx_category_size`
  - [ ] Add index: `idx_batch`
  - [ ] Test with sample data

- [ ] Create `sell_requests` table in D1
  - [ ] Add columns: `id`, `user_id`, `batch_id`, `items_json`, `status`, `created_at`
  - [ ] Add index: `idx_status`
  - [ ] Add index: `idx_batch_id`

### **Filename Parser Library**
- [ ] Create `/functions/lib/filename-parser.js`
  - [ ] Parse CAT-{CONDITION}-{CATEGORY} format
  - [ ] Parse SIZE-{SIZE} format (handle odd sizes like "L-TOP-XL-BOTTOM")
  - [ ] Parse DATE-{YYYYMMDD} format
  - [ ] Parse BATCH-{B+MMDDHHMM} format
  - [ ] Parse ITEM-{001} format
  - [ ] Generate auto-tags from components
  - [ ] Export as ES module

- [ ] Test parser with all examples
  - [ ] Test: `CAT-BN-STREETWEAR-SIZE-M-DATE-20250925-BATCH-B09251430-ITEM-001.jpeg`
  - [ ] Test: `CAT-PO-SHOES-SIZE-UK-9-5-DATE-20250925-BATCH-B09251430-ITEM-002.jpeg`
  - [ ] Test: `CAT-BN-STREETWEAR-SIZE-L-TOP-XL-BOTTOM-DATE-20250925-BATCH-B09251430-ITEM-003.jpeg`
  - [ ] Test: `CAT-PO-TECH-DATE-20250925-BATCH-B09251430-ITEM-004.jpeg`

---

## 📋 **PHASE 2: API ENDPOINTS** (Week 2)

### **Inventory Sync Endpoint**
- [ ] Create `/functions/api/admin/inventory/sync.ts`
  - [ ] Fetch all images from Cloudflare Images API
  - [ ] Parse each filename using parser library
  - [ ] Insert/update inventory table
  - [ ] Return sync stats (added, updated, errors)
  - [ ] Add RBAC check (admin only)
  - [ ] Add rate limiting

### **Enhanced Products API**
- [ ] Update `/functions/api/products.js`
  - [ ] Add D1 query fallback for inventory table
  - [ ] Add filter by: `category`, `condition`, `size`, `batch`
  - [ ] Add search by: `tags`, `filename`, `sku`
  - [ ] Add pagination: `page`, `limit`
  - [ ] Return with parsed metadata
  - [ ] Keep existing Cloudflare Images fallback

### **Upload Endpoint for Sell Page**
- [ ] Create `/functions/api/sell/upload.ts`
  - [ ] Accept multipart form data
  - [ ] Generate batch ID (B+MMDDHHMM format)
  - [ ] Generate filename for each upload using taxonomy
  - [ ] Upload to R2 bucket: `USER_UPLOADS`
  - [ ] Also upload to Cloudflare Images for CDN
  - [ ] Store in `sell_requests` table
  - [ ] Return batch ID and item list

---

## 📋 **PHASE 3: ADMIN TERMINAL UI** (Week 3)

### **Base Terminal Structure**
- [ ] Create `/public/admin-terminal/` directory
- [ ] Create `index.html` with dark theme (match media hub)
  - [ ] Header with SBS branding
  - [ ] Command palette (Ctrl+K)
  - [ ] Navigation tabs: Dashboard, Inventory, Sell Requests, Upload
  - [ ] Status bar showing batch info

### **Inventory View**
- [ ] Create inventory grid component
  - [ ] Display products with parsed filename components
  - [ ] Color-code components (DESC=blue, CAT=red, SIZE=green, etc.)
  - [ ] Filter sidebar:
    - Category buttons (STREETWEAR, SHOES, TECH, JEWELLERY)
    - Condition pills (BN, PO)
    - Size dropdown (dynamic based on category)
    - Batch search
  - [ ] Batch grouping view
  - [ ] Click item to see full details

### **Sell Requests View**
- [ ] Create sell requests table
  - [ ] Show: batch ID, user, status, item count, date
  - [ ] Filter by status: pending, reviewing, accepted, rejected
  - [ ] Click to expand and see all items in request
  - [ ] Approve/reject buttons (admin only)
  - [ ] View uploaded photos

### **Bulk Upload View**
- [ ] Create upload interface
  - [ ] Drag-drop zone
  - [ ] Filename builder form:
    - Category select (4 options)
    - Condition toggle (BN/PO)
    - Size dropdown (dynamic based on category)
    - Auto-generate batch ID button
  - [ ] Preview with generated filenames
  - [ ] Upload progress for each file
  - [ ] Success/error summary

---

## 📋 **PHASE 4: SHOP INTEGRATION** (Week 4)

### **Update Shop Filters**
- [ ] Update `/public/shop.html`
  - [ ] Add category filter UI matching taxonomy
  - [ ] Add size filter (show/hide based on category)
  - [ ] Update products display to use parsed data
  - [ ] Add batch indicator badge on products

### **Update Sell Page**
- [ ] Update `/public/sell.html`
  - [ ] Confirm QB.sizes matches taxonomy (already done)
  - [ ] Confirm QB.brands matches taxonomy (already done)
  - [ ] Add filename preview in form
  - [ ] Show generated batch ID before upload

---

## 📋 **PHASE 5: TESTING & DEPLOYMENT**

### **Testing Checklist**
- [ ] Test filename parser with all size variants
- [ ] Test upload with each category
- [ ] Test odd sizes (mixed top/bottom)
- [ ] Test half shoe sizes (UK-6-5, etc.)
- [ ] Test batch operations (view all items in batch)
- [ ] Test filters in shop (category + size combos)
- [ ] Test admin RBAC (non-admin blocked)
- [ ] Test sell request workflow (submit → review → approve)

### **Deployment Steps**
- [ ] Run database migrations
- [ ] Deploy filename parser library
- [ ] Deploy API endpoints
- [ ] Deploy admin terminal
- [ ] Update shop/sell pages
- [ ] Run initial inventory sync
- [ ] Monitor logs for errors

---

## 🎯 **SUCCESS CRITERIA**

### **Admin Can:**
- [ ] See all inventory with parsed filenames
- [ ] Filter by category + condition + size
- [ ] View items grouped by batch
- [ ] Upload new items with auto-generated filenames
- [ ] Review sell requests with uploaded photos
- [ ] Approve/reject sell requests

### **Shop Shows:**
- [ ] Products filtered by exact taxonomy
- [ ] Size filter appears only for STREETWEAR and SHOES
- [ ] Correct sizes for each category
- [ ] Batch indicators on products

### **Sell Page:**
- [ ] Generates correct filenames on upload
- [ ] Creates batch ID automatically
- [ ] Validates sizes against taxonomy
- [ ] Stores in sell_requests table

---

## 📊 **PROGRESS TRACKING**

**Status:** Planning Phase  
**Next Action:** Create inventory table schema  
**Blockers:** None

---

## 🔗 **KEY FILES**

| File | Purpose | Status |
|------|---------|--------|
| `docs/IMPORTANT-SBS-TAXONOMY.md` | ✅ Single source of truth | COMPLETE |
| `functions/lib/filename-parser.js` | Parse self-explaining names | TODO |
| `functions/api/products.js` | Enhanced with D1 queries | TODO |
| `functions/api/admin/inventory/sync.ts` | Sync Cloudflare Images → D1 | TODO |
| `functions/api/sell/upload.ts` | Handle sell uploads | TODO |
| `public/admin-terminal/index.html` | Admin UI | TODO |
| `public/shop.html` | Updated filters | TODO |
| `public/sell.html` | Already correct | ✅ DONE |

---

## ⚠️ **CRITICAL REMINDERS**

1. **NO BRAND NAMES IN FILENAMES** - Brands stored separately
2. **ONLY 4 CATEGORIES** - STREETWEAR, SHOES, TECH, JEWELLERY
3. **ONLY 2 CONDITIONS** - BN, PO
4. **EXACT SIZES ONLY** - From taxonomy document
5. **BATCH FORMAT** - Must be B+MMDDHHMM
6. **ITEM FORMAT** - Must be 001-999

---

**Last Updated:** October 2, 2025  
**Owner:** SBS Admin Team
