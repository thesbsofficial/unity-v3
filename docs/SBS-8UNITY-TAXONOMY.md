# SBS 8UNITY Tag & Vocabulary Registry

> **Purpose:** This document is the canonical source for every category, size, tag, and reserved keyword used across the SBS admin hub, upload pipeline, and public site. Update this file whenever a new term is added or retired.
>
> **Scope:** Live vocabulary as of October 2, 2025 - HARDCODED across all systems.
>
> **Status:** 🔒 **LOCKED** - Do not modify without updating ALL references below.

---

## 1. Inventory Categories (Admin & Public)

**EXACTLY 4 categories - NO exceptions:**

| Code         | Human Label         | Notes                         |
| ------------ | ------------------- | ----------------------------- |
| `BN-CLOTHES` | Brand New • Clothes | Upload form → Category select |
| `BN-SHOES`   | Brand New • Shoes   | Upload form → Category select |
| `PO-CLOTHES` | Pre-Owned • Clothes | Upload form → Category select |
| `PO-SHOES`   | Pre-Owned • Shoes   | Upload form → Category select |

**Usage:**

- Cloudflare Images metadata
- Upload filename markers (e.g., `BN-CLOTHES-M-10021430.jpg`)
- Public site `data-category` attributes
- API `/api/products` category field
- Shop filter buttons

---

## 2. Size Vocabulary

### 2.1 Clothing (Brand New) — `BN-CLOTHES`

```
XS, S, M, L, XL
```

**Count:** 5 sizes  
**Rule:** Standard sizing only, no mixed combinations

---

### 2.2 Clothing (Pre-Owned) — `PO-CLOTHES`

```
XS, S, M, L, XL,
XS-TOP-S-BOTTOM,
S-TOP-XS-BOTTOM,
S-TOP-M-BOTTOM,
M-TOP-S-BOTTOM,
M-TOP-L-BOTTOM,
L-TOP-M-BOTTOM,
L-TOP-XL-BOTTOM,
XL-TOP-L-BOTTOM
```

**Count:** 13 sizes (5 standard + 8 mixed)  
**Rule:** Only allow ±1 size difference between top and bottom pieces. Keep hyphenated format exactly as shown for filename generation (`SIZE-<value>` markers).

---

### 2.3 Footwear — `BN-SHOES` + `PO-SHOES`

```
UK-6, UK-6-5,
UK-7, UK-7-5,
UK-8, UK-8-5,
UK-9, UK-9-5,
UK-10, UK-10-5,
UK-11, UK-11-5,
UK-12
```

**Count:** 13 sizes  
**Rule:** Half sizes use `-5` suffix (e.g., `UK-9-5` for UK 9.5). Maintain the `UK-` prefix for consistency with file naming and tag filtering.

---

## 3. Implementation Checklist

### Files Using This Taxonomy (MUST match exactly):

#### **Frontend (HTML)**

- [ ] `/public/admin/inventory/index.html` — Upload form dropdowns (lines 907-965)
- [ ] `/public/shop.html` — Product filtering and display
- [ ] `/public/sell.html` — Sell form category/size selects

#### **Backend (API)**

- [ ] `/functions/api/products.js` — Product size assignment (lines 98-120)
- [ ] `/workers/sbs-products-api.js` — `generateSizes()` function (lines 210-235)

#### **Database (D1)**

- [ ] Inventory table `size` column constraints
- [ ] Products table `category` column constraints
- [ ] Validation triggers (if any)

#### **Documentation**

- [ ] `/docs/IMPORTANT-SBS-TAXONOMY.md` (legacy - archive this)
- [ ] `/public/🚀 SBS UNITY V3 - MASTER PROJECT DOCUMENTATION` (update lines 417-470)

---

## 4. Validation Rules

### Category Validation

```javascript
const VALID_CATEGORIES = ["BN-CLOTHES", "BN-SHOES", "PO-CLOTHES", "PO-SHOES"];

function isValidCategory(category) {
  return VALID_CATEGORIES.includes(category);
}
```

### Size Validation

