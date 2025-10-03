# 🎯 SINGLE SOURCE CHEAT SHEET

## The Magic File
```
/public/js/taxonomy.js  ← Edit this ONLY
```

---

## Quick Edit Guide

### Add New Size
```javascript
// Open /public/js/taxonomy.js
export const SIZES = {
    'BN-CLOTHES': [
        'XS', 'S', 'M', 'L', 'XL',
        'XXL'  // ← Add here
    ]
};

export const SIZE_LABELS = {
    'BN-CLOTHES': [
        ...existing...,
        { value: 'XXL', label: 'XXL' }  // ← And here
    ]
};
```

Then:
```bash
node scripts/sync-taxonomy.js
npx wrangler pages deploy public
```

---

## What Happens Automatically

| File | Updates | How |
|------|---------|-----|
| `products.js` | ✅ Auto | ES6 import |
| `inventory/index.html` | ✅ Auto | ES6 import |
| `sbs-products-api.js` | ⚙️ Sync | Run script |

---

## Commands

```bash
# Sync worker after editing taxonomy
node scripts/sync-taxonomy.js

# Deploy everything
npx wrangler pages deploy public --project-name=unity-v3

# Test in browser
# Open console on shop page:
import('/js/taxonomy.js').then(t => console.log(t.SIZES))
```

---

## Current Setup

**Categories:** 4
```
BN-CLOTHES  BN-SHOES  PO-CLOTHES  PO-SHOES
```

**Sizes:**
- BN-CLOTHES: 5 (XS-XL)
- PO-CLOTHES: 13 (standard + mixed)
- Shoes: 13 each (UK-6 to UK-12)

---

## Emergency: Something Broke?

1. Check `/docs/SINGLE-SOURCE-SETUP.md`
2. Run validator: `import('/scripts/taxonomy-validator.js')`
3. Revert taxonomy.js from git
4. Redeploy

---

**Full Guide:** `/docs/SINGLE-SOURCE-SETUP.md`
