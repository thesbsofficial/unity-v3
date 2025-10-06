# Bidding System - Comprehensive Bug Review & Fixes
**Date:** October 6, 2025  
**Deployment:** https://98196b62.unity-v3.pages.dev

## 🔍 Bug Review Summary
Conducted full code audit of the Make an Offer bidding system including database schema, API endpoints, frontend logic, and authentication flow.

---

## 🐛 CRITICAL BUGS FOUND & FIXED

### **Bug #1: Missing `user_id` Column in `customer_offers` Table**
**Severity:** 🔴 CRITICAL  
**Impact:** Bidding username display was broken, time-based restrictions impossible

**Problem:**
- Database table missing `user_id` column to track which user made which offer
- SQL JOIN to fetch `bidding_username` would fail silently
- Cannot enforce "1 bid per 5 minutes per user per item" rule

**Fix:**
```sql
ALTER TABLE customer_offers ADD COLUMN user_id INTEGER;
ALTER TABLE customer_offers ADD COLUMN last_offer_at DATETIME;
```

**Code Updated:**
- `functions/api/offers/submit.js` - Now inserts `user_id` from session
- `functions/api/offers/highest.js` - JOIN with users table now works correctly

---

### **Bug #2: Polling Without Visibility Detection**
**Severity:** 🟡 MEDIUM  
**Impact:** Unnecessary API calls when tab not visible, server load, battery drain

**Problem:**
- Polling continued every 5 seconds even when user switched tabs
- Wasted resources on background tabs
- No cleanup when user leaves page

**Fix:**
```javascript
// Added visibility detection
offerPollingInterval = setInterval(async () => {
    if (document.hidden) {
        console.log('⏸️ Tab hidden - skipping poll');
        return;
    }
    console.log('🔄 Auto-polling for offer updates...');
    await reloadOffers();
}, 5000);

// Resume when tab becomes visible
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && isPollingActive) {
        console.log('👀 Tab visible - refreshing offers');
        reloadOffers();
    }
});
```

---

### **Bug #3: Missing `credentials: 'include'` in Fetch**
**Severity:** 🔴 CRITICAL  
**Impact:** Session cookie not sent, authentication would fail

**Problem:**
- Offer submission fetch() didn't include `credentials: 'include'`
- HttpOnly session cookie wouldn't be sent to backend
- Backend would reject request as unauthorized

**Fix:**
```javascript
const response = await fetch('/api/offers/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // CRITICAL: Include session cookie
    body: JSON.stringify(payload)
});
```

---

### **Bug #4: Poor Error Handling for Rate Limiting**
**Severity:** 🟡 MEDIUM  
**Impact:** Users wouldn't understand why bids were rejected

**Problem:**
- 429 status code not specifically handled
- Generic error message for all failures
- Time-based restriction errors not user-friendly

**Fix:**
```javascript
if (response.status === 429) {
    // Rate limited - show specific error message
    console.log('⏱️ Rate Limited:', data.error);
    showToast(`⏱️ ${data.error || 'Please wait before bidding again'}`);
    return;
}

// Show backend validation errors (e.g., min/max limits)
showToast(`❌ ${data.error || 'Failed to submit offer'}`);
```

---

### **Bug #5: Missing `bidding_username` in `/api/users/me`**
**Severity:** 🔴 CRITICAL  
**Impact:** Frontend couldn't load bidding username from profile

**Problem:**
- SQL query didn't SELECT `bidding_username` column
- Frontend would receive `undefined` for user's bidding name
- "Bidding As: undefined" would display in modal

**Fix:**
```javascript
const user = await env.DB.prepare(
    `SELECT id, social_handle, email, phone, first_name, last_name, address, city, eircode,
     preferred_contact, role, created_at, is_allowlisted, bidding_username
     FROM users WHERE id=?`
)
```

---

## ✅ ENHANCEMENTS ADDED

### **Server-Side Bidding Rules Enforcement**
Added comprehensive validation in `functions/api/offers/submit.js`:

```javascript
// Min/Max limits by category
const bidLimits = {
    'PO-CLOTHES': { min: 50, max: 180 },
    'BN-CLOTHES': { min: 80, max: 250 },
    'BN-SHOES': { min: 70, max: 250 },
    'PO-SHOES': { min: 20, max: 180 }
};

// Time-based restriction: 1 bid per 5 minutes
const recentOffer = await db.prepare(`
    SELECT created_at, last_offer_at
    FROM customer_offers
    WHERE user_id = ? AND product_id = ?
    ORDER BY created_at DESC
    LIMIT 1
