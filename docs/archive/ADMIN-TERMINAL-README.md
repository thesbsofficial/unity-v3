# 🚀 SBS Admin Terminal - Implementation Guide

**Version:** 1.0  
**Date:** October 2, 2025  
**Status:** Planning Phase

---

## 📦 **ACTUAL Categories (From shop.html)**

Your shop uses exactly **4 categories**:

1. **BN-CLOTHES** - Brand New Clothes  
2. **BN-SHOES** - Brand New Shoes  
3. **PO-CLOTHES** - Pre-Owned Clothes  
4. **PO-SHOES** - Pre-Owned Shoes  

**That's it. Nothing else.**

---

## 📏 **ACTUAL Size Systems**

### **Clothing Sizes (BN-CLOTHES, PO-CLOTHES)**
```
XS, S, M, L, XL, XXL
```

### **Shoe Sizes (BN-SHOES, PO-SHOES)**
```
UK: 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 13, 14
EU: 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48
US: 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 13, 14
```

### **Special Sizes**
```
One Size, OS (for accessories/misc)
```

---

## 🏷️ **Self-Explaining Filename Format**

### **Standard Format**
```
CAT-{CONDITION}-{TYPE}-SIZE-{SIZE}-DATE-{YYYYMMDD}-BATCH-{BATCHID}-ITEM-{NUMBER}.jpeg
```

### **With Description** 
```
DESC-{PRODUCT-NAME}-CAT-{CONDITION}-{TYPE}-SIZE-{SIZE}-DATE-{YYYYMMDD}-BATCH-{BATCHID}-ITEM-{NUMBER}.jpeg
```

### **Examples from YOUR system**
```javascript
// Brand new Nike shoes UK 9
"DESC-Nike-Air-Max-CAT-BN-SHOES-SIZE-UK-9-DATE-20250925-BATCH-B09251430-ITEM-001.jpeg"

// Pre-owned medium t-shirt
"DESC-Supreme-Box-Logo-CAT-PO-CLOTHES-SIZE-M-DATE-20250925-BATCH-B09251430-ITEM-002.jpeg"

// Category first (no description)
"CAT-BN-SHOES-SIZE-UK-10-DATE-20250925-BATCH-B09251430-ITEM-003.jpeg"

// Simple format
"SBS-BATCH-B09251430-ITEM-004-DATE-20250925.jpeg"
```

---

## 🔧 **Component Breakdown**

### **DESC (Optional)**
- Product name/description
- Replace spaces with hyphens
- Examples: `Nike-Air-Max`, `Supreme-Box-Logo`, `Adidas-Yeezy`

### **CAT (Required)**
- Format: `CAT-{CONDITION}-{TYPE}`
- Condition: `BN` or `PO`
- Type: `CLOTHES` or `SHOES`
- Examples: `CAT-BN-CLOTHES`, `CAT-PO-SHOES`

### **SIZE (Conditional)**
- Required for clothes and shoes
- Format: `SIZE-{SYSTEM}-{VALUE}` or `SIZE-{VALUE}`
- Clothes: `SIZE-M`, `SIZE-L`, `SIZE-XL`
- Shoes: `SIZE-UK-9`, `SIZE-EU-42`, `SIZE-US-10`

### **DATE (Required)**
- Format: `DATE-YYYYMMDD`
- Example: `DATE-20250925` (September 25, 2025)

### **TIME (Optional)**
- Format: `TIME-HHMM`
- Example: `TIME-1430` (2:30 PM)

### **BATCH (Required)**
- Format: `BATCH-BMMDDHHMM`
- Batch ID starts with `B` followed by 8 digits
- Example: `BATCH-B09251430` (September 25, 2:30 PM)

### **ITEM (Required)**
- Format: `ITEM-NNN` (3 digits, zero-padded)
- Sequential number within batch
- Examples: `ITEM-001`, `ITEM-099`, `ITEM-150`

---

## 📊 **Tags Auto-Generated from Filename**

Your system generates 5 tags automatically from the filename:

```javascript
// Example: DESC-Nike-Air-Max-CAT-BN-SHOES-SIZE-UK-9-DATE-20250925-BATCH-B09251430-ITEM-001.jpeg

Tags Generated:
1. "nike" (from DESC)
2. "shoes" (from CAT type)
3. "brand-new" (from CAT condition)
4. "uk-9" (from SIZE)
5. "batch-B09251430" (from BATCH)
```

