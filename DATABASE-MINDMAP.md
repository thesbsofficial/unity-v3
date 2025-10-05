# 🗺️ UNITY-V3 DATABASE ARCHITECTURE MINDMAP

## 📊 Complete Database & Button Interaction Flow

---

## 🏗️ CORE DATABASE TABLES

### 👥 **USERS TABLE**
**Purpose:** Store customer accounts
**Fields:** id, email, password_hash, first_name, last_name, address, city, eircode, phone, role, email_verified
**Relationships:**
- → sessions (one user has many sessions)
- → orders (one user has many orders)
- → sell_submissions (one user has many sell submissions)
- → analytics (tracks user behavior)

**Triggered By:**
- 🔘 **Register Button** → `/api/auth/register` → INSERT INTO users
- 🔘 **Login Button** → `/api/auth/login` → SELECT FROM users + INSERT INTO sessions
- 🔘 **Update Profile Button** → `/api/user/profile` → UPDATE users
- 🔘 **Admin User Management** → `/api/admin/users` → SELECT/UPDATE/DELETE users

---

### 🔐 **SESSIONS TABLE**
**Purpose:** Manage user login sessions (JWT alternative)
**Fields:** id, user_id, token, csrf_secret, expires_at, ip_address, user_agent, created_at
**Relationships:**
- ← users (many sessions belong to one user)

**Triggered By:**
- 🔘 **Login Button** → `/api/auth/login` → INSERT INTO sessions
- 🔘 **Logout Button** → `/api/auth/logout` → DELETE FROM sessions
- ⚡ **Auto Session Cleanup** → Cron job → DELETE expired sessions

---

### 🔑 **PASSWORD_RESETS TABLE**
**Purpose:** Handle password reset requests
**Fields:** id, user_id, token, expires_at, used_at, created_at
**Relationships:**
- ← users (many resets belong to one user)

**Triggered By:**
- 🔘 **Forgot Password Button** → `/api/auth/forgot-password` → INSERT INTO password_resets
- 🔘 **Reset Password Submit** → `/api/auth/reset-password` → UPDATE password_resets + UPDATE users

---

## 🛍️ SHOPPING (BUY SIDE)

### 📦 **PRODUCTS TABLE**
**Purpose:** Store inventory items for sale
**Fields:** id, name, description, price, category, size, brand, color, condition, stock_quantity, sku, image_urls, is_active, featured, created_at, updated_at
**Relationships:**
- → order_items (one product appears in many orders)
- → product_reservations (one product can be reserved)

**Triggered By:**
- 🔘 **Add Product Button** (Admin) → `/api/admin/inventory` → INSERT INTO products
- 🔘 **Edit Product Button** (Admin) → `/api/admin/inventory/[id]` → UPDATE products
- 🔘 **Delete Product Button** (Admin) → `/api/admin/inventory/[id]` → DELETE FROM products
- 🔘 **Upload Images Button** → Cloudflare Images API → UPDATE products.image_urls
- 📱 **Shop Page Load** → `/api/products` → SELECT FROM products WHERE is_active=1
- 🔍 **Search/Filter Products** → `/api/products?category=X&size=Y` → SELECT FROM products

---

### 🛒 **ORDERS TABLE**
**Purpose:** Store completed purchases
**Fields:** id, order_number, user_id, status, total_price, delivery_address, delivery_city, delivery_eircode, delivery_method, payment_status, payment_method, admin_notes, customer_notes, created_at, completed_at
**Relationships:**
- ← users (many orders belong to one user)
- → order_items (one order has many items)

**Triggered By:**
- 🔘 **Checkout Button** → `/api/checkout` → INSERT INTO orders + INSERT INTO order_items + UPDATE products.stock_quantity
- 🔘 **Update Order Status** (Admin) → `/api/admin/orders/[id]` → UPDATE orders
- 🔘 **Mark Paid** (Admin) → `/api/admin/orders/[id]` → UPDATE orders SET payment_status='paid'
- 📱 **My Orders Page Load** → `/api/orders` → SELECT FROM orders WHERE user_id=X
- 📊 **Admin Orders Dashboard** → `/api/admin/orders` → SELECT FROM orders

---

### 📋 **ORDER_ITEMS TABLE**
**Purpose:** Store individual items within each order
**Fields:** id, order_id, product_id, quantity, unit_price, subtotal
**Relationships:**
- ← orders (many items belong to one order)
- ← products (many order_items reference one product)

