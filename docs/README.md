# 📚 SBS Unity v3 Documentation

**Last Updated:** October 2, 2025  
**Project Status:** 🟢 Admin Rebuild in Progress

---

## 🎯 MASTER DOCUMENTS (START HERE)

### **1. [MASTER-ADMIN-PLAN.md](MASTER-ADMIN-PLAN.md)** 🏆

**The complete implementation plan for the Cloudflare-style admin rebuild**

- Current status overview
- File structure
- All 10 implementation phases
- Technical standards
- Testing checklists
- Timeline and metrics

### **2. [IMPORTANT-SBS-TAXONOMY.md](IMPORTANT-SBS-TAXONOMY.md)** ⚠️ CRITICAL

**The definitive source of truth for the entire system**

- 4 categories (STREETWEAR, SHOES, TECH, JEWELLERY)
- 2 conditions (BN, PO)
- Exact sizes from sell.html QB object
- Filename format specification
- Database schemas
- Validation rules

### **3. [CLOUDFLARE-STYLE-ADMIN-BRIEF.md](CLOUDFLARE-STYLE-ADMIN-BRIEF.md)** 🎛️

**Product vision and feature requirements**

- Top-level navigation (10 sections)
- CF parity map
- Core UX principles
- Success criteria
- "Do not overbuild" guidance

---

## 📖 QUICK REFERENCE GUIDES

### **[FILENAME-QUICK-REFERENCE.md](FILENAME-QUICK-REFERENCE.md)**

Quick reference card for the self-explaining filename system

- Filename template
- Real examples
- Size lists
- Common mistakes to avoid
- Parser examples

### **[README-ADMIN.md](README-ADMIN.md)**

Quick start guide for the admin system

- Setup instructions
- Common commands
- API endpoints
- Troubleshooting

---

## 📋 PROGRESS REPORTS

### **[ADMIN-CLEANUP-COMPLETE.md](ADMIN-CLEANUP-COMPLETE.md)**

Complete cleanup execution report

- Files archived (6 old files)
- Files updated (2 files)
- Verification checks
- Rollback plan

### **[ADMIN-PANEL-REDIRECT-FIX.md](ADMIN-PANEL-REDIRECT-FIX.md)**

How we fixed the admin-panel redirect issue

- Problem description
- Solution implementation
- Testing steps
- Technical details

### **[ADMIN-SKELETON-LIVE.md](ADMIN-SKELETON-LIVE.md)**

Phase 1 completion report

- What's live
- Test instructions
- Current features
- What's next

### **[ADMIN-IMPLEMENTATION-CHECKLIST.md](ADMIN-IMPLEMENTATION-CHECKLIST.md)**

Original phased implementation plan

- 4 phases with tasks
- API requirements
- Database schemas
- Testing checklists

---

## 🔧 TROUBLESHOOTING GUIDES

### **[CLOUDFLARE-REDIRECT-FIX.md](CLOUDFLARE-REDIRECT-FIX.md)**

How to remove Cloudflare Access/Transform Rules

- Step-by-step Cloudflare dashboard guide
- Where to find redirect rules
- What to delete
- Verification steps

---

## 📁 DOCUMENT ORGANIZATION

```
/docs/
├── 🏆 MASTER-ADMIN-PLAN.md                    ← START HERE
├── ⚠️ IMPORTANT-SBS-TAXONOMY.md               ← SOURCE OF TRUTH
├── 🎛️ CLOUDFLARE-STYLE-ADMIN-BRIEF.md        ← PRODUCT VISION
│
├── 📖 Quick Reference/
│   ├── FILENAME-QUICK-REFERENCE.md
│   └── README-ADMIN.md
│
├── 📋 Progress Reports/
│   ├── ADMIN-CLEANUP-COMPLETE.md
│   ├── ADMIN-PANEL-REDIRECT-FIX.md
│   ├── ADMIN-SKELETON-LIVE.md
│   └── ADMIN-IMPLEMENTATION-CHECKLIST.md
│
├── 🔧 Troubleshooting/
│   └── CLOUDFLARE-REDIRECT-FIX.md
│
└── 📦 Archive/
    ├── ACCOUNT-LINKING-COMPLETE.md
    ├── BUG-AUDIT-REPORT.md
    ├── DATABASE-FILE-AUDIT-COMPLETE.md
    └── ... (historical docs)
```

---

## 🎯 QUICK START FOR NEW DEVELOPERS

1. **Read:** [MASTER-ADMIN-PLAN.md](MASTER-ADMIN-PLAN.md) - Understand the project
2. **Learn:** [IMPORTANT-SBS-TAXONOMY.md](IMPORTANT-SBS-TAXONOMY.md) - Master the taxonomy
3. **Reference:** [FILENAME-QUICK-REFERENCE.md](FILENAME-QUICK-REFERENCE.md) - Quick SKU guide
4. **Build:** Follow phase-by-phase plan in MASTER-ADMIN-PLAN.md

---

## 🚀 CURRENT PROJECT STATUS

**Phase 1:** ✅ COMPLETE - Skeleton Live  
**Phase 2:** 🚧 IN PROGRESS - Inventory System  
**Production:** https://thesbsofficial.com/admin/

---

## 📞 SUPPORT

For questions or issues:

1. Check [MASTER-ADMIN-PLAN.md](MASTER-ADMIN-PLAN.md) troubleshooting section
2. Check [CLOUDFLARE-REDIRECT-FIX.md](CLOUDFLARE-REDIRECT-FIX.md) for redirect issues
3. Verify taxonomy in [IMPORTANT-SBS-TAXONOMY.md](IMPORTANT-SBS-TAXONOMY.md)

---

**Last Updated:** October 2, 2025  
**Project Status:** 🟢 Active Development
