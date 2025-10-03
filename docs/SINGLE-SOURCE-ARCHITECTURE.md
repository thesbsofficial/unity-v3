# 🎯 SINGLE SOURCE OF TRUTH — Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                 🎯 SINGLE SOURCE OF TRUTH                   │
│                                                             │
│              /public/js/taxonomy.js                         │
│                                                             │
│   • CATEGORIES = ['BN-CLOTHES', 'BN-SHOES', ...]           │
│   • SIZES = { 'BN-CLOTHES': ['XS', 'S', ...], ... }        │
│   • SIZE_LABELS = { ... }                                   │
│   • Validation functions                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ ES6 imports
                            ├────────────────┬────────────────┐
                            ▼                ▼                ▼
                    ┌───────────────┐ ┌──────────────┐ ┌────────────┐
                    │   API Layer   │ │  Admin UI    │ │  Validator │
                    │               │ │              │ │            │
                    │  products.js  │ │ inventory/   │ │ taxonomy-  │
                    │               │ │ index.html   │ │ validator  │
                    │ ✅ Auto-sync  │ │ ✅ Auto-sync │ │ ✅ Auto    │
                    └───────────────┘ └──────────────┘ └────────────┘
                            │                │
                            │                │
                            ▼                ▼
                    ┌──────────────────────────────────┐
                    │      Shop (Dynamic)              │
                    │                                  │
                    │  • Gets sizes from API           │
                    │  • Builds filters dynamically    │
                    │  • No hardcoded sizes            │
                    └──────────────────────────────────┘


                    ┌────────────────────────────────────┐
                    │  Worker (Special Case)             │
                    │                                    │
                    │  /workers/sbs-products-api.js      │
                    │                                    │
                    │  ⚙️  Needs manual sync:            │
                    │  node scripts/sync-taxonomy.js     │
                    │                                    │
                    │  Why? Workers can't import ES6     │
                    └────────────────────────────────────┘
```

---

## Flow Diagram: Making a Change

```
┌──────────────────────────────────────────────────────────────┐
│ Step 1: Edit Source                                          │
│                                                              │
│ Open: /public/js/taxonomy.js                                 │
│ Change: Add 'XXL' to BN-CLOTHES sizes                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 2: Sync Worker                                          │
│                                                              │
│ Run: node scripts/sync-taxonomy.js                           │
│ Result: Worker updated with new sizes                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 3: Deploy                                               │
│                                                              │
│ Run: npx wrangler pages deploy public                        │
│ Result: All systems live with new taxonomy                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 4: Automatic Propagation                                │
│                                                              │
│ ✅ API auto-imports new sizes                                │
│ ✅ Uploader auto-shows XXL in dropdown                       │
│ ✅ Shop auto-displays XXL filter option                      │
│ ✅ Worker uses synced sizes                                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Upload to Shop

```
Admin Upload Form
    │
    │ 1. Imports taxonomy.js
    │    getSizeLabelsForCategory('BN-CLOTHES')
    │
    ▼
Dropdown shows: XS, S, M, L, XL
    │
    │ 2. User selects "M"
    │
    ▼
Image uploads with metadata
    │
    │ category: 'BN-CLOTHES'
    │ size: 'M'
    │
    ▼
Cloudflare Images stores
    │
    ▼
API fetches images
    │
    │ 3. Imports taxonomy.js
    │    getSizesForCategory('BN-CLOTHES')
    │
    ▼
API assigns sizes: ['XS', 'S', 'M', 'L', 'XL']
    │
    ▼
Shop receives products
    │
    │ 4. Extracts unique sizes from products
    │    product.sizes.forEach(...)
    │
    ▼
Size filter shows: XS, S, M, L, XL
    │
    ▼
Customer filters and purchases
```

---

## Module Import Chain

```
taxonomy.js (Source)
    │
    ├─ import → products.js
    │             │
    │             └─ export → API response
    │                           │
    │                           └─ fetch → shop.html
    │
    └─ import → inventory/index.html
                  │
                  └─ dropdown → user uploads
                                  │
                                  └─ CF Images → API
```

---

## File Dependencies

```
/public/js/taxonomy.js
    │
    ├── /functions/api/products.js
    │   └── Used by: Shop, API consumers
    │
    ├── /public/admin/inventory/index.html
    │   └── Used by: Admin uploads
    │
    ├── /public/scripts/taxonomy-validator.js
    │   └── Used by: Testing, validation
    │
    └── /workers/sbs-products-api.js (via sync script)
        └── Used by: Legacy worker endpoints
```

---

## Before vs After

### Before (Hardcoded Everywhere)
```
products.js:     sizes = ['XS', 'S', 'M', 'L', 'XL']
inventory.html:  sizes = ['XS', 'S', 'M', 'L', 'XL']
worker.js:       sizes = ['XS', 'S', 'M', 'L', 'XL']

Problem: Change 1 thing = edit 3+ files = easy to miss one
```

### After (Single Source)
```
taxonomy.js:     SIZES = { 'BN-CLOTHES': ['XS', 'S', 'M', 'L', 'XL'] }
                     │
                     ├─ products.js imports ✅
                     ├─ inventory.html imports ✅
                     └─ worker.js synced ⚙️

Solution: Change 1 file = sync script = everything updates
```

---

## Validation Flow

```
User uploads image
    │
    ▼
Inventory form validates
    │
    │ isValidCategory('BN-CLOTHES') → ✅
    │ isValidSize('BN-CLOTHES', 'M') → ✅
    │
    ▼
Upload proceeds
    │
    ▼
API receives
    │
    │ getSizesForCategory('BN-CLOTHES')
    │ Assigns: ['XS', 'S', 'M', 'L', 'XL']
    │
    ▼
Product created with valid sizes
    │
    ▼
Shop displays
    │
    │ Filters show only valid sizes
    │ from product.sizes array
    │
    ▼
Customer sees correct options
```

---

## Emergency Rollback

```
Git history
    │
    │ git log --oneline -- public/js/taxonomy.js
    │
    ▼
Find last good version
    │
    │ git checkout HEAD~1 -- public/js/taxonomy.js
    │
    ▼
Sync worker
    │
    │ node scripts/sync-taxonomy.js
    │
    ▼
Deploy
    │
    │ npx wrangler pages deploy public
    │
    ▼
System restored
```

---

**Legend:**
- ✅ = Automatic via ES6 import
- ⚙️ = Requires sync script
- 📦 = Static file/data
- 🎯 = Source of truth