### **Tag Rules**
- **Condition tags**: `BN` → `brand-new`, `deadstock` | `PO` → `pre-owned`, `vintage`
- **Type tags**: `SHOES` → `footwear`, `sneakers` | `CLOTHES` → `apparel`, `streetwear`
- **Brand detection**: Extract from DESC (Nike, Adidas, Supreme, etc.)
- **Size tags**: Include size as-is (`uk-9`, `m`, `xl`)
- **Batch tags**: For tracking and bulk operations

---

## 🗂️ **Database Schema**

### **inventory table**
```sql
CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cloudflare_image_id TEXT UNIQUE NOT NULL,
  sku TEXT UNIQUE,                -- SBS-{BATCH}-{ITEM}
  filename TEXT NOT NULL,
  title TEXT NOT NULL,            -- Display name
  category TEXT NOT NULL,         -- BN-CLOTHES, BN-SHOES, PO-CLOTHES, PO-SHOES
  condition TEXT NOT NULL,        -- BN or PO
  product_type TEXT NOT NULL,     -- CLOTHES or SHOES
  size TEXT,                      -- M, UK-9, etc
  price_cents INTEGER,
  tags_json TEXT,                 -- ["nike", "shoes", "brand-new", "uk-9", "batch-B09251430"]
  batch_id TEXT,                  -- B09251430
  upload_date TEXT,               -- 2025-09-25
  metadata_json TEXT,             -- Full parsed components
  deleted_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_category ON inventory(category);
CREATE INDEX idx_inventory_batch ON inventory(batch_id);
CREATE INDEX idx_inventory_size ON inventory(size);
CREATE INDEX idx_inventory_deleted ON inventory(deleted_at);
```

---

## 🎯 **Filename Parser Implementation**

