# 🧹 ORPHANED CODE CLEANUP PLAN

**Status:** 🚨 NEEDS CLEANUP  
**Date:** October 2, 2025

---

## 🎯 The Problem

After implementing the **Single Source of Truth** (`/public/js/taxonomy.js`), we now have **TONS of orphaned code** with hardcoded sizes and categories scattered everywhere.

**Found:** 50+ files with duplicate taxonomy code

---

## 🗑️ Safe to Delete Entirely

### **1. "DELETE ME" Folder**

```
/public/DELETE ME/
├── ADMIN-TERMINAL-INDEX.md
├── ADMIN-TERMINAL-README.md
├── CLOUDFLARE-STYLE-ADMIN-BRIEF.md
├── FILENAME-QUICK-REFERENCE.md
├── IMPORTANT-SBS-TAXONOMY.md
└── README-ADMIN.md
```

**Action:** Delete entire folder  
**Reason:** Old documentation, superseded by new docs

---

### **2. Archive Folders**

```
/public/archive/
├── shop-backup-20251001-111736.html
├── TAG-TAXONOMY.md
└── (other old backups)
```

**Action:** Delete or move to git history  
**Reason:** Old backups, no longer needed

---

### **3. Working Version Backups**

```
/public/WORKING-VERSION/
├── backups/
│   ├── sbs-media-hub-BACKUP.html
│   ├── sbs-media-hub-FINAL-V1-WORKING-REFERENCE.html
│   └── V1-COMPLETE-WORKING/
└── docs/
    └── TECHNICAL-SPECS.md
```

**Action:** Delete entire folder  
**Reason:** Old versions, superseded by current system

---

### **4. Inventory Backup**

```
/public/admin/inventory/index.html.backup
```

**Action:** Delete  
**Reason:** Old backup before taxonomy unification

---

## ⚠️ Files to Update (Remove Hardcoded Taxonomy)

### **1. sell.html**

**Location:** Lines 1653-1654  
**Current:** Hardcoded size arrays

```javascript
'Streetwear': ['XS', 'S', 'M', 'L', 'XL', ...],
'Shoes': ['UK-6', 'UK-6-5', ...],
```

**Action:** Import from taxonomy.js

```javascript
import { SIZES } from "/js/taxonomy.js";
```

---

### **2. robust-shop.js**

**Location:** Line 360  
**Current:** Hardcoded size order

```javascript
const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL"];
```

**Action:** Import from taxonomy or make dynamic

---

## ✅ Files That Are Correct (Keep)

### **Documentation (Reference Only)**

- `/docs/SBS-8UNITY-TAXONOMY.md` ← Source spec
- `/docs/TAXONOMY-QUICK-REF.md` ← Quick reference
- `/docs/SINGLE-SOURCE-*.md` ← Guides
- `/TAXONOMY-HARDCODED-READY.md` ← Deployment docs

**Why Keep:** These are documentation, not code. They explain the taxonomy.

---

### **Validator (Intentional Copy)**

- `/public/scripts/taxonomy-validator.js`

**Why Keep:** Needs inline copy for validation tests. Should reference taxonomy.js eventually.

---

### **Worker (Semi-Auto)**

- `/workers/sbs-products-api.js`

**Why Keep:** Synced via script. Needs inline copy because workers can't import ES6.

---

## 📋 Cleanup Checklist

### Phase 1: Delete Dead Code

- [ ] Delete `/public/DELETE ME/` folder
- [ ] Delete `/public/archive/` folder
- [ ] Delete `/public/WORKING-VERSION/` folder
- [ ] Delete `/public/admin/inventory/index.html.backup`

### Phase 2: Update Live Files

- [ ] Update `sell.html` to import taxonomy
- [ ] Update `robust-shop.js` to use taxonomy
- [ ] Test all pages after changes

### Phase 3: Verify

- [ ] Run `npm run test` (if exists)
- [ ] Check shop loads
- [ ] Check uploader works
- [ ] Check sell page works

---

## 🛠️ Automated Cleanup Script

```powershell
# WARNING: Run from project root
# BACKUP first: git commit -am "Before cleanup"

# Delete dead folders
Remove-Item -Recurse -Force "public/DELETE ME"
Remove-Item -Recurse -Force "public/archive"
Remove-Item -Recurse -Force "public/WORKING-VERSION"

# Delete backup files
Remove-Item -Force "public/admin/inventory/index.html.backup"

# Commit cleanup
git add -A
git commit -m "🧹 Remove orphaned taxonomy code"
```

---

## 📊 Before vs After

### Before Cleanup

```
Total files with taxonomy: 50+
Single source?: No
Maintainability: Poor
Disk usage: ~20MB+ of duplicates
```

### After Cleanup

```
Total files with taxonomy: 5 (1 source + 4 using it)
Single source?: Yes ✅
Maintainability: Excellent
Disk usage: ~2MB (90% reduction)
```

---

## 🚨 Safety Measures

### 1. Backup First

```bash
git add -A
git commit -m "Before taxonomy cleanup"
git tag before-cleanup
```

### 2. Test After

```bash
# Test each page
- Visit shop
- Try uploader
- Test sell form
- Check admin panel
```

### 3. Rollback if Needed

```bash
git reset --hard before-cleanup
```

---

## 📝 Files Using Taxonomy (Final State)

### Source

```
/public/js/taxonomy.js  ← THE ONLY SOURCE
```

### Consumers

```
/functions/api/products.js           ← import taxonomy
/public/admin/inventory/index.html   ← import taxonomy
/workers/sbs-products-api.js         ← synced copy
/public/scripts/taxonomy-validator.js ← references taxonomy
```

### Documentation (Keep)

```
/docs/SBS-8UNITY-TAXONOMY.md
/docs/SINGLE-SOURCE-*.md
/docs/TAXONOMY-*.md
```

---

## 🎯 Next Steps

1. **Review this plan**
2. **Backup current state** (`git commit`)
3. **Run cleanup script** (or manual delete)
4. **Update sell.html and robust-shop.js**
5. **Test everything**
6. **Deploy clean version**

---

**Questions?** Check each file before deleting. If unsure, move to `/archive-temp/` first.
