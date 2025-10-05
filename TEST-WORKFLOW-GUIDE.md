# End-to-End Test Guide: Buy & Sell Workflow

## Overview
This guide walks through testing the complete buy and sell workflows on production, from customer submission through admin approval to customer dashboard visibility.

## Test Accounts

### Customer Account (sumbot)
- **Email:** `sumbot@example.com`
- **Password:** `Customer123!`
- **Social Handle:** `@sumbot`
- **User ID (Remote):** 16

### Admin Account
- **Email:** `admin@test.com`
- **Password:** `Admin123!`
- **Admin privileges:** Enabled via admin_allowlist

## Pre-Seeded Test Data

### Buy Order: ORD-SUMBOT01
- **Status:** pending
- **Total:** €165.00
- **Items:**
  - Test Sneaker White (UK 8) - €75.00
  - Test Sneaker Black (UK 9) - €75.00
- **Delivery:** 123 Test Street, Dublin, D01 ABC1

### Sell Submission
- **Batch ID:** SELL-[timestamp]
- **Status:** pending
- **Item:** Nike Air Max 90, UK 10, Good condition
- **Seller Price:** €120.00
- **Message:** "Looking to sell this pair quickly"

---

## Test Workflow

### Part 1: Admin Approval (Buy Order)

1. **Navigate to Admin Orders Dashboard**
   ```
   https://thesbsofficial.com/admin/orders/
   ```

2. **Log in as admin**
   - Email: `admin@test.com`
   - Password: `Admin123!`

3. **Locate ORD-SUMBOT01**
   - Should appear in the "Pending" filter/section
   - Order shows €165.00 total, 2 items

4. **Approve the order**
   - Click on order row or "View Details"
   - Click "Confirm Order" or equivalent action button
   - Optionally add admin notes: "Approved for fulfillment"
   - Status should change from `pending` → `confirmed`

5. **Verify admin logs**
   - Check that action was logged with admin user ID and timestamp

---

### Part 2: Admin Approval (Sell Submission)

1. **Navigate to Admin Sell Dashboard**
   ```
   https://thesbsofficial.com/admin/sell/
   ```

2. **Ensure still logged in as admin**

3. **Locate sumbot's sell submission**
   - Filter by "Pending" status
   - Look for batch starting with `SELL-`
   - Contact: Sum Bot, +353899999999, sumbot@example.com

4. **Approve the submission**
   - Click submission row or "Review"
   - Option 1: Accept directly → status changes to `approved`
   - Option 2: Send offer:
     - Offered Price: €100.00
     - Offer Message: "We can offer €100 for this pair"
     - Status changes to `offer_sent`
   - Add admin notes if desired

5. **Check notification**
   - Verify email would be sent to sumbot@example.com (if notifications enabled)

---

### Part 3: Customer Dashboard Verification

1. **Log out of admin account**

2. **Navigate to Customer Login**
   ```
   https://thesbsofficial.com/login.html
   ```

3. **Log in as sumbot**
   - Email: `sumbot@example.com`
   - Password: `Customer123!`

4. **Check Customer Dashboard**
   ```
   https://thesbsofficial.com/dashboard.html
   ```

5. **Verify Buy Order Visibility**
   - Look for "My Orders" or equivalent section
   - Order `ORD-SUMBOT01` should be listed
   - Status: `confirmed` (or `Confirmed` label)
   - Total: €165.00
   - Items: 2 sneakers displayed with names, sizes
   - Admin notes visible: "Approved for fulfillment"

6. **Verify Sell Submission Visibility**
   - Look for "My Sell Submissions" or "Sell Requests" section
   - Batch ID starting with `SELL-` should appear
   - Status: 
     - `approved` if directly accepted, OR
     - `offer_sent` if offer was made
   - If offer sent:
     - Offered Price: €100.00
     - Offer Message displayed
     - Options to accept/decline offer (if UI supports it)

7. **Test Interactions (Optional)**
   - If offer was sent, click "Accept Offer" or "Decline Offer"
   - Verify status updates accordingly
   - Check that admin sees seller response in their dashboard