**Triggered By:**
- 🔘 **Checkout Button** → `/api/checkout` → INSERT INTO order_items (bulk)
- 📊 **Order Details View** → `/api/admin/orders/[id]` → SELECT FROM order_items WHERE order_id=X

---

### ⏰ **PRODUCT_RESERVATIONS TABLE**
**Purpose:** Hold items in cart for limited time
**Fields:** id, product_id, user_id, session_id, quantity, expires_at, created_at
**Relationships:**
- ← products (many reservations for one product)
- ← users (many reservations by one user)

**Triggered By:**
- 🔘 **Add to Cart Button** → `/api/cart/add` → INSERT INTO product_reservations
- 🔘 **Remove from Cart** → `/api/cart/remove` → DELETE FROM product_reservations
- 🔘 **Checkout Button** → `/api/checkout` → DELETE FROM product_reservations (releases hold)
- ⚡ **Auto Cleanup** → Cron job → DELETE expired reservations

---

## 💰 SELLING (SELL SIDE)

### 📤 **SELL_SUBMISSIONS TABLE** ⭐ ENHANCED
**Purpose:** Store customer sell requests with negotiation workflow
**Fields:** 
- **Identity:** id, batch_id, user_id
- **Contact:** contact_name, contact_phone, contact_email, contact_channel, contact_handle
- **Location:** address, city, eircode
- **Items:** items_json, item_count
- **Status:** status (pending/reviewing/approved/rejected/paid)
- **Review:** reviewed_by, reviewed_at, admin_notes, notes
- **💰 PRICING WORKFLOW:**
  - **seller_price** - Customer's asking price
  - **seller_message** - Customer's initial message
  - **offered_price** - Admin's offer
  - **offer_message** - Admin's offer details
  - **offer_sent_at** - When offer sent
  - **offer_expires_at** - Offer deadline
  - **seller_response** - accept/reject/counter
  - **seller_response_message** - Customer's response
  - **seller_response_at** - Response timestamp
  - **final_price** - Agreed price
- **Payment:** payment_method
- **Timestamps:** created_at, updated_at

**Relationships:**
- ← users (many submissions belong to one user)
- → sell_items (one submission has many items - normalized version)

**Triggered By:**
- 🔘 **Submit Sell Request Button** → `/api/sell-submissions` → INSERT INTO sell_submissions
- 🔘 **Send Offer Button** (Admin) → `/api/admin/sell-requests/[id]/offer` → UPDATE sell_submissions SET offered_price, offer_message, offer_sent_at, offer_expires_at
- 🔘 **Accept Offer Button** (Customer) → `/api/offers/[batch_id]/respond` → UPDATE sell_submissions SET seller_response='accept', final_price=offered_price
- 🔘 **Reject Offer Button** (Customer) → `/api/offers/[batch_id]/respond` → UPDATE sell_submissions SET seller_response='reject'
- 🔘 **Counter Offer Button** (Customer) → `/api/offers/[batch_id]/respond` → UPDATE sell_submissions SET seller_response='counter', seller_price=new_amount
- 🔘 **Update Status Button** (Admin) → `/api/admin/sell-requests/[id]` → UPDATE sell_submissions
- 🔘 **Mark Paid Button** (Admin) → `/api/admin/sell-requests/[id]` → UPDATE sell_submissions SET status='paid'
- 📱 **Sell Requests Page Load** (Admin) → `/api/admin/sell-requests` → SELECT FROM sell_submissions
- 📱 **Customer Offer View** → `/api/offers/[batch_id]` → SELECT FROM sell_submissions WHERE batch_id=X

---

### 📦 **SELL_ITEMS TABLE** (Optional Normalized Storage)
**Purpose:** Store individual items from sell submissions (normalized alternative to items_json)
**Fields:** id, submission_id, category, size, brand, description, condition, image_urls, estimated_value, actual_offer, notes, created_at
**Relationships:**
- ← sell_submissions (many items belong to one submission)

**Triggered By:**
- 🔘 **Submit Sell Request** → Can INSERT INTO sell_items (if using normalized approach)
- 📊 **Item Details View** → SELECT FROM sell_items WHERE submission_id=X

---

## 📈 ANALYTICS & TRACKING

### 📊 **ANALYTICS TABLE**
**Purpose:** Legacy analytics storage
**Fields:** id, metric_name, metric_value, metadata, created_at
**Relationships:** None (aggregate data)

**Triggered By:**
- ⚡ **System Events** → `/api/analytics/track` → INSERT INTO analytics

---