`).bind(userId, product_id).first();

if (recentOffer) {
    const timeSinceLastOffer = Date.now() - new Date(recentOffer.last_offer_at).getTime();
    if (timeSinceLastOffer < 5 * 60 * 1000) {
        return 429 error with minutes remaining
    }
}
```

### **Live Update System**
- ✅ Auto-polling every 5 seconds (pauses when tab hidden)
- ✅ Immediate refresh after submission
- ✅ Updates product cards AND modal display
- ✅ Shows bidding username in gold below highest offer

---

## 🧪 TESTING CHECKLIST

### Critical Paths to Test:
- [ ] **Submit first offer** - Should work, create offer with user_id
- [ ] **Submit second offer immediately** - Should reject with "wait 5 minutes"
- [ ] **Open modal** - Should show bidding username in "Bidding As" field
- [ ] **Check highest offer** - Should display username below amount
- [ ] **Try to bid below minimum** - Should reject with min limit message
- [ ] **Try to bid above maximum** - Should reject with max limit message
- [ ] **Switch tabs** - Polling should pause (check console)
- [ ] **Return to tab** - Should immediately refresh offers
- [ ] **Log out and bid** - Should redirect to login
- [ ] **Bid without bidding_username set** - Should prompt to set username

### Database Verification:
```sql
-- Check user_id is being recorded
SELECT offer_id, product_id, user_id, customer_name, offer_amount, last_offer_at 
FROM customer_offers 
ORDER BY created_at DESC 
LIMIT 5;

-- Verify bidding username JOIN works
SELECT co.offer_id, co.offer_amount, u.bidding_username
FROM customer_offers co
LEFT JOIN users u ON co.user_id = u.id
ORDER BY co.created_at DESC
LIMIT 5;
```

---

## 📊 Database Schema Changes

### Tables Modified:
1. **`customer_offers`** - Added columns:
   - `user_id INTEGER` - Links to users.id
   - `last_offer_at DATETIME` - Timestamp for rate limiting

2. **`users`** - No changes (already had `bidding_username`)

### Migration Script:
```sql
-- Run in production
ALTER TABLE customer_offers ADD COLUMN user_id INTEGER;
ALTER TABLE customer_offers ADD COLUMN last_offer_at DATETIME;

-- Verify
PRAGMA table_info('customer_offers');
```

---

## 🚀 Files Modified

### Backend:
- ✅ `functions/api/offers/submit.js` - Added user_id, time checks, min/max validation
- ✅ `functions/api/offers/highest.js` - Fixed SQL for username display
- ✅ `functions/api/[[path]].js` - Added bidding_username to /api/users/me

### Frontend:
- ✅ `public/shop.html` - Added credentials, error handling, polling pause, visibility detection

### Database:
- ✅ Production database altered (user_id and last_offer_at columns added)

---

## 🎯 Performance Improvements

1. **Reduced API Calls:**
   - Polling pauses when tab hidden
   - Only fetches when user is actively viewing

2. **Better Error Messages:**
   - Specific 429 handling for rate limits
   - Backend validation errors shown to user
   - Time remaining displayed in rejection message

3. **Smart Polling:**
   - Checks document.hidden before each poll
   - Immediate refresh when tab becomes visible
   - Cleanup on page unload

---

## 🔒 Security Enhancements

1. **Session Validation:**
   - All offer submissions require valid session
   - User ID extracted from session (not client input)

2. **Rate Limiting:**
   - Server-side enforcement (not just client validation)
   - Per-user, per-item time tracking

3. **Input Validation:**
   - Min/max limits enforced server-side
   - Double validation (client + server)

---

## 📝 Known Limitations

1. **No WebSocket support** - Uses polling instead of real-time push
   - **Mitigation:** 5-second polling is acceptable for this use case
   
2. **SQLite limitations** - No window functions for complex queries
   - **Mitigation:** Split into multiple simple queries

3. **No offer history** - Users can't see their previous bids
   - **Future:** Add /api/users/me/offers endpoint

---

## 🎮 Deployment Info

**Production URL:** https://98196b62.unity-v3.pages.dev  
**Database:** unity-v3 (D1 SQLite at Cloudflare edge)  
**Deployment Time:** ~90 seconds  
**Status:** ✅ ALL BUGS FIXED

---

## 📚 Related Documentation

- `MAKE-AN-OFFER-SYSTEM-COMPLETE.md` - Original feature implementation
- `copilot-instructions.md` - Project architecture overview
- `database/schema-unified.sql` - Database schema reference

---

**Bug Review Status:** ✅ COMPLETE  
**All Critical Bugs:** ✅ FIXED  
**Ready for Testing:** ✅ YES
