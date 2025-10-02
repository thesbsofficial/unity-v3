# DATABASE & FILE AUDIT REPORT

**Date:** October 2, 2025  
**Database:** unity-v3 (Remote Production)

---

## 📊 CURRENT DATABASE SCHEMA

### **users** table
```
id                  INTEGER PRIMARY KEY AUTOINCREMENT
social_handle       TEXT UNIQUE NOT NULL
email               TEXT
phone               TEXT
password_hash       TEXT NOT NULL
first_name          TEXT
last_name           TEXT
address             TEXT
city                TEXT DEFAULT 'Dublin'
created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP
last_login          DATETIME
is_active           INTEGER DEFAULT 1
full_name           TEXT                    ⚠️ REDUNDANT - should remove
```

**Issues:**
- ❌ Missing `eircode` field
- ❌ Missing `preferred_contact` field
- ❌ Has redundant `full_name` column (should compute from first_name + last_name)

---

### **sessions** table
```
id                  INTEGER PRIMARY KEY AUTOINCREMENT
user_id             INTEGER NOT NULL
token               TEXT UNIQUE NOT NULL
expires_at          DATETIME NOT NULL
created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
```

**Status:** ✅ Clean, no issues

---

### **orders** table
```
id                  INTEGER PRIMARY KEY AUTOINCREMENT
user_id             INTEGER NOT NULL
order_number        TEXT UNIQUE NOT NULL
status              TEXT DEFAULT 'pending'
total_amount        REAL NOT NULL
items_json          TEXT NOT NULL
delivery_address    TEXT
delivery_city       TEXT
delivery_method     TEXT
payment_status      TEXT DEFAULT 'pending'
created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP
```

**Issues:**
- ❌ Missing `delivery_eircode` field
- ❌ No `delivery_phone` field (what if different from user.phone?)

---

### **sell_cases** table
```
id                      INTEGER PRIMARY KEY AUTOINCREMENT
case_id                 TEXT UNIQUE NOT NULL
user_id                 INTEGER (nullable)
category                TEXT NOT NULL
brand                   TEXT NOT NULL
condition               TEXT NOT NULL
size                    TEXT
price                   REAL NOT NULL
defects                 TEXT
address                 TEXT NOT NULL
city                    TEXT NOT NULL
eircode                 TEXT
contact_phone           TEXT NOT NULL        ❌ Should be: phone
contact_channel         TEXT NOT NULL        ❌ Should be: preferred_contact
contact_handle          TEXT NOT NULL        ❌ Should be: social_handle
contact_email           TEXT                 ❌ Should be: email
photo_count             INTEGER DEFAULT 0
status                  TEXT DEFAULT 'pending'
offer_amount            REAL
offer_notes             TEXT
created_at              DATETIME DEFAULT CURRENT_TIMESTAMP
updated_at              DATETIME DEFAULT CURRENT_TIMESTAMP
save_profile            INTEGER DEFAULT 0
registration_email_sent INTEGER DEFAULT 0
```

**Issues:**
- ❌ Inconsistent naming: `contact_*` prefix not needed
- ✅ HAS `eircode` (good!)
- ❌ Field names don't match `users` table

---

### **case_photos** table
```
id                  INTEGER PRIMARY KEY AUTOINCREMENT
case_id             TEXT NOT NULL
filename            TEXT NOT NULL
r2_key              TEXT NOT NULL
file_size           INTEGER
mime_type           TEXT
uploaded_at         DATETIME DEFAULT CURRENT_TIMESTAMP
```

**Status:** ✅ Clean, no issues

---

### **case_notes** table
```
id                  INTEGER PRIMARY KEY AUTOINCREMENT
case_id             TEXT NOT NULL
admin_user          TEXT
note_type           TEXT
note_text           TEXT NOT NULL
created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
```

**Status:** ✅ Clean, no issues

---

## 🗂️ ORPHANED/BACKUP FILES AUDIT

### Root Directory

**Backup Files (Can Archive or Delete):**
- `backup-20251001-135454/` - Old backup
- `backup-20251001-212838/` - Old backup
- `AUTH-SYSTEM-REVIEW.zip` - Compressed archive
- `AUTH-SYSTEM-REVIEW/` - Folder (check if needed)

**Documentation (Keep):**
- ✅ `DB-STANDARDIZATION-FINAL.md` - Current work
- ✅ `DB-STANDARDIZATION-PLAN.md` - Reference
- ✅ `STORAGE-ARCHITECTURE.md` - Important
- ✅ `PHOTO-RETENTION-POLICY.md` - Important
- ✅ `SELL-PAGE-BUGS.md` - Action items
- ✅ Various deployment/audit docs

**Schema Files (Keep):**
- ✅ `schema.sql` - Main schema
- ✅ `schema-sell-cases.sql` - Sell cases schema
- ✅ `db-indexes-working.sql` - Performance
- ✅ `db-performance-boost.sql` - Performance

**Scripts (Review):**
- `deploy-worker.ps1` - Check if still used
- `setup-cloudflare-rules.ps1` - Check if still used
- `setup-transform-rules.ps1` - Check if still used
- `secure-products-api.ts` - Check if still used

