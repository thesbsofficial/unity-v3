# 🧪 HOW TO TEST ANALYTICS SYSTEM

**Date:** October 3, 2025  
**Status:** ✅ LIVE & READY TO TEST

---

## 🎯 Quick Test - Use The Test Page

**Easiest way to generate test data:**

1. **Visit the test page:**

   ```
   https://thesbsofficial.com/test-analytics.html
   ```

2. **Click the buttons to generate events:**

   - 📊 Generate 10 Page Views
   - 👁️ Generate 5 Product Views
   - 🛒 Generate 3 Cart Additions
   - 💰 Generate 2 Purchases
   - 🔍 Generate 4 Searches
   - 🎯 Generate Full Customer Journey (does all of the above in sequence)

3. **Events are sent automatically** to your analytics API

4. **View in analytics dashboard:**
   - Go to: https://thesbsofficial.com/admin/analytics/
   - Click "Sync Now" to aggregate the data
   - View charts, stats, top products

---

## 🛍️ Real Shopping Test

**Test the actual checkout flow:**

1. **Go to shop:**

   ```
   https://thesbsofficial.com/shop.html
   ```

2. **Browse products:**

   - Analytics tracks page view ✅
   - Click product images to view (tracked)

3. **Add items to cart:**

   - Click "Add to Basket" on products
   - Analytics tracks each cart addition ✅
   - Cart shows total price

4. **Checkout:**

   - Click basket icon (top right)
   - Click "Proceed to Checkout"
   - Fill in delivery details:
     - Name, Email, Phone
     - Address, City, Eircode
     - Delivery notes (optional)
   - Click "Place Order"

5. **What happens:**
   - Order ID generated (e.g. ORDER-1696348800000-abc123)
   - Purchase tracked in analytics ✅
   - Success message shows
   - Cart cleared
   - Order logged to console (for now)

---

## 📊 Check The Data

### Method 1: Analytics Dashboard (Visual)

1. Login to admin (if needed): https://thesbsofficial.com/admin/login.html
2. Go to analytics: https://thesbsofficial.com/admin/analytics/
3. Click "Sync Now" button (top right)
4. View:
   - Stats cards (visitors, revenue, orders, conversion)
   - Revenue trend chart
   - Conversion funnel
   - Top products table
   - Top searches table

### Method 2: Database Query (Raw Data)

Check your Cloudflare D1 database:

```sql
-- See latest events
SELECT * FROM analytics_events
ORDER BY created_at DESC
LIMIT 20;

-- Count events by type today
SELECT event_type, COUNT(*) as count
FROM analytics_events
WHERE DATE(created_at) = DATE('now')
GROUP BY event_type;

-- Today's purchases
SELECT
    JSON_EXTRACT(metadata, '$.order_id') as order_id,
    value as total,
    created_at
FROM analytics_events
WHERE event_type = 'purchase'
AND DATE(created_at) = DATE('now');

-- Cart additions with product info
SELECT
    product_id,
    category,
    brand,
    JSON_EXTRACT(metadata, '$.size') as size,
    COUNT(*) as adds,
    SUM(value) as total_value
FROM analytics_events
WHERE event_type = 'add_to_cart'
AND DATE(created_at) = DATE('now')
GROUP BY product_id;
```

### Method 3: Browser Console

Open browser console (F12) on any page and check:

```javascript
// Check if analytics is loaded
console.log(window.SBSAnalytics);

// See session ID
const analytics = new SBSAnalytics();
console.log("Session ID:", analytics.sessionId);

// Manually track a test event
analytics.track("test_event", { test: "data" });

// Check queue
console.log("Event queue:", analytics.eventQueue);
```

---

## 🎭 What Gets Tracked

### Current Events (LIVE)

| Event            | Where            | Data Captured                                      |
| ---------------- | ---------------- | -------------------------------------------------- |
| `page_view`      | All pages        | page path, session_id, timestamp                   |
| `add_to_cart`    | Shop             | product_id, category, brand, size, price, quantity |
| `checkout_start` | Checkout modal   | item_count, total                                  |
| `purchase`       | Order submission | order_id, total, items array, payment_method       |

### Simulated Events (Test Page Only)

| Event          | Test Generator         | Data Captured                            |
| -------------- | ---------------------- | ---------------------------------------- |
| `product_view` | Generate Product Views | product_id, name, category, brand, price |
| `search`       | Generate Searches      | query, results_count                     |