### 📊 **ANALYTICS_EVENTS TABLE** ⭐ ENHANCED
**Purpose:** Detailed event tracking (page views, button clicks, conversions)
**Fields:** id, event_type, event_data (JSON), user_id, session_id, ip_address, user_agent, path, referrer, created_at
**Relationships:**
- ← users (many events by one user)
- ← sessions (many events in one session)

**Triggered By:**
- 📱 **Every Page View** → Analytics JS → `/api/analytics/track` → INSERT INTO analytics_events
- 🔘 **Button Clicks** → Analytics JS → INSERT INTO analytics_events
- 🛒 **Add to Cart** → INSERT INTO analytics_events (event_type='add_to_cart')
- ✅ **Checkout Complete** → INSERT INTO analytics_events (event_type='purchase')
- 📤 **Sell Submission** → INSERT INTO analytics_events (event_type='sell_request')
- 📊 **Admin Analytics Dashboard** → `/api/admin/analytics` → SELECT FROM analytics_events

---

## 🖼️ MEDIA MANAGEMENT

### 🖼️ **IMAGES TABLE**
**Purpose:** Track Cloudflare Images uploads
**Fields:** id, cloudflare_id, url, variants (JSON), product_id, submission_id, uploaded_by, created_at
**Relationships:**
- ← products (many images for one product)
- ← sell_submissions (many images for one submission)

**Triggered By:**
- 🔘 **Upload Product Image** → Cloudflare Images API → INSERT INTO images
- 🔘 **Upload Sell Item Images** → Cloudflare Images API → INSERT INTO images
- 🗑️ **Delete Image Button** → Cloudflare Images API DELETE → DELETE FROM images

---

## 📝 SYSTEM OPERATIONS

### 📋 **SYSTEM_LOGS TABLE**
**Purpose:** Audit trail and error logging
**Fields:** id, log_level, message, context (JSON), ip_address, user_id, created_at
**Relationships:**
- ← users (many logs reference one user)

**Triggered By:**
- ⚡ **Any Error** → Global error handler → INSERT INTO system_logs
- 🔐 **Admin Actions** → Audit logging → INSERT INTO system_logs
- 🔍 **Security Events** → INSERT INTO system_logs
- 📊 **Admin Logs Dashboard** → `/api/admin/logs` → SELECT FROM system_logs

---

## 🔗 DATABASE RELATIONSHIP DIAGRAM

```
┌─────────────┐
│    USERS    │──────┬──────────────────────────────┐
└─────────────┘      │                              │
       │             │                              │
       ├─── sessions │                              │
       │             │                              │
       ├─── password_resets                         │
       │                                            │
       ├─── orders ──→ order_items ──→ products    │
       │                                │           │
       │                                └─── product_reservations
       │                                            │
       ├─── sell_submissions ──→ sell_items        │
       │                                            │
       ├─── analytics_events                       │
       │                                            │
       └─── system_logs                            │
                                                    │
            images ──┬──→ products                 │
                     └──→ sell_submissions ────────┘
```

---

## 🎯 KEY USER FLOWS & BUTTON MAPPING

### 🛍️ **CUSTOMER BUYING FLOW**
1. 📱 Browse products → `SELECT FROM products`
2. 🔘 **Add to Cart** → `INSERT INTO product_reservations`
3. 🔘 **Checkout** → `INSERT INTO orders` + `INSERT INTO order_items` + `UPDATE products` + `DELETE FROM product_reservations`
4. 📱 View order history → `SELECT FROM orders WHERE user_id=X`

### 💰 **CUSTOMER SELLING FLOW**
1. 🔘 **Submit Items** → `INSERT INTO sell_submissions`
2. ⏳ Wait for admin review
3. 📧 Receive offer email with link → `SELECT FROM sell_submissions WHERE batch_id=X`
4. 🔘 **Accept/Reject/Counter** → `UPDATE sell_submissions SET seller_response, final_price`
5. 💵 Receive payment

### 👨‍💼 **ADMIN WORKFLOW - INVENTORY**
1. 📱 View products → `SELECT FROM products`
2. 🔘 **Add Product** → `INSERT INTO products`
3. 🔘 **Upload Images** → Cloudflare API → `UPDATE products.image_urls`
4. 🔘 **Edit Stock** → `UPDATE products SET stock_quantity`
5. 🔘 **Delete Product** → `DELETE FROM products`