**Example Files (Delete or Move):**
- ❌ `product card example.html` - Move to `public/examples/` or delete

---

### public/ Directory

**Active Pages (Keep):**
- ✅ `index.html`
- ✅ `shop.html`
- ✅ `sell.html`
- ✅ `login.html`
- ✅ `register.html`
- ✅ `reset.html`
- ✅ `404.html`

**Backup Files (Archive or Delete):**
- ❌ `sell.html.backup-2025-10-01-145359`
- ❌ `sell.html.backup-before-icons-2025-10-01-160836`
- ❌ `sell.html.backup-ux-rebuild-2025-10-01-153818`
- ❌ `sell-backup-eligibility-gate.html`
- ❌ `shop-simple.html` - Is this needed?

**Test Files (Archive or Delete):**
- ❌ `debug.html`
- ❌ `diagnostic.html`
- ❌ `nav-test-final.html`
- ❌ `navigation-fixed.html`
- ❌ `test-clean.html`
- ❌ `test-nav.html`

**Folders:**
- ✅ `admin/` - Keep
- ✅ `assets/` - Keep
- ✅ `js/` - Keep
- ✅ `scripts/` - Keep
- ✅ `styles/` - Keep
- ❓ `archive/` - Review contents
- ❓ `AUTH-SYSTEM-REVIEW/` - Duplicate? Review

---

## 📋 REQUIRED CHANGES

### Database Schema Changes

```sql
-- 1. ADD MISSING FIELDS TO USERS
ALTER TABLE users ADD COLUMN eircode TEXT;
ALTER TABLE users ADD COLUMN preferred_contact TEXT DEFAULT 'instagram';

-- 2. RENAME sell_cases COLUMNS FOR CONSISTENCY
ALTER TABLE sell_cases RENAME COLUMN contact_phone TO phone;
ALTER TABLE sell_cases RENAME COLUMN contact_channel TO preferred_contact;
ALTER TABLE sell_cases RENAME COLUMN contact_handle TO social_handle;
ALTER TABLE sell_cases RENAME COLUMN contact_email TO email;

-- 3. ADD MISSING FIELD TO ORDERS
ALTER TABLE orders ADD COLUMN delivery_eircode TEXT;
ALTER TABLE orders ADD COLUMN delivery_phone TEXT;

-- 4. REMOVE REDUNDANT FIELD FROM USERS (after migrating data)
-- ALTER TABLE users DROP COLUMN full_name;  -- Do this last
```

### File Cleanup

**Create archive folder for old backups:**
```powershell
mkdir "public/archive/backups"
mkdir "public/archive/tests"

# Move backup files
mv public/*.backup-* public/archive/backups/
mv public/sell-backup-*.html public/archive/backups/
mv public/shop-simple.html public/archive/backups/

# Move test files
mv public/debug.html public/archive/tests/
mv public/diagnostic.html public/archive/tests/
mv public/nav-test-*.html public/archive/tests/
mv public/navigation-fixed.html public/archive/tests/
mv public/test-*.html public/archive/tests/
```

---

## 🎯 STANDARDIZATION SUMMARY

### Consistent Field Names Across All Tables

| Field | users | sell_cases | orders | Purpose |
|-------|-------|------------|--------|---------|
| `first_name` | ✅ | ❌ | ❌ | Personal name |
| `last_name` | ✅ | ❌ | ❌ | Personal name |
| `email` | ✅ | ✅ | ❌ | Email address |
| `phone` | ✅ | ✅ (fix) | ❌ | Phone number |
| `social_handle` | ✅ | ✅ (fix) | ❌ | IG/Snap username |
| `preferred_contact` | ➕ | ✅ (fix) | ❌ | Contact preference |
| `address` | ✅ | ✅ | ❌ | Street address |
| `city` | ✅ | ✅ | ❌ | City/town |
| `eircode` | ➕ | ✅ | ❌ | Irish postcode |
| `delivery_address` | ❌ | ❌ | ✅ | Order delivery |
| `delivery_city` | ❌ | ❌ | ✅ | Order delivery |
| `delivery_eircode` | ❌ | ❌ | ➕ | Order delivery |
| `delivery_phone` | ❌ | ❌ | ➕ | Order contact |

**Legend:**
- ✅ Already exists
- ➕ Needs to be added
- ❌ Not applicable
- (fix) Needs rename

---

## 🚀 NEXT STEPS

1. **Run Database Migration** (see SQL above)
2. **Update API endpoints** to use new field names
3. **Update register.html** to collect eircode, address, city
4. **Update sell.html** to use new field names in API calls
5. **Update shop.html** to collect delivery_eircode
6. **Clean up orphaned files** (move to archive)
7. **Test registration flow** end-to-end
8. **Test sell flow** with logged-in and anonymous users
9. **Test shop/checkout flow** with delivery info
10. **Deploy changes** to production

---

## 📝 NOTES

- **Priority:** Get naming consistent FIRST, then add features
- **Backward Compatibility:** Check if any existing data will break with renames
- **Testing:** Test both logged-in and anonymous flows
- **Documentation:** Update API docs after changes
