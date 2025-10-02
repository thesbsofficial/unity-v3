# 🔐 UNIFIED CUSTOMER ACCOUNT STRATEGY

**Goal:** Every customer has ONE account that tracks:
1. Their purchases (orders)
2. Their sell submissions (cases)
3. Their profile (contact info, addresses)
4. Their activity history

---

## 🎯 CURRENT STATE ANALYSIS

### Foreign Key Relationships
✅ **orders.user_id** → users(id) - ENFORCED  
⚠️ **sell_cases.user_id** → users(id) - NOT ENFORCED (nullable)  
✅ **sessions.user_id** → users(id) - ENFORCED  

### The Problem
- `sell_cases.user_id` is **nullable** (allows anonymous selling)
- No FOREIGN KEY constraint on `sell_cases.user_id`
- When user registers, no automatic linking of their past anonymous submissions

---

## 🏗️ UNIFIED ACCOUNT ARCHITECTURE

### Core Principle
**ONE user = ONE profile = ALL their activity**

```
users (id: 1)
├── orders (user_id: 1)          ← All their purchases
├── sell_cases (user_id: 1)      ← All their sell submissions
├── sessions (user_id: 1)        ← Active login sessions
└── Profile Data
    ├── first_name, last_name
    ├── email, phone
    ├── social_handle (username + contact)
    ├── address, city, eircode
    └── preferred_contact
```

---

## 📊 DATA FLOW SCENARIOS

### Scenario 1: Registered User Selling
1. User logs in (has `user_id`)
2. Goes to `/sell.html`
3. Form auto-fills from their profile
4. Submit → `sell_cases.user_id = logged_in_user_id`
5. ✅ Case is linked to their account immediately

### Scenario 2: Anonymous User Selling
1. User NOT logged in
2. Goes to `/sell.html`
3. Fills form manually
4. Submit → `sell_cases.user_id = NULL`
5. ⚠️ Case created but not linked to any account

### Scenario 3: Anonymous Seller Registers Later
**CURRENT PROBLEM:** No automatic linking!

**SOLUTION:** Match by email or social_handle
1. User submits case anonymously (user_id = NULL)
2. Later they register with same email/social_handle
3. On registration → Check for orphaned cases
4. Link orphaned cases: `UPDATE sell_cases SET user_id = ? WHERE email = ? OR social_handle = ?`

### Scenario 4: Registered User Buying
1. User logs in
2. Adds items to cart
3. Checkout → auto-fill delivery from profile
4. Submit order → `orders.user_id = logged_in_user_id`
5. ✅ Order linked to account immediately

---

## 🛡️ SECURITY & DATA INTEGRITY

### Critical Issues to Fix

#### 1. Add Foreign Key Constraint to sell_cases
**Problem:** Currently no FK constraint  
**Risk:** Orphaned records if user deleted  

**Solution:**
```sql
-- This would require recreating the table (SQLite limitation)
-- OR ensure application logic handles it
```

#### 2. Prevent User Deletion with Active Data
**Problem:** If user deleted, what happens to their orders/cases?  

**Options:**
- **A) Cascade Delete** - Delete all user's data (dangerous!)
- **B) Soft Delete** - Set `users.is_active = 0`, keep data
- **C) Prevent Delete** - Don't allow deletion if they have orders/cases

**Recommendation: Option B (Soft Delete)**
```sql
-- Don't actually delete users
-- Just deactivate them
UPDATE users SET is_active = 0 WHERE id = ?;
```

#### 3. Privacy & Data Access
**Rules:**
- Users can ONLY see their own orders (WHERE user_id = logged_in_user_id)
- Users can ONLY see their own sell cases (WHERE user_id = logged_in_user_id)
- Admin can see everything
- Never expose other users' data

---

## 🔄 ACCOUNT LINKING STRATEGY

### When to Link Anonymous Submissions

**Option A: On Registration (Automatic)**
```javascript
// In register endpoint
async function registerUser(userData) {
    // 1. Create user account
    const userId = await createUser(userData);
    
    // 2. Link orphaned sell cases by email
    if (userData.email) {
        await DB.prepare(
            'UPDATE sell_cases SET user_id = ? WHERE user_id IS NULL AND email = ?'
        ).bind(userId, userData.email).run();
    }
    
    // 3. Link orphaned sell cases by social_handle
    if (userData.social_handle) {
        await DB.prepare(
            'UPDATE sell_cases SET user_id = ? WHERE user_id IS NULL AND social_handle = ?'
        ).bind(userId, userData.social_handle).run();
    }
    
    return userId;
}
```

**Option B: Manual Claim (User-Initiated)**
- User sees "You have X unclaimed submissions" in dashboard
- They review and confirm: "Yes, that's mine"
- System links: `UPDATE sell_cases SET user_id = ? WHERE case_id = ?`

**Recommendation: Hybrid Approach**
- Automatic linking by email (high confidence)
- Manual claim for social_handle matches (user confirms)

---

## 📱 DASHBOARD UNIFIED VIEW

### Customer Dashboard Structure

```
/dashboard.html
├── Profile Section
│   ├── Name, Email, Phone
│   ├── Address, City, Eircode
│   ├── Social Handle, Preferred Contact
│   └── [Edit Profile] button
│
├── My Orders (Purchases)
│   ├── Order #12345 - €45.00 - Pending
│   ├── Order #12344 - €120.00 - Delivered
│   └── [View All Orders]
│
├── My Sell Submissions
│   ├── CASE-2025-001 - Nike Hoodie - Reviewing
│   ├── CASE-2025-002 - Adidas Shoes - Offered €30
│   └── [View All Cases]
│
└── Quick Actions
    ├── [Sell More Items]
    ├── [Browse Shop]
    └── [Account Settings]
```

