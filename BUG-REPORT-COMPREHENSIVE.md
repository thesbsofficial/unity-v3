# 🐛 COMPREHENSIVE BUG REPORT - SBS Unity v3
**Generated:** October 5, 2025  
**Audit Type:** Deep System Review  
**Severity Levels:** 🔴 Critical | 🟡 High | 🟢 Medium | 🔵 Low

---

## 🔴 CRITICAL BUGS (System-Breaking)

### BUG #2: Admin Orders API - Schema Mismatch (UPDATE)
**File:** `functions/api/admin/orders.js`  
**Lines:** 336-338  
**Severity:** 🔴 CRITICAL - BREAKS ADMIN ORDER UPDATES

**Issue:**
```javascript
await DB.prepare(`
    UPDATE orders
    SET status = ?,
        admin_notes = COALESCE(?, admin_notes),  // ❌ Column doesn't exist
        updated_at = datetime('now'),
        completed_at = CASE WHEN ? = 'completed' THEN datetime('now') ELSE completed_at END  // ❌ Column doesn't exist
    WHERE order_number = ?
`).bind(newStatus, adminNotes, newStatus, orderNumber).run();
```

**Root Cause:** Production schema has 14 columns. Missing: `admin_notes`, `customer_notes`, `completed_at`, `subtotal`

**Impact:** All admin order status updates FAIL with SQL error  
**Fix Required:** Remove references to non-existent columns or ALTER TABLE to add them

---

### BUG #4: Admin Orders API - Schema Mismatch (INSERT)
**File:** `functions/api/admin/orders.js`  
**Lines:** 226-257  
**Severity:** 🔴 CRITICAL - BREAKS ORDER CREATION

**Issue:**
```javascript
INSERT INTO orders (
    order_number, user_id, customer_name, customer_phone, customer_email,
    items_json, delivery_method, delivery_fee, delivery_address, delivery_city, delivery_eircode,
    subtotal,  // ❌ Column doesn't exist
    total,     // ❌ Column doesn't exist (should be total_amount)
    status, created_at, updated_at
)
```

**Root Cause:** Production uses `total_amount` (REAL), not `subtotal`/`total`

**Impact:** Admin cannot create orders - INSERT fails  
**Fix Required:** Change to `total_amount` only

---

### BUG #5: Sell Submissions API - Missing Columns
**File:** `functions/api/sell-submissions.js`  
**Lines:** 267-298  
**Severity:** 🔴 CRITICAL - MISSING DATA

**Issue:** GET query doesn't SELECT `contact_name` or `total_offer` columns

**Production Schema Has:**
- `contact_name` TEXT (used in admin UI)
- `total_offer` REAL (displayed as offer price)

**Current Query:** Selects `contact_phone`, `contact_channel`, `contact_handle` but NOT `contact_name`

**Impact:** Admin sell-requests page cannot display seller names or offer amounts  
**Fix Required:** Add columns to SELECT statement

---

## 🟡 HIGH PRIORITY BUGS (Functional Issues)

### BUG #7: Products API - Missing Price Field
**File:** `functions/api/products.js`  
**Lines:** 172-195  
**Severity:** 🟡 HIGH - NO PRICING

**Issue:** Product objects constructed without `price` field

**Root Cause:**
- Line 217 documentation mentions "price - Price (45.99 or 4599 cents)"
- Build function at 172-195 creates product object
- `price` field never added to return object

**Impact:**
- Shop cannot display prices
- Cart cannot calculate totals
- Checkout shows "€0" or only delivery fee
- Analytics price tracking broken

**Fix Required:** Parse `meta.price` from CF Images metadata and add to product object

---

### BUG #8: Checkout - No Price Calculation
**File:** `public/js/checkout.js`  
**Line:** 147  
**Severity:** 🟡 HIGH - WRONG TOTALS

**Issue:**
```javascript
function updateCheckoutTotal() {
    const deliveryFee = deliveryRadio.value === 'delivery' ? 5 : 0;
    const totalElement = document.getElementById('checkout-total-amount');
    if (totalElement) {
        totalElement.textContent = `€${deliveryFee}`;  // ❌ Only shows delivery, no products!
    }
}
```

**Root Cause:** Function doesn't loop through basket items or sum prices (because products have no prices)

**Impact:** Checkout always shows €0 or €5, never actual cart total  
**Fix Required:** Calculate `basket.reduce((sum, item) => sum + (item.price || 0), 0) + deliveryFee`

---

### BUG #9: Cart Manager - No Price Methods
**File:** `public/js/cart-manager.js`  
**Lines:** 1-150 (entire file)  
**Severity:** 🟡 HIGH - INCOMPLETE CART

**Issue:** Cart management module has zero pricing functionality

**Missing Methods:**
- `getTotal()` - Calculate cart subtotal
- `getTotalWithDelivery()` - Include delivery fee
- `formatPrice()` - Format currency display
- Item-level price tracking

**Impact:** Cart UI cannot show running total, checkout broken  
**Fix Required:** Add price calculation methods to SBSCart object

---

### BUG #3: Dashboard - Non-Existent Fields
**File:** `public/dashboard.html`  
**Lines:** 1102-1107  
**Severity:** 🟡 HIGH - DISPLAY ERRORS

**Issue:**
```javascript
function normalizeCustomerOrder(order) {
    return {
        // ... other fields ...
        admin_notes: order.admin_notes || '',        // ❌ Doesn't exist
        customer_notes: order.customer_notes || '',  // ❌ Doesn't exist
        completed_at: order.completed_at || null     // ❌ Doesn't exist
    };
}
```

