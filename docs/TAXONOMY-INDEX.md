# 🎯 TAXONOMY SYSTEM — Complete Documentation Index

**Last Updated:** October 2, 2025  
**Status:** ✅ PRODUCTION READY

---

## 📋 Quick Navigation

| Document                                                            | Purpose            | When to Use        |
| ------------------------------------------------------------------- | ------------------ | ------------------ |
| **[SINGLE-SOURCE-CHEAT-SHEET.md](../SINGLE-SOURCE-CHEAT-SHEET.md)** | Quick commands     | Need fast answer   |
| **[SINGLE-SOURCE-SETUP.md](SINGLE-SOURCE-SETUP.md)**                | Complete guide     | Making changes     |
| **[SINGLE-SOURCE-ARCHITECTURE.md](SINGLE-SOURCE-ARCHITECTURE.md)**  | System diagrams    | Understanding flow |
| **[SBS-8UNITY-TAXONOMY.md](SBS-8UNITY-TAXONOMY.md)**                | Full specification | Reference          |
| **[TAXONOMY-QUICK-REF.md](TAXONOMY-QUICK-REF.md)**                  | Size/category list | Quick lookup       |

---

## 🎯 The Magic File

```
/public/js/taxonomy.js
```

**This ONE file controls everything.** Edit it → sync → deploy → done.

---

## 🚀 Quick Start

### **Scenario: Add a new size**

```bash
# 1. Edit the source
code public/js/taxonomy.js

# 2. Sync worker
node scripts/sync-taxonomy.js

# 3. Deploy
npx wrangler pages deploy public --project-name=unity-v3

# Done! ✅
```

---

## 📚 Documentation Structure

```
/docs/
├── SBS-8UNITY-TAXONOMY.md              # Full spec (categories, sizes, rules)
├── TAXONOMY-QUICK-REF.md               # Quick reference card
├── TAXONOMY-UNIFICATION-COMPLETE.md    # Change history
├── SINGLE-SOURCE-SETUP.md              # How to use single source
├── SINGLE-SOURCE-ARCHITECTURE.md       # System diagrams
└── TAXONOMY-INDEX.md                   # This file

/SINGLE-SOURCE-CHEAT-SHEET.md           # Root-level quick guide
/TAXONOMY-HARDCODED-READY.md            # Deployment checklist

/public/js/taxonomy.js                  # 🎯 THE SOURCE
/public/scripts/taxonomy-validator.js   # Validation tool
/scripts/sync-taxonomy.js               # Worker sync script
```

---

## 🎓 Learning Path

### **1. First Time? Start Here:**

1. Read `SINGLE-SOURCE-CHEAT-SHEET.md` (5 min)
2. Look at `taxonomy.js` (understand structure)
3. Try changing a size (follow cheat sheet)

### **2. Need Details?**

1. Read `SINGLE-SOURCE-SETUP.md` (15 min)
2. Review `SBS-8UNITY-TAXONOMY.md` (reference)
3. Check diagrams in `SINGLE-SOURCE-ARCHITECTURE.md`

### **3. Making Changes?**

1. Check `TAXONOMY-QUICK-REF.md` (current setup)
2. Edit `taxonomy.js`
3. Run `sync-taxonomy.js`
4. Deploy and test

---

## 🔍 Common Questions

### **Q: Where do I add a new size?**

A: `/public/js/taxonomy.js` → `SIZES` object

### **Q: How do I make it appear in dropdowns?**

A: Also add to `SIZE_LABELS` in same file, then sync & deploy

### **Q: Why do I need to run a sync script?**

A: Workers can't import ES6 modules, so we copy data via script

### **Q: What if I break something?**

A: Git revert `taxonomy.js`, run sync, redeploy

### **Q: How do I test changes?**

A: Browser console → `await import('/js/taxonomy.js')`

---

## 🛠️ Tools & Scripts

| Tool            | Purpose            | Command                                          |
| --------------- | ------------------ | ------------------------------------------------ |
| **Sync script** | Update worker      | `node scripts/sync-taxonomy.js`                  |
| **Validator**   | Check consistency  | `await import('/scripts/taxonomy-validator.js')` |
| **Deploy**      | Push to production | `npx wrangler pages deploy public`               |

---

## 📊 Current System State

**Categories:** 4

- BN-CLOTHES (Brand New Clothes)
- BN-SHOES (Brand New Shoes)
- PO-CLOTHES (Pre-Owned Clothes)
- PO-SHOES (Pre-Owned Shoes)

**Sizes:**

- BN-CLOTHES: 5 (XS-XL)
- PO-CLOTHES: 13 (standard + 8 mixed)
- BN-SHOES: 13 (UK-6 to UK-12)
- PO-SHOES: 13 (UK-6 to UK-12)

**Total:** 31 unique size values

---

## 🔗 File Connections

```
taxonomy.js (source)
    ↓
    ├── products.js (API) → ✅ Auto-import
    ├── inventory/index.html (Uploader) → ✅ Auto-import
    └── sbs-products-api.js (Worker) → ⚙️ Sync script
```

---

## 📝 Change Log

| Date       | Change                               | Doc Updated            |
| ---------- | ------------------------------------ | ---------------------- |
| 2025-10-02 | Created single source system         | All docs               |
| 2025-10-02 | Changed half size format (.5 → -5)   | SBS-8UNITY-TAXONOMY.md |
| 2025-10-02 | Removed XXS/XXL/XXXL from BN-CLOTHES | SBS-8UNITY-TAXONOMY.md |
| 2025-10-02 | Added mixed sizes to PO-CLOTHES      | SBS-8UNITY-TAXONOMY.md |

---

## ✅ Checklist: Making a Change

- [ ] Edit `/public/js/taxonomy.js`
- [ ] Update both `SIZES` and `SIZE_LABELS`
- [ ] Run `node scripts/sync-taxonomy.js`
- [ ] Test locally (browser console)
- [ ] Deploy: `npx wrangler pages deploy public`
- [ ] Test live site (uploader + shop)
- [ ] Run validator: `await import('/scripts/taxonomy-validator.js')`
- [ ] Update this doc if adding new category/major change

---

## 🆘 Troubleshooting

### **Problem: Sizes not showing in uploader**

- Check: Did you update `SIZE_LABELS` too?
- Check: Did you redeploy?
- Check: Browser cache? (Ctrl+F5)

### **Problem: API returning wrong sizes**

- Check: Did you sync worker?
- Check: Is `products.js` importing taxonomy?

### **Problem: Worker not updating**

- Run: `node scripts/sync-taxonomy.js`
- Check: Did script succeed?
- Redeploy

---

## 🎯 Best Practices

1. **Always sync after editing taxonomy**
2. **Test in browser console before deploying**
3. **Run validator after changes**
4. **Update both SIZES and SIZE_LABELS together**
5. **Document major changes in this index**
6. **Keep git commits small and clear**

---

## 📞 Support

**Stuck?** Check in order:

1. `SINGLE-SOURCE-CHEAT-SHEET.md` (quick fix)
2. `SINGLE-SOURCE-SETUP.md` (detailed guide)
3. `SINGLE-SOURCE-ARCHITECTURE.md` (understand system)
4. Run validator to check for issues
5. Check git history for working version

---

## 🎉 Success Metrics

✅ Edit 1 file instead of 3+  
✅ Zero taxonomy mismatches  
✅ Built-in validation  
✅ 3-step workflow (edit → sync → deploy)  
✅ Complete documentation

---

**Version:** 1.0.0  
**Status:** Production Ready  
**Next Review:** When adding new category or major change
