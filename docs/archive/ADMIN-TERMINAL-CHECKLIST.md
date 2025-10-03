# ✅ SBS Admin Terminal - Build Checklist

**Project:** SBS Unity v3 Admin Terminal  
**Start Date:** October 2, 2025  
**Target:** Production-ready admin system

---

## 📋 **Pre-Flight Checks**

- [x] Shop uses exactly 4 categories: BN-CLOTHES, BN-SHOES, PO-CLOTHES, PO-SHOES
- [x] Sizes documented: XS-XXL for clothes, UK/EU/US 3-14 for shoes
- [x] Self-explaining filename format defined
- [x] Current products API fetches 78 items from Cloudflare Images
- [x] Tag taxonomy reviewed and corrected

---

## 🔧 **Phase 1: Foundation (Week 1)**

### **Day 1-2: Database Setup**
- [ ] Create migration file: `database/migrations/001_inventory.sql`
- [ ] Add inventory table with all fields
- [ ] Add indexes for category, batch, size, deleted_at
- [ ] Test migration locally with wrangler
- [ ] Run migration on production D1

**SQL File:**
```sql
-- database/migrations/001_inventory.sql
CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cloudflare_image_id TEXT UNIQUE NOT NULL,
  sku TEXT UNIQUE,
  filename TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('BN-CLOTHES', 'BN-SHOES', 'PO-CLOTHES', 'PO-SHOES')),
  condition TEXT NOT NULL CHECK (condition IN ('BN', 'PO')),
  product_type TEXT NOT NULL CHECK (product_type IN ('CLOTHES', 'SHOES')),
  size TEXT,
  price_cents INTEGER,
  tags_json TEXT,
  batch_id TEXT,
  upload_date TEXT,
  metadata_json TEXT,
  deleted_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_category ON inventory(category);
CREATE INDEX idx_inventory_batch ON inventory(batch_id);
CREATE INDEX idx_inventory_size ON inventory(size);
CREATE INDEX idx_inventory_deleted ON inventory(deleted_at);
CREATE INDEX idx_inventory_upload_date ON inventory(upload_date);
```

### **Day 3: Filename Parser**
- [ ] Create `functions/lib/filename-parser.js`
- [ ] Implement parse() method with regex patterns
- [ ] Implement build() method for generation
- [ ] Add generateBatchId() helper
- [ ] Write 10 test cases with sample filenames
- [ ] Test with existing Cloudflare Images filenames

**Test Cases:**
```javascript
// Test 1: Full structured filename
"DESC-Nike-Air-Max-90-CAT-BN-SHOES-SIZE-UK-9-DATE-20250925-BATCH-B09251430-ITEM-001.jpeg"

// Test 2: No description
"CAT-PO-CLOTHES-SIZE-M-DATE-20250925-BATCH-B09251430-ITEM-002.jpeg"

// Test 3: With time
"DESC-Supreme-Box-Logo-CAT-BN-CLOTHES-SIZE-L-DATE-20250925-TIME-1430-BATCH-B09251430-ITEM-003.jpeg"

// Test 4: EU shoe size
"CAT-BN-SHOES-SIZE-EU-42-DATE-20250925-BATCH-B09251515-ITEM-001.jpeg"

// Test 5: Simple format
"SBS-BATCH-B09251430-ITEM-005-DATE-20250925.jpeg"

// Test 6-10: Edge cases, legacy formats, etc.
```

### **Day 4-5: API Endpoints**
- [ ] Create `functions/api/admin/inventory/scan.js`
  - Fetch all Cloudflare Images
  - Parse filenames
  - Return structured data
  
- [ ] Create `functions/api/admin/inventory/sync.js`
  - Parse all images
  - Insert/update inventory table
  - Return sync results
  
- [ ] Extend `functions/api/products.js`
  - Check if inventory table exists
  - If yes, query from D1 with filters
  - If no, fallback to Cloudflare Images API
  - Use parser for display names and tags

**Endpoints to create:**
```
GET  /api/admin/inventory/scan    - Preview what would be synced
POST /api/admin/inventory/sync    - Actually sync to database
GET  /api/admin/inventory/stats   - Show sync status, batch counts
GET  /api/products?category=BN-SHOES&size=UK-9  - Enhanced filtering
```

---

## 🎨 **Phase 2: Admin UI (Week 2)**

### **Day 6-7: Terminal Structure**
- [ ] Create `/public/admin-terminal/` directory
- [ ] Create `index.html` with dark theme
- [ ] Create `terminal.css` matching media hub style
- [ ] Create navigation: Dashboard, Inventory, Upload, Batches
- [ ] Add command palette (Ctrl+K to open)

**Directory Structure:**
```
/public/admin-terminal/
  index.html
  terminal.css
  terminal.js
  /lib/
    parser.js       (client-side parser)
    http.js         (fetch wrapper with CSRF)
    toast.js        (notifications)
    modal.js        (dialogs)
  /modules/
    dashboard.js
    inventory.js
    upload.js
    batches.js
```

### **Day 8: Inventory View**
- [ ] Build inventory grid with virtualization
- [ ] Display filename components as colored chips
- [ ] Add inline tag editor
- [ ] Add bulk select checkboxes
- [ ] Add filter sidebar (category, size, batch, date)
- [ ] Add search by filename/SKU