---

## Expected Outcomes

### ✅ Success Criteria

1. **Admin Order Dashboard:**
   - Shows ORD-SUMBOT01 in pending list
   - Approve action works, status updates to confirmed
   - Order moves to "Confirmed" filter
   - Admin notes saved and displayed

2. **Admin Sell Dashboard:**
   - Shows sumbot's sell submission in pending list
   - Approve or Send Offer actions work
   - Status updates correctly (approved/offer_sent)
   - Admin notes and offer details saved

3. **Customer Dashboard (sumbot):**
   - Buy order ORD-SUMBOT01 displays with correct:
     - Order number
     - Status (confirmed)
     - Total amount
     - Item details
     - Admin notes
   - Sell submission displays with correct:
     - Batch ID
     - Status (approved or offer_sent)
     - Item details
     - Offer details (if applicable)
     - Seller price

4. **Data Integrity:**
   - Database records match UI display
   - Timestamps (created_at, updated_at, reviewed_at) are accurate
   - User associations correct (user_id=16 for sumbot)

### ❌ Failure Indicators

- Order or sell submission not visible in admin dashboards
- Status not updating after approval action
- Customer dashboard shows no orders/submissions
- Data mismatch between admin view and customer view
- Errors in browser console or API responses
- Admin notes not saving or displaying

---

## Troubleshooting

### If order doesn't appear in admin dashboard:
```sql
-- Check remote database for order
npx wrangler d1 execute unity-v3 --remote --command "SELECT * FROM orders WHERE order_number='ORD-SUMBOT01';"
```

### If sell submission missing:
```sql
-- Check remote database for sell submission
npx wrangler d1 execute unity-v3 --remote --command "SELECT * FROM sell_submissions WHERE user_id=16;"
```

### If customer dashboard is empty:
- Check browser console for API errors
- Verify login session is active (check cookies)
- Test API endpoint directly:
  ```
  GET https://thesbsofficial.com/api/users/me/orders
  (with session cookie)
  ```

### If status update fails:
- Check admin API response in Network tab
- Verify CSRF token is being sent
- Check admin_allowlist includes admin user

---

## API Testing (Alternative to UI)

### Get Admin Session Token
```bash
curl -i -X POST https://thesbsofficial.com/api/users/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"admin@test.com","password":"Admin123!"}'
```

### Approve Buy Order
```bash
curl -i -X PUT https://thesbsofficial.com/api/admin/orders/[ORDER_ID] \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"status":"confirmed","admin_notes":"Approved for fulfillment"}'
```

### Approve Sell Submission
```bash
curl -i -X PUT https://thesbsofficial.com/api/admin/sell/[SUBMISSION_ID] \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"status":"approved","admin_notes":"Item accepted"}'
```

### Get Customer Orders
```bash
# First login as sumbot
curl -i -X POST https://thesbsofficial.com/api/users/login \
  -H "Content-Type: application/json" \
  -c sumbot-cookies.txt \
  -d '{"email":"sumbot@example.com","password":"Customer123!"}'

# Then fetch orders
curl -i https://thesbsofficial.com/api/users/me/orders \
  -b sumbot-cookies.txt
```

---

## Notes

- Test data has been seeded to **production** database
- Both local and remote schemas differ slightly - remote uses simpler structure
- Admin approval should trigger notification emails (check logs)
- Dashboard UI may cache data - hard refresh (Ctrl+F5) if needed
- All timestamps are UTC

---

## Cleanup (Optional)

To remove test data after testing:

```sql
-- Delete test order
npx wrangler d1 execute unity-v3 --remote --command "DELETE FROM orders WHERE order_number='ORD-SUMBOT01';"

-- Delete test sell submission
npx wrangler d1 execute unity-v3 --remote --command "DELETE FROM sell_submissions WHERE user_id=16;"

-- Optionally delete test user
npx wrangler d1 execute unity-v3 --remote --command "DELETE FROM users WHERE email='sumbot@example.com';"
```