**Impact:** Dashboard order display attempts to access undefined fields  
**Fix Required:** Remove references or use alternate fields

---

## 🟢 MEDIUM PRIORITY BUGS (Code Quality)

### BUG #1: Duplicate User Check in Login
**File:** `functions/api/[[path]].js`  
**Lines:** 445-447  
**Severity:** 🟢 MEDIUM - REDUNDANT CODE

**Issue:**
```javascript
if (!user) {
    return json({ success: false, error: "Invalid credentials" }, 401, headers);
}
if (!user || !(await verifyPassword(password, user)))  // ❌ !user checked twice
    return json({ success: false, error: "Invalid credentials" }, 401, headers);
```

**Impact:** Redundant check, minor performance hit  
**Fix Required:** Remove first `if (!user)` block

---

### BUG #6: Inconsistent is_allowlisted Handling
**Files:** `functions/api/[[path]].js` (line 236) vs `functions/lib/admin.js` (line 51)  
**Severity:** 🟢 MEDIUM - LOGIC INCONSISTENCY

**Issue:**

**readSession (line 236):**
```javascript
CASE
    WHEN EXISTS(SELECT 1 FROM admin_allowlist al WHERE al.user_id = u.id) THEN 1
    ELSE 0
END AS is_allowlisted
// Returns: 1 or 0
```

**verifyAdminAuth (line 51):**
```javascript
LEFT JOIN admin_allowlist al ON al.user_id = u.id
// SELECT: al.user_id AS is_allowlisted
// Returns: user_id (number) or NULL
```

**isAdminSession validation:**
```javascript
return session?.role === 'admin' && (session?.is_allowlisted === 1 || !!session?.is_allowlisted);
```

**Impact:** Works due to `!!` coercion, but inconsistent - `is_allowlisted` returns different types  
**Fix Required:** Standardize to CASE statement returning 1/0 in both functions

---

## 🔵 LOW PRIORITY (Security/Best Practices)

### BUG #10: XSS Vulnerability - innerHTML with User Data
**Files:** Multiple (`dashboard.html`, `shop.html`, `sell.html`)  
**Severity:** 🔵 LOW (CSP mitigates) - SECURITY RISK

**Issue:** Widespread use of `.innerHTML` with template literals containing user-provided data

**Examples:**
- `dashboard.html:1314` - `listEl.innerHTML = orders.map(renderOrderCard).join('');`
- `shop.html:1399` - `grid.innerHTML = filteredProducts.map(product => createProductCard(product)).join('');`
- `sell.html:2335` - `validationList.innerHTML = missing.map(item => `<li>${item}</li>`).join('');`

**Vectors:** Product names, user names, addresses, notes fields could contain `<script>` tags

**Mitigation:** CSP header blocks inline scripts, but still bad practice

**Fix Required:** Use `textContent` for user data, or sanitize with DOMPurify

---

## 📊 SUMMARY

| Severity | Count | Files Affected |
|----------|-------|----------------|
| 🔴 Critical | 3 | admin/orders.js, sell-submissions.js |
| 🟡 High | 4 | products.js, checkout.js, cart-manager.js, dashboard.html |
| 🟢 Medium | 2 | [[path]].js, admin.js |
| 🔵 Low | 1 | Multiple HTML files |
| **TOTAL** | **10** | **9 files** |

---

## 🔧 IMMEDIATE ACTIONS REQUIRED

1. **FIX BUG #2 & #4** - Admin orders API column mismatch (blocks all admin order operations)
2. **FIX BUG #5** - Add `contact_name`/`total_offer` to sell-submissions SELECT
3. **FIX BUG #7** - Add price field to products API response
4. **FIX BUG #8 & #9** - Implement cart total calculations
5. **FIX BUG #3** - Remove non-existent field references from dashboard
6. **REFACTOR BUG #1** - Clean up duplicate login check
7. **STANDARDIZE BUG #6** - Consistent is_allowlisted return type
8. **SANITIZE BUG #10** - Replace innerHTML with safer alternatives

---

## 🎯 ROOT CAUSE ANALYSIS

**Primary Issue:** **Schema Drift** - Local development schema diverged from production
- Local has: `subtotal`, `total`, `admin_notes`, `customer_notes`, `completed_at`
- Production has: `total_amount` only

**Secondary Issue:** **Incomplete Product Pipeline**
- CF Images metadata doesn't include prices
- Products API doesn't parse/return prices
- Cart system built assuming prices exist
- Checkout cannot calculate totals

**Tertiary Issue:** **Inconsistent Data Models**
- Different return types for same logical field (`is_allowlisted`)
- Missing fields not handled gracefully (dashboard assumes fields exist)
- Frontend/backend column name mismatches

---

## 🛠️ PROPOSED FIXES (Priority Order)

### Phase 1: Critical Database Issues (30 min)
1. Update `admin/orders.js` UPDATE query - remove non-existent columns
2. Update `admin/orders.js` INSERT query - use `total_amount` instead of `subtotal`/`total`
3. Add `contact_name`, `total_offer` to sell-submissions SELECT

### Phase 2: Pricing System (1 hour)
4. Add price parsing to products.js from CF Images metadata
5. Update cart-manager.js with price calculation methods
6. Fix checkout.js to calculate real totals
7. Update dashboard/shop to handle missing prices gracefully

### Phase 3: Code Quality (30 min)
8. Remove duplicate user check in login
9. Standardize is_allowlisted to CASE statement in both functions
10. Add input sanitization or replace innerHTML with textContent

---

**END OF REPORT**