```javascript
const VALID_SIZES = {
  "BN-CLOTHES": ["XS", "S", "M", "L", "XL"],
  "PO-CLOTHES": [
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XS-TOP-S-BOTTOM",
    "S-TOP-XS-BOTTOM",
    "S-TOP-M-BOTTOM",
    "M-TOP-S-BOTTOM",
    "M-TOP-L-BOTTOM",
    "L-TOP-M-BOTTOM",
    "L-TOP-XL-BOTTOM",
    "XL-TOP-L-BOTTOM",
  ],
  "BN-SHOES": [
    "UK-6",
    "UK-6-5",
    "UK-7",
    "UK-7-5",
    "UK-8",
    "UK-8-5",
    "UK-9",
    "UK-9-5",
    "UK-10",
    "UK-10-5",
    "UK-11",
    "UK-11-5",
    "UK-12",
  ],
  "PO-SHOES": [
    "UK-6",
    "UK-6-5",
    "UK-7",
    "UK-7-5",
    "UK-8",
    "UK-8-5",
    "UK-9",
    "UK-9-5",
    "UK-10",
    "UK-10-5",
    "UK-11",
    "UK-11-5",
    "UK-12",
  ],
};

function isValidSize(category, size) {
  const validSizes = VALID_SIZES[category];
  return validSizes && validSizes.includes(size);
}
```

### Filename Format

```
[CATEGORY]-[SIZE]-[BATCH]-[TIMESTAMP].jpg

Examples:
✅ bn-clothes-m-b10021430-1696252800000.jpg
✅ po-shoes-uk-9-5-b10021445-1696252815000.jpg
✅ po-clothes-s-top-m-bottom-b10021500-1696253000000.jpg

❌ BN-CLOTHES-XL-B10021430.jpg (uppercase not allowed in CF Images IDs)
❌ shoes-uk-7-b10021430.jpg (missing condition prefix)
❌ BN-CLOTHES-XXL-b10021430.jpg (XXL not valid for BN-CLOTHES)
```

---

## 5. Database Schema

### Products Table (Cloudflare D1)

```sql
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('BN-CLOTHES', 'BN-SHOES', 'PO-CLOTHES', 'PO-SHOES')),
    size TEXT NOT NULL,
    price REAL NOT NULL,
    image_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_size CHECK(
        (category = 'BN-CLOTHES' AND size IN ('XS', 'S', 'M', 'L', 'XL')) OR
        (category = 'BN-SHOES' AND size IN ('UK-6', 'UK-6-5', 'UK-7', 'UK-7-5', 'UK-8', 'UK-8-5', 'UK-9', 'UK-9-5', 'UK-10', 'UK-10-5', 'UK-11', 'UK-11-5', 'UK-12')) OR
        (category = 'PO-SHOES' AND size IN ('UK-6', 'UK-6-5', 'UK-7', 'UK-7-5', 'UK-8', 'UK-8-5', 'UK-9', 'UK-9-5', 'UK-10', 'UK-10-5', 'UK-11', 'UK-11-5', 'UK-12')) OR
        (category = 'PO-CLOTHES' AND size IN ('XS', 'S', 'M', 'L', 'XL', 'XS-TOP-S-BOTTOM', 'S-TOP-XS-BOTTOM', 'S-TOP-M-BOTTOM', 'M-TOP-S-BOTTOM', 'M-TOP-L-BOTTOM', 'L-TOP-M-BOTTOM', 'L-TOP-XL-BOTTOM', 'XL-TOP-L-BOTTOM'))
    )
);
```

---

## 6. Shop Filter Mapping

### Category Pills (shop.html)

```html
<button data-category="BN-CLOTHES">Brand New Clothes</button>
<button data-category="BN-SHOES">Brand New Shoes</button>
<button data-category="PO-CLOTHES">Pre-Owned Clothes</button>
<button data-category="PO-SHOES">Pre-Owned Shoes</button>
```

### Size Filter (Dynamic)

- Populated from `product.sizes` array
- Sorted: numbers first (UK-6, UK-7...), then strings (XS, S, M...)
- Hidden until category selected

---

## 7. Change History

| Date       | Change                                 | By     | Reason                            |
| ---------- | -------------------------------------- | ------ | --------------------------------- |
| 2025-10-02 | Created SBS 8UNITY Registry            | System | Unify taxonomy across all systems |
| 2025-10-02 | Changed `.5` to `-5` for half sizes    | System | CF Images lowercase requirement   |
| 2025-10-02 | Removed XXS, XXL, XXXL from BN-CLOTHES | System | Standardize to XS-XL only         |
| 2025-10-02 | Added mixed top/bottom for PO-CLOTHES  | System | Support outfit sets               |

---

## 8. Emergency Contacts

**If this taxonomy needs to change:**

1. Update this document first
2. Run global search for old values
3. Update all 5 implementation files
4. Test upload → shop → filter workflow
5. Verify CF Images metadata
6. Deploy to production

**Critical Files:**

- `/functions/api/products.js` (API sizes)
- `/public/admin/inventory/index.html` (uploader dropdowns)
- `/workers/sbs-products-api.js` (worker sizes)

---

**Last Updated:** October 2, 2025  
**Version:** 1.0.0  
**Status:** 🔒 LOCKED - Production Standard