### Data Queries for Dashboard

```sql
-- Get user profile
SELECT * FROM users WHERE id = ? AND is_active = 1;

-- Get user's orders (most recent first)
SELECT order_number, total_amount, status, created_at 
FROM orders 
WHERE user_id = ? 
ORDER BY created_at DESC 
LIMIT 10;

-- Get user's sell cases (most recent first)
SELECT case_id, brand, category, price, offer_amount, status, created_at
FROM sell_cases
WHERE user_id = ?
ORDER BY created_at DESC
LIMIT 10;

-- Get unclaimed cases (for linking)
SELECT case_id, brand, category, email, social_handle, created_at
FROM sell_cases
WHERE user_id IS NULL 
AND (email = ? OR social_handle = ?)
ORDER BY created_at DESC;
```

---

## 🚀 IMPLEMENTATION PLAN

### Phase 1: Data Integrity ✅ DONE
- ✅ Standardize field names across tables
- ✅ Add missing fields (eircode, preferred_contact)
- ✅ Update API to save full profile

### Phase 2: Account Linking (Next)
- [ ] Add automatic linking on registration (by email)
- [ ] Add API endpoint: `GET /api/users/me/unclaimed-cases`
- [ ] Add API endpoint: `POST /api/users/me/claim-case`
- [ ] Add logic to `functions/api/cases/submit.js` to check if user logged in

### Phase 3: Dashboard (Priority)
- [ ] Create `/dashboard.html`
- [ ] Add API endpoint: `GET /api/users/me/orders`
- [ ] Add API endpoint: `GET /api/users/me/sell-cases`
- [ ] Show unified view of purchases + sell submissions
- [ ] Allow profile editing

### Phase 4: Sell Form Enhancement
- [ ] Check if user is logged in
- [ ] If logged in → auto-fill from profile + set `user_id`
- [ ] If not logged in → manual entry + `user_id = NULL`
- [ ] After submission → prompt to register if anonymous

### Phase 5: Shop/Checkout Enhancement
- [ ] Require login for checkout
- [ ] Auto-fill delivery from profile
- [ ] Save order with `user_id`
- [ ] Show order confirmation in dashboard

---

## 🔒 SECURITY CHECKLIST

### API Endpoints Security

#### Registration (`POST /api/users/register`)
- ✅ Validate all input
- ✅ Hash password with salt
- ✅ Check for existing user
- [ ] Link orphaned cases by email
- ✅ Return session token

#### Login (`POST /api/users/login`)
- ✅ Verify credentials
- ✅ Create session
- ✅ Return full user profile
- [ ] Don't expose password_hash

#### Get Profile (`GET /api/users/me`)
- ✅ Require valid session token
- ✅ Return user's data only
- [ ] Include: orders_count, cases_count

#### Get Orders (`GET /api/users/me/orders`)
- [ ] Require valid session token
- [ ] WHERE user_id = session.user_id ONLY
- [ ] Never expose other users' orders

#### Get Sell Cases (`GET /api/users/me/sell-cases`)
- [ ] Require valid session token
- [ ] WHERE user_id = session.user_id ONLY
- [ ] Show status, offer_amount, photos

#### Submit Case (`POST /api/cases/submit`)
- [ ] If logged in → use session.user_id
- [ ] If not logged in → user_id = NULL
- [ ] Don't allow setting user_id manually (security!)

---

## 📋 DATABASE MIGRATION NEEDED

### Add Foreign Key Constraint (Soft)
Since SQLite doesn't easily support adding FK to existing tables, enforce in app logic:

```javascript
// Before inserting sell_case
if (userId) {
    // Verify user exists
    const user = await DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
    if (!user) {
        throw new Error('Invalid user_id');
    }
}
```

### Add Indexes for Performance
```sql
-- Index for finding unclaimed cases
CREATE INDEX IF NOT EXISTS idx_sell_cases_user_id ON sell_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_sell_cases_email ON sell_cases(email);
CREATE INDEX IF NOT EXISTS idx_sell_cases_social_handle ON sell_cases(social_handle);
```

---

## ✅ SUCCESS CRITERIA

### User Experience
- ✅ User registers once with full profile
- ✅ Profile auto-fills all forms (selling, buying)
- ✅ Dashboard shows all activity in one place
- ✅ Past anonymous submissions automatically linked
- ✅ Easy to track orders and sell submissions

### Data Integrity
- ✅ No orphaned orders (always have user_id)
- ✅ Sell cases linked when possible (by email/handle)
- ✅ Users can't see other users' data
- ✅ Soft delete preserves history
- ✅ Foreign keys enforced (in app logic)

### Security
- ✅ Session tokens validated on every request
- ✅ Users can only access their own data
- ✅ Passwords hashed with salt
- ✅ SQL injection prevented (prepared statements)
- ✅ CORS configured correctly

---

## 🎯 NEXT IMMEDIATE STEPS

1. **Update `functions/api/[[path]].js` register endpoint:**
   - Add automatic case linking by email after user creation

2. **Update `functions/api/cases/submit.js`:**
   - Check if user is logged in
   - If logged in → use their user_id
   - If not logged in → user_id = NULL

3. **Create new API endpoints:**
   - `GET /api/users/me/orders` - List user's orders
   - `GET /api/users/me/sell-cases` - List user's sell submissions
   - `GET /api/users/me/unclaimed-cases` - Find orphaned cases
   - `POST /api/users/me/claim-case` - Link a case to user

4. **Create `/dashboard.html`:**
   - Unified view of profile + orders + cases
   - Edit profile form
   - Links to view details

5. **Add indexes for performance:**
   - Index on `sell_cases(email)`
   - Index on `sell_cases(social_handle)`

---

**Ready to implement unified account strategy! 🚀**
