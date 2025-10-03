# 🎯 SINGLE SOURCE OF TRUTH — Setup Complete

**Status:** ✅ ACTIVE  
**Date:** October 2, 2025

---

## 🎉 What Changed

You now have **ONE FILE** that controls all taxonomy across your entire system!

### **The Single Source:**

```
/public/js/taxonomy.js
```

**Edit this file → Everything updates automatically** 🚀

---

## 📍 What It Controls

### 1. **Categories**

```javascript
CATEGORIES = ["BN-CLOTHES", "BN-SHOES", "PO-CLOTHES", "PO-SHOES"];
```

### 2. **Sizes** (per category)

```javascript
SIZES = {
    'BN-CLOTHES': ['XS', 'S', 'M', 'L', 'XL'],
    'PO-CLOTHES': ['XS', 'S', ...mixed sizes...],
    'BN-SHOES': ['UK-6', 'UK-6-5', ...],
    'PO-SHOES': ['UK-6', 'UK-6-5', ...]
}
```

### 3. **Labels** (dropdown text)

```javascript
SIZE_LABELS = {
    'BN-CLOTHES': [
        { value: 'XS', label: 'XS' },
        ...
    ]
}
```

---

## 🔗 What Uses It

| File                                     | What It Gets        | How                                   |
| ---------------------------------------- | ------------------- | ------------------------------------- |
| **`/functions/api/products.js`**         | Sizes for API       | `import { getSizesForCategory }`      |
| **`/public/admin/inventory/index.html`** | Dropdown options    | `import { getSizeLabelsForCategory }` |
| **`/workers/sbs-products-api.js`**       | Sizes (inline copy) | Synced via script                     |
| **`/public/shop.html`**                  | Dynamic sizes       | From API (auto)                       |

---

## 🛠️ How To Make Changes

### **Option 1: Edit Taxonomy File (Recommended)**

1. **Open:** `/public/js/taxonomy.js`
2. **Edit:** Add/remove/change sizes or categories
3. **Sync Worker:** Run `node scripts/sync-taxonomy.js`
4. **Deploy:** `npx wrangler pages deploy public`

**Example: Add a new size to BN-CLOTHES**

```javascript
// In /public/js/taxonomy.js
export const SIZES = {
    'BN-CLOTHES': [
        'XS', 'S', 'M', 'L', 'XL', 'XXL'  // ← Added XXL
    ],
    ...
}
```

Then:

```powershell
node scripts/sync-taxonomy.js  # Updates worker
npx wrangler pages deploy public
```

**Done!** All systems now have XXL. ✅

---

### **Option 2: Auto-Sync (Future Enhancement)**

Add to `package.json`:

```json
{
  "scripts": {
    "sync": "node scripts/sync-taxonomy.js",
    "predeploy": "npm run sync",
    "deploy": "npx wrangler pages deploy public"
  }
}
```

Then just run:

```powershell
npm run deploy  # Auto-syncs before deploying
```

---

## 📂 File Structure

```
/public/js/taxonomy.js          ← 🎯 EDIT HERE
    ↓ imported by
/functions/api/products.js      ← ✅ Auto-updates
/public/admin/inventory/index.html ← ✅ Auto-updates
    ↓ synced to
/workers/sbs-products-api.js    ← ⚙️ Run sync script
```

---

## 🧪 Testing Changes

### 1. **Test Locally**

```javascript
// In browser console:
import("/js/taxonomy.js").then((tax) => {
  console.log("Categories:", tax.CATEGORIES);
  console.log("BN-CLOTHES sizes:", tax.SIZES["BN-CLOTHES"]);
});
```

### 2. **Test Upload Form**

- Open admin → Inventory
- Select different categories
- Verify sizes update correctly

### 3. **Test API**

```bash
curl https://unity-v3.pages.dev/api/products
```

Check `sizes` array in response

### 4. **Test Shop**

- Visit shop
- Filter by category
- Check size dropdown

---

## 🎯 Common Tasks

### **Add New Category**

```javascript
// In taxonomy.js
export const CATEGORIES = [
    'BN-CLOTHES', 'BN-SHOES', 'PO-CLOTHES', 'PO-SHOES',
    'BN-ACCESSORIES'  // ← New
];

export const SIZES = {
    ...existing...,
    'BN-ACCESSORIES': ['ONE-SIZE']  // ← New
};

export const SIZE_LABELS = {
    ...existing...,
    'BN-ACCESSORIES': [
        { value: 'ONE-SIZE', label: 'One Size' }
    ]
};
```