```javascript
// /functions/lib/filename-parser.js
export class SBSFilenameParser {
  constructor() {
    // EXACT categories from your shop
    this.categories = ['BN-CLOTHES', 'BN-SHOES', 'PO-CLOTHES', 'PO-SHOES'];
    
    // EXACT sizes from your shop
    this.clothingSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    this.shoeSizesUK = ['3', '3.5', '4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '13', '14'];
    this.shoeSizesEU = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48'];
    this.shoeSizesUS = ['4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '13', '14'];
  }

  parse(filename) {
    const result = {
      original: filename,
      description: null,
      category: null,      // Full category (e.g., "BN-SHOES")
      condition: null,     // BN or PO
      productType: null,   // CLOTHES or SHOES
      size: null,
      sizeSystem: null,    // UK, EU, US (for shoes)
      date: null,
      time: null,
      batch: null,
      itemNumber: null,
      tags: [],
      sku: null,
      displayName: ''
    };

    // Parse DESC
    const descMatch = filename.match(/DESC-([^-]+(?:-[^-]+)*?)(?=-CAT|-SIZE|-DATE|-BATCH|-ITEM|$)/i);
    if (descMatch) {
      result.description = descMatch[1].replace(/-/g, ' ');
      result.displayName = result.description;
    }

    // Parse CAT (REQUIRED)
    const catMatch = filename.match(/CAT-(BN|PO)-(CLOTHES|SHOES)/i);
    if (catMatch) {
      result.condition = catMatch[1].toUpperCase();
      result.productType = catMatch[2].toUpperCase();
      result.category = `${result.condition}-${result.productType}`;
      
      // Add condition tags
      if (result.condition === 'BN') {
        result.tags.push('brand-new', 'deadstock');
      } else {
        result.tags.push('pre-owned', 'vintage');
      }
      
      // Add type tags
      if (result.productType === 'SHOES') {
        result.tags.push('footwear', 'sneakers');
      } else {
        result.tags.push('apparel', 'streetwear');
      }
    }

    // Parse SIZE
    const sizeMatch = filename.match(/SIZE-(?:(UK|EU|US)-)?([0-9]+(?:\.[5])?|XS|S|M|L|XL|XXL)/i);
    if (sizeMatch) {
      result.sizeSystem = sizeMatch[1] ? sizeMatch[1].toUpperCase() : null;
      result.size = result.sizeSystem ? `${result.sizeSystem}-${sizeMatch[2]}` : sizeMatch[2];
      result.tags.push(result.size.toLowerCase());
    }

    // Parse DATE
    const dateMatch = filename.match(/DATE-(\d{8})/);
    if (dateMatch) {
      const dateStr = dateMatch[1];
      result.date = `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`;
    }

    // Parse TIME
    const timeMatch = filename.match(/TIME-(\d{4})/);
    if (timeMatch) {
      result.time = timeMatch[1];
    }

    // Parse BATCH
    const batchMatch = filename.match(/BATCH-([B]\d{8})/);
    if (batchMatch) {
      result.batch = batchMatch[1];
      result.tags.push(`batch-${result.batch}`);
    }

    // Parse ITEM
    const itemMatch = filename.match(/ITEM-(\d{3})/);
    if (itemMatch) {
      result.itemNumber = itemMatch[1];
      result.sku = `SBS-${result.batch}-${result.itemNumber}`;
    }

    // Generate display name if not set
    if (!result.displayName) {
      result.displayName = `${result.category || 'Item'} ${result.size || ''}`.trim();
    }

    return result;
  }

  generateBatchId() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    return `B${month}${day}${hour}${minute}`;
  }

  build(options) {
    const parts = [];
    
    // Optional description
    if (options.description) {
      parts.push('DESC', options.description.replace(/\s+/g, '-'));
    }
    
    // Required category
    parts.push('CAT', options.category || 'BN-CLOTHES');
    
    // Conditional size
    if (options.size) {
      parts.push('SIZE');
      if (options.sizeSystem) {
        parts.push(`${options.sizeSystem}-${options.size}`);
      } else {
        parts.push(options.size);
      }
    }
    
    // Date
    const now = new Date();
    parts.push('DATE', now.toISOString().slice(0, 10).replace(/-/g, ''));
    
    // Optional time
    if (options.includeTime) {
      parts.push('TIME', `${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`);
    }
    
    // Batch
    parts.push('BATCH', options.batch || this.generateBatchId());
    
    // Item number
    parts.push('ITEM', String(options.itemNumber || 1).padStart(3, '0'));
    
    return parts.join('-') + '.jpeg';
  }
}
```

---

## ✅ **Implementation Checklist**

### **Phase 1: Parser & Database** 
- [ ] Create `functions/lib/filename-parser.js`
- [ ] Add `inventory` table to D1
- [ ] Create migration file: `database/migrations/add-inventory.sql`
- [ ] Test parser with sample filenames

### **Phase 2: API Integration**
- [ ] Extend `functions/api/products.js` to use parser
- [ ] Create `functions/api/admin/inventory/scan.js` endpoint
- [ ] Create `functions/api/admin/inventory/sync.js` endpoint
- [ ] Test with existing 78 Cloudflare Images

### **Phase 3: Admin UI**
- [ ] Create `/public/admin-terminal/index.html`
- [ ] Create `/public/admin-terminal/terminal.css` (dark theme)
- [ ] Create `/public/admin-terminal/lib/parser.js` (client-side)
- [ ] Build batch upload interface
- [ ] Build filename preview component

### **Phase 4: Shop Integration**
- [ ] Update shop.html to use parsed metadata
- [ ] Add advanced filtering (by batch, date, etc.)
- [ ] Test with real products

### **Phase 5: Sell Integration**
- [ ] Update sell.html upload form
- [ ] Generate filenames on upload
- [ ] Store in R2 with structured names
- [ ] Test end-to-end flow

---

## 🚀 **Next Steps**

1. **Review this document** - Make sure categories and sizes match your needs
2. **Test the parser** - With your existing filenames
3. **Create the inventory table** - Run the migration
4. **Build the sync endpoint** - Parse all existing images
5. **Start the admin UI** - Using your media hub styling

---

## 📞 **Questions to Answer**

- [ ] Do we need additional categories beyond the 4?
- [ ] Are there other size systems needed (JP, CM)?
- [ ] Should we support fractional sizes beyond .5?
- [ ] What's the pricing strategy (manual or auto-calculate)?
- [ ] How should we handle existing non-structured filenames?

---

**Ready to start building?** Let me know which phase to begin with!
