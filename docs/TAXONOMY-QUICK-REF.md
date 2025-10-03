# 🏷️ SBS 8UNITY Taxonomy — Quick Reference

**Last Updated:** October 2, 2025  
**Status:** 🔒 PRODUCTION STANDARD

---

## The 4 Categories

```
BN-CLOTHES  →  Brand New Clothes
BN-SHOES    →  Brand New Shoes
PO-CLOTHES  →  Pre-Owned Clothes
PO-SHOES    →  Pre-Owned Shoes
```

---

## Size Chart

### 👕 BN-CLOTHES (5 sizes)
```
XS  S  M  L  XL
```

### 👔 PO-CLOTHES (13 sizes)
```
Standard:
XS  S  M  L  XL

Mixed Sets (±1 size difference):
XS-TOP-S-BOTTOM    S-TOP-XS-BOTTOM
S-TOP-M-BOTTOM     M-TOP-S-BOTTOM
M-TOP-L-BOTTOM     L-TOP-M-BOTTOM
L-TOP-XL-BOTTOM    XL-TOP-L-BOTTOM
```

### 👟 SHOES (13 sizes each)
```
UK-6    UK-6-5
UK-7    UK-7-5
UK-8    UK-8-5
UK-9    UK-9-5
UK-10   UK-10-5
UK-11   UK-11-5
UK-12
```

---

## Rules

1. **Categories:** Exactly 4, no exceptions
2. **BN-CLOTHES:** XS-XL only (no XXS, XXL, XXXL)
3. **PO-CLOTHES:** Includes mixed top/bottom sets
4. **Half Sizes:** Use `-5` suffix (UK-9-5, not UK-9.5)
5. **Mixed Sets:** ±1 size difference only
6. **Filenames:** Lowercase with hyphens (bn-clothes-m-...)

---

## Validation

### ✅ Valid Examples
```
BN-CLOTHES + M
PO-CLOTHES + S-TOP-M-BOTTOM
BN-SHOES + UK-9-5
PO-SHOES + UK-11
```

### ❌ Invalid Examples
```
BN-CLOTHES + XXL           (XXL not in BN-CLOTHES)
PO-CLOTHES + XS-TOP-L-BOTTOM  (>1 size difference)
BN-SHOES + UK-9.5          (use UK-9-5)
STREETWEAR + M             (STREETWEAR not a category)
```

---

## Quick Test

**In browser console:**
```javascript
// Load validator
await import('/scripts/taxonomy-validator.js');
```

**Expected output:**
- 4 categories ✅
- No invalid patterns ✅
- Mixed sizes in PO-CLOTHES only ✅
- Half sizes use -5 format ✅
- All API products valid ✅

---

## Files to Update

If taxonomy changes (RARE):
1. `/docs/SBS-8UNITY-TAXONOMY.md` (source of truth)
2. `/functions/api/products.js` (size assignment)
3. `/public/admin/inventory/index.html` (dropdowns)
4. `/workers/sbs-products-api.js` (generateSizes)
5. `/public/shop.html` (filters - auto-updates)

---

## Common Tasks

### Add New Size to Category
1. Update `/docs/SBS-8UNITY-TAXONOMY.md`
2. Update API files (3 files)
3. Test upload + shop
4. Deploy

### Add New Category
❌ **NOT ALLOWED** - System designed for 4 categories only

### Change Size Format
1. Search codebase for old format
2. Update all occurrences
3. Test filename generation
4. Verify CF Images compatibility
5. Deploy + test

---

**Need Help?** See `/docs/SBS-8UNITY-TAXONOMY.md` for full spec