Then sync & deploy.

---

### **Change Size Format**

```javascript
// OLD
"UK-6-5";

// NEW (if you want dots back)
"UK-6.5";
```

**Important:** If changing format, also update:

- Smart filename generator
- Database queries
- Any hardcoded references

---

### **Add Size to Existing Category**

```javascript
// In taxonomy.js
export const SIZES = {
    'BN-CLOTHES': [
        'XS', 'S', 'M', 'L', 'XL',
        'XXL'  // ← Added
    ]
};

// Don't forget labels!
export const SIZE_LABELS = {
    'BN-CLOTHES': [
        ...existing...,
        { value: 'XXL', label: 'XXL' }
    ]
};
```

---

## 🔍 Validation

### **Built-in Functions**

```javascript
import { isValidCategory, isValidSize } from "/js/taxonomy.js";

// Check category
isValidCategory("BN-CLOTHES"); // true
isValidCategory("INVALID"); // false

// Check size for category
isValidSize("BN-CLOTHES", "M"); // true
isValidSize("BN-CLOTHES", "UK-9"); // false
```

### **Run Validator**

```javascript
// In browser console
await import("/scripts/taxonomy-validator.js");
// Runs full validation suite
```

---

## 📊 Current Stats

| Metric                 | Count  |
| ---------------------- | ------ |
| Categories             | 4      |
| BN-CLOTHES sizes       | 5      |
| PO-CLOTHES sizes       | 13     |
| BN-SHOES sizes         | 13     |
| PO-SHOES sizes         | 13     |
| **Total unique sizes** | **31** |

---

## 🚨 Important Notes

### **Workers Can't Import ES Modules**

That's why `/workers/sbs-products-api.js` has an inline copy that needs syncing.

**Solution:** Run `node scripts/sync-taxonomy.js` after editing taxonomy.

---

### **Cache Invalidation**

After deploying, browsers might cache old taxonomy. Force refresh:

- Windows: `Ctrl + F5`
- Mac: `Cmd + Shift + R`

---

### **Database Constraints**

If you add database CHECK constraints, update them too:

```sql
ALTER TABLE products ADD CONSTRAINT valid_category
    CHECK(category IN ('BN-CLOTHES', 'BN-SHOES', 'PO-CLOTHES', 'PO-SHOES'));
```

---

## 🎬 Quick Start Example

**Scenario:** Add "XXL" to PO-CLOTHES

**Step 1:** Edit `/public/js/taxonomy.js`

```javascript
export const SIZES = {
    'PO-CLOTHES': [
        'XS', 'S', 'M', 'L', 'XL',
        'XXL',  // ← Added
        ...mixed sizes...
    ]
};

export const SIZE_LABELS = {
    'PO-CLOTHES': [
        ...existing...,
        { value: 'XXL', label: 'XXL' },
        ...mixed...
    ]
};
```

**Step 2:** Sync worker

```powershell
node scripts/sync-taxonomy.js
```

**Step 3:** Deploy

```powershell
npx wrangler pages deploy public --project-name=unity-v3
```

**Step 4:** Test

- Open inventory uploader
- Select PO-CLOTHES
- See XXL in dropdown ✅
- Upload image with XXL
- Check shop → Filter by PO-CLOTHES → See XXL option ✅

**Done!** 🎉

---

## 📚 Related Docs

- **Full Spec:** `/docs/SBS-8UNITY-TAXONOMY.md`
- **Quick Ref:** `/docs/TAXONOMY-QUICK-REF.md`
- **Change Log:** `/docs/TAXONOMY-UNIFICATION-COMPLETE.md`

---

## ✅ Benefits

| Before           | After                   |
| ---------------- | ----------------------- |
| Edit 3+ files    | Edit 1 file             |
| Manual sync      | Auto-sync (with import) |
| Risk of mismatch | Always in sync          |
| Hard to maintain | Easy to maintain        |
| No validation    | Built-in validation     |

---

## 🎯 Summary

**ONE FILE RULES THEM ALL:**

```
/public/js/taxonomy.js
```

**Edit it → Sync it → Deploy it → Everything updates** 🚀

---

**Questions?** Check `/docs/SBS-8UNITY-TAXONOMY.md` or run the validator script.
