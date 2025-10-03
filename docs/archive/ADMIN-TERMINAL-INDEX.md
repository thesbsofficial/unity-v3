# 📚 SBS Admin Terminal - Documentation Index

**Created:** October 2, 2025  
**Project:** SBS Unity v3 Admin Terminal

---

## 📄 **Documentation Files**

### **1. ADMIN-TERMINAL-README.md** 
**What it contains:**
- Complete implementation guide
- Actual categories from shop (BN-CLOTHES, BN-SHOES, PO-CLOTHES, PO-SHOES)
- Actual sizes from shop (XS-XXL, UK/EU/US 3-14)
- Self-explaining filename format breakdown
- Database schema for inventory table
- Full filename parser implementation
- Questions to answer before starting

**Use this for:** Understanding the full system architecture

---

### **2. ADMIN-TERMINAL-CHECKLIST.md**
**What it contains:**
- 4-week build plan broken down by days
- Phase 1: Foundation (Database, Parser, API)
- Phase 2: Admin UI (Terminal, Inventory, Upload)
- Phase 3: Integration (Shop, Sell, Products API)
- Phase 4: Testing & Polish
- Success criteria and risk mitigation
- Daily standup template

**Use this for:** Day-to-day development tracking

---

### **3. FILENAME-QUICK-REFERENCE.md**
**What it contains:**
- The 4 categories (only these!)
- All valid sizes
- Filename template and examples
- Component rules table
- Auto-generated tags explanation
- Database storage format
- UI display examples
- Batch ID format
- Validation rules
- Search & filter examples
- Parser test code

**Use this for:** Quick lookup while coding, print and pin to wall

---

## 🎯 **Key Facts**

### **Categories (EXACTLY 4)**
```
BN-CLOTHES    BN-SHOES    PO-CLOTHES    PO-SHOES
```

### **Condition Codes**
```
BN = Brand New
PO = Pre-Owned
```

### **Product Types**
```
CLOTHES    SHOES
```

### **Sizes**
```
Clothes: XS, S, M, L, XL, XXL
Shoes:   UK/EU/US 3-14 (with .5 increments)
```

---

## 🏗️ **System Architecture**

```
Cloudflare Images (78 existing)
       ↓
   Parser reads filename
       ↓
   Extracts components
       ↓
   Stores in D1 inventory table
       ↓
   Products API serves to shop
       ↓
   Shop displays with filters
```

---

## 📦 **Filename Structure**

```
DESC-{Name}-CAT-{Condition}-{Type}-SIZE-{Size}-DATE-{YYYYMMDD}-BATCH-{BatchID}-ITEM-{Number}.jpeg
```

**Required components:**
- CAT (category)
- DATE (upload date)
- BATCH (batch ID)
- ITEM (item number)

**Optional components:**
- DESC (description)
- SIZE (if applicable)
- TIME (upload time)

---

## 🔧 **Technologies**

- **Frontend:** Vanilla JS (no frameworks)
- **Backend:** Cloudflare Pages Functions
- **Database:** D1 (SQLite)
- **Storage:** R2 Buckets + Cloudflare Images
- **Auth:** Session-based (existing system)
- **Styling:** Dark theme matching media hub

---

## 📊 **Current State**

### **What Works**
✅ Shop with 4 categories  
✅ Size filtering (dynamic based on category)  
✅ Products API fetching 78 images  
✅ Session authentication  
✅ Media hub UI design reference  

### **What Needs Building**
- [ ] Filename parser library
- [ ] Inventory database table
- [ ] Admin terminal UI
- [ ] Batch upload system
- [ ] Sync existing images
- [ ] Enhanced filtering

---

## 🚀 **Getting Started**

### **Step 1: Read the docs**
1. Read ADMIN-TERMINAL-README.md (architecture)
2. Review FILENAME-QUICK-REFERENCE.md (formats)
3. Check ADMIN-TERMINAL-CHECKLIST.md (build plan)

### **Step 2: Set up environment**
```bash
cd "c:\Users\fredb\Desktop\unity-v3\public (4)"
npm install
npx wrangler login
```

### **Step 3: Create database migration**
```bash
# Create migration file
New-Item -Path "database\migrations\001_inventory.sql" -ItemType File

# Copy SQL from ADMIN-TERMINAL-README.md

# Run migration
npx wrangler d1 execute unity-v3 --local --file=database/migrations/001_inventory.sql
npx wrangler d1 execute unity-v3 --remote --file=database/migrations/001_inventory.sql
```

### **Step 4: Build parser**
```bash
# Create lib directory
New-Item -Path "functions\lib" -ItemType Directory

# Create parser file
New-Item -Path "functions\lib\filename-parser.js" -ItemType File

# Copy code from ADMIN-TERMINAL-README.md
```

### **Step 5: Test with existing images**
```powershell
# Fetch current products
$response = Invoke-WebRequest -Uri "https://thesbsofficial.com/api/products" -UseBasicParsing
$data = $response.Content | ConvertFrom-Json
$data.products.Count  # Should be 78

# Test parser with first filename
node -e "const parser = require('./functions/lib/filename-parser.js'); console.log(parser.parse('test-filename.jpeg'));"
```

---

## 📝 **Next Actions**

### **Immediate (This Week)**
1. Create inventory table migration
2. Build filename parser
3. Test parser with 10 sample names
4. Create sync endpoint
5. Test with existing 78 products

### **Short Term (Next 2 Weeks)**
1. Build admin terminal UI
2. Create batch upload interface
3. Integrate with shop filters
4. Test end-to-end

### **Medium Term (Month)**
1. Deploy to production
2. Sync all existing images
3. Train on new system
4. Monitor performance

---

## 🆘 **Getting Help**

### **Reference these docs for:**
- **Filename format questions** → FILENAME-QUICK-REFERENCE.md
- **What to build next** → ADMIN-TERMINAL-CHECKLIST.md
- **How system works** → ADMIN-TERMINAL-README.md
- **Tag questions** → Review shop.html directly (source of truth)
- **Size questions** → Check WORKING-VERSION/sbs-media-hub-FINAL.html

### **Test against:**
- Shop page: `public/shop.html` (lines 624-633 for categories)
- Media hub: `public/WORKING-VERSION/sbs-media-hub-FINAL.html`
- Products API: `functions/api/products.js`

---

## ✅ **Before You Start Coding**

- [ ] Read all 3 docs
- [ ] Understand the 4 categories
- [ ] Know the size ranges
- [ ] Understand filename format
- [ ] Check existing shop filters
- [ ] Review media hub design
- [ ] Set up D1 database
- [ ] Test wrangler CLI

---

**Ready to build?** Start with Phase 1, Day 1 in the checklist! 🚀