### 👨‍💼 **ADMIN WORKFLOW - SELL REQUESTS**
1. 📱 View requests → `SELECT FROM sell_submissions`
2. 🔘 **Review Request** → View items_json details
3. 🔘 **Send Offer** → `UPDATE sell_submissions SET offered_price, offer_message, offer_sent_at`
4. ⏳ Wait for customer response
5. 🔘 **Mark Paid** → `UPDATE sell_submissions SET status='paid', payment_method`

### 👨‍💼 **ADMIN WORKFLOW - ORDERS**
1. 📱 View orders → `SELECT FROM orders`
2. 🔘 **View Order Details** → `SELECT FROM order_items WHERE order_id=X`
3. 🔘 **Update Status** → `UPDATE orders SET status`
4. 🔘 **Mark Paid** → `UPDATE orders SET payment_status='paid'`

### 📊 **ADMIN ANALYTICS**
1. 📱 View dashboard → `SELECT FROM analytics_events`
2. 📊 Page views chart → `SELECT COUNT(*) WHERE event_type='page_view'`
3. 📊 Conversion funnel → Multiple event type queries
4. 📊 Top products → Join analytics_events with products

---

## ⚡ BACKGROUND PROCESSES (Cron Jobs)

1. **Session Cleanup** → `DELETE FROM sessions WHERE expires_at < NOW()`
2. **Reservation Cleanup** → `DELETE FROM product_reservations WHERE expires_at < NOW()`
3. **Expired Offers** → `UPDATE sell_submissions SET status='expired' WHERE offer_expires_at < NOW()`
4. **Analytics Aggregation** → Compute daily summaries from analytics_events

---

## 🔧 REMOVED OBSOLETE FIELDS (October 5, 2025)

### ❌ **DELETED FROM sell_submissions:**
- **estimated_value** - Never used in code, no purpose
- **total_offer** - Redundant, replaced by `offered_price`

**Migration:** See `/database/migrations/2025-10-05-remove-obsolete-fields.sql`

---

## 📚 API ENDPOINTS & THEIR DATABASE OPERATIONS

### Public Customer APIs:
- `POST /api/sell-submissions` → INSERT sell_submissions
- `GET /api/offers/[batch_id]` → SELECT sell_submissions
- `POST /api/offers/[batch_id]/respond` → UPDATE sell_submissions
- `GET /api/products` → SELECT products
- `POST /api/cart/add` → INSERT product_reservations
- `POST /api/checkout` → INSERT orders, order_items; UPDATE products; DELETE reservations

### Admin APIs:
- `GET /api/admin/sell-requests` → SELECT sell_submissions
- `POST /api/admin/sell-requests/[id]/offer` → UPDATE sell_submissions (send offer)
- `PUT /api/admin/sell-requests/[id]` → UPDATE sell_submissions
- `GET /api/admin/orders` → SELECT orders + order_items
- `GET /api/admin/inventory` → SELECT products
- `POST /api/admin/inventory` → INSERT products
- `GET /api/admin/analytics` → SELECT analytics_events
- `GET /api/admin/logs` → SELECT system_logs

---

## 🎨 FRONTEND BUTTON → DATABASE MAP

| Button/Action | Page | API Endpoint | Database Operation |
|--------------|------|--------------|-------------------|
| 🔘 Register | /auth/register | POST /api/auth/register | INSERT users |
| 🔘 Login | /auth/login | POST /api/auth/login | SELECT users, INSERT sessions |
| 🔘 Add to Cart | /shop | POST /api/cart/add | INSERT product_reservations |
| 🔘 Checkout | /checkout | POST /api/checkout | INSERT orders, order_items |
| 🔘 Submit Sell Request | /sell | POST /api/sell-submissions | INSERT sell_submissions |
| 🔘 Accept Offer | /offers/[batch] | POST /api/offers/[batch]/respond | UPDATE sell_submissions |
| 🔘 Send Offer (Admin) | /admin/sell-requests | POST /api/admin/.../offer | UPDATE sell_submissions |
| 🔘 Add Product (Admin) | /admin/inventory | POST /api/admin/inventory | INSERT products |
| 🔘 Mark Paid (Admin) | /admin/orders | PUT /api/admin/orders/[id] | UPDATE orders |

---

## 📌 SUMMARY

**Total Tables:** 11 core tables
**Total Relationships:** 15+ foreign key relationships
**Key Workflows:** Buy, Sell, Admin Management, Analytics
**Obsolete Fields Removed:** 2 (estimated_value, total_offer)
**Latest Schema:** `/database/schema-unified.sql` (updated Oct 5, 2025)