**UI Components:**
```html
<!-- Filename chip display -->
<div class="filename-viewer">
  <span class="chip chip-desc">DESC: Nike Air Max</span>
  <span class="chip chip-cat">CAT: BN-SHOES</span>
  <span class="chip chip-size">SIZE: UK-9</span>
  <span class="chip chip-date">DATE: 2025-09-25</span>
  <span class="chip chip-batch">BATCH: B09251430</span>
  <span class="chip chip-item">ITEM: 001</span>
</div>
```

### **Day 9: Upload Interface**
- [ ] Create drag-drop zone
- [ ] Add filename builder form
  - Category dropdown (4 options)
  - Size selector (dynamic based on category)
  - Description input (optional)
  - Batch ID display (auto-generated)
- [ ] Live filename preview
- [ ] Queue display with edit/remove
- [ ] Progress indicators for upload
- [ ] Success/error notifications

### **Day 10: Batch Management**
- [ ] Create batch timeline view
- [ ] Group items by batch
- [ ] Show batch stats (total items, upload date, categories)
- [ ] Batch actions: download CSV, bulk edit tags, archive
- [ ] Search batches by date range

---

## 🔗 **Phase 3: Integration (Week 3)**

### **Day 11-12: Shop Integration**
- [ ] Update shop.html filters to use new categories
- [ ] Add batch filter to shop
- [ ] Add "uploaded today" badge for new items
- [ ] Test filtering with synced inventory
- [ ] Update product cards with parsed data

### **Day 13: Sell Integration**
- [ ] Update sell.html upload form
- [ ] Add category/size selectors matching shop
- [ ] Generate structured filenames on upload
- [ ] Upload to R2 with structured names
- [ ] Create sell_requests table entry
- [ ] Link to inventory after approval

**sell_requests table:**
```sql
CREATE TABLE IF NOT EXISTS sell_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  batch_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'accepted', 'rejected')),
  items_json TEXT NOT NULL,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### **Day 14: Products API Enhancement**
- [ ] Add caching layer (KV or in-memory)
- [ ] Implement ETag support
- [ ] Add pagination (limit, offset)
- [ ] Add sorting (date, price, size)
- [ ] Add aggregations (count by category, sizes available)

---

## 🧪 **Phase 4: Testing & Polish (Week 4)**

### **Day 15-16: Testing**
- [ ] Test with 78 existing products
- [ ] Upload 10 new test items with structured names
- [ ] Test all filter combinations in shop
- [ ] Test batch upload (20+ items)
- [ ] Test sell request flow
- [ ] Test admin sync process
- [ ] Test bulk operations (tag 50 items)

### **Day 17: Performance**
- [ ] Optimize D1 queries with EXPLAIN
- [ ] Add request caching
- [ ] Implement lazy loading for inventory
- [ ] Test with 1000+ items simulation
- [ ] Measure API response times

### **Day 18: Documentation**
- [ ] Update README with setup steps
- [ ] Document all API endpoints
- [ ] Create admin user guide
- [ ] Document filename format for users
- [ ] Add troubleshooting section

### **Day 19-20: Deployment**
- [ ] Run migrations on production
- [ ] Sync all existing images
- [ ] Deploy admin terminal
- [ ] Test in production
- [ ] Monitor for errors
- [ ] Fix any issues

---

## 🎯 **Success Criteria**

### **Must Have**
- [ ] All 78 existing products synced to D1
- [ ] Structured filenames generated for new uploads
- [ ] Shop filters work with new system
- [ ] Admin can bulk upload with proper naming
- [ ] Batch tracking functional
- [ ] No breaking changes to existing shop

### **Should Have**
- [ ] Command palette for quick actions
- [ ] Batch operations (tag, delete, restore)
- [ ] Real-time sync status
- [ ] CSV export/import
- [ ] Audit log for admin actions

### **Nice to Have**
- [ ] AI-powered filename suggestions
- [ ] Duplicate detection
- [ ] Price recommendations
- [ ] Analytics dashboard
- [ ] Mobile-responsive admin

---

## 🚨 **Known Risks & Mitigation**

### **Risk 1: Existing filenames don't match pattern**
**Mitigation:** Parser falls back to guessing, admin can manually fix

### **Risk 2: D1 query performance with 1000s of items**
**Mitigation:** Proper indexes, pagination, caching

### **Risk 3: Cloudflare Images API rate limits**
**Mitigation:** Cache responses, batch operations, sync incrementally

### **Risk 4: Breaking existing shop during migration**
**Mitigation:** Fallback logic, feature flags, gradual rollout

---

## 📊 **Progress Tracking**

**Week 1:** __% (Database + Parser + API)  
**Week 2:** __% (Admin UI + Upload Interface)  
**Week 3:** __% (Shop/Sell Integration)  
**Week 4:** __% (Testing + Polish + Deploy)

**Overall:** __% Complete

---

## 🔄 **Daily Standup Template**

**Yesterday:**
- [ ] What was completed?

**Today:**
- [ ] What will be worked on?

**Blockers:**
- [ ] Any issues or questions?

---

**Last Updated:** October 2, 2025  
**Next Review:** After Phase 1 completion