---

## 📝 Sample Test Flow

**Complete end-to-end test (5 minutes):**

1. **Generate background data** (test-analytics.html):

   - Click "Generate Full Customer Journey" (creates realistic session)
   - Click "Generate 10 Page Views"
   - Click "Generate 3 Cart Additions"

2. **Real shopping experience** (shop.html):

   - Browse products
   - Add 2-3 items to cart
   - View cart (check total)
   - Click checkout
   - Fill form with test data:
     ```
     Name: Test Customer
     Email: test@example.com
     Phone: 0851234567
     Address: 123 Test Street
     City: Dublin
     Notes: Test order for analytics
     ```
   - Submit order

3. **Check analytics** (admin/analytics):

   - Login if needed
   - Click "Sync Now"
   - Verify:
     - Page view count increased
     - Cart additions showing
     - Purchase recorded
     - Revenue calculated
     - Top products updated

4. **Check database**:
   - Query `analytics_events` table
   - Should see 15-20+ events
   - Check `analytics_daily_summary` after sync
   - Verify product_performance table updated

---

## 🔍 What You Should See

### In Analytics Dashboard:

**Stats Cards:**

- Unique Visitors: 1-5 (depending on sessions)
- Revenue: Sum of all purchases (e.g. €500+)
- Orders: Number of purchases
- Conversion Rate: % of visitors who purchased

**Charts:**

- Revenue trend showing today's purchases
- Conversion funnel (views → cart → purchase)

**Tables:**

- Top products by revenue
- Top search terms (if searches generated)

### In Database:

**analytics_events table:**

```
| id | event_type    | product_id      | category  | value | created_at          |
|----|---------------|-----------------|-----------|-------|---------------------|
| 45 | purchase      | null            | null      | 180.0 | 2025-10-03 19:45:23 |
| 44 | checkout_start| null            | null      | 180.0 | 2025-10-03 19:45:20 |
| 43 | add_to_cart   | SNEAKERS-10-... | SNEAKERS  | 180.0 | 2025-10-03 19:44:15 |
| 42 | page_view     | null            | null      | null  | 2025-10-03 19:44:10 |
```

**analytics_daily_summary table (after sync):**

```
| date       | unique_visitors | total_purchases | total_revenue | conversion_rate |
|------------|-----------------|-----------------|---------------|-----------------|
| 2025-10-03 | 3               | 2               | 340.00        | 0.67            |
```

---

## ⚠️ Important Notes

### Order Processing

- Orders are **NOT saved to database yet** (orders API not built)
- Order data logged to browser console for now
- Analytics purchase tracking WORKS ✅
- Customer details collected but not persisted

### Next Steps for Full Functionality

1. Build `/api/orders` endpoint to save orders
2. Build admin orders management page
3. Add email notifications to customers
4. Add order status tracking

### For Now (Testing)

- Focus on analytics tracking ✅
- Verify events are captured ✅
- Check dashboard displays data ✅
- Test checkout form UX ✅

---

## 🎯 Test Checklist

- [ ] Visit test-analytics.html and generate events
- [ ] Visit shop.html (page view tracked)
- [ ] Add 2-3 items to cart (cart events tracked)
- [ ] Open basket modal (see total price)
- [ ] Click checkout (modal opens)
- [ ] Fill delivery form
- [ ] Submit order (purchase tracked)
- [ ] Check browser console for order data
- [ ] Go to admin analytics dashboard
- [ ] Click "Sync Now"
- [ ] Verify stats updated
- [ ] Check charts showing data
- [ ] Query database for raw events
- [ ] Verify event counts match actions

---

## 📞 What's Working vs Not

### ✅ Working (LIVE)

- Analytics tracking on all pages
- Cart functionality with prices
- Checkout modal with customer form
- Purchase tracking to analytics
- Admin analytics dashboard
- Data aggregation (sync)
- Charts and stats display

### ⏳ Not Built Yet

- Orders API endpoint
- Orders database table
- Admin orders management page
- Customer email notifications
- Order status tracking
- Payment processing

### 🎯 Current Purpose

Test and verify analytics system works correctly before building full order management system.

---

**Ready to test! Start here:** https://thesbsofficial.com/test-analytics.html
