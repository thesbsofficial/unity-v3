# 🎨 SBS SYSTEM ARCHITECTURE - VISUAL GUIDE

---

## 🌐 COMPLETE SYSTEM MAP

```
┌───────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE LAYER                           │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐│
│  │  shop    │  │   sell   │  │  admin   │  │dashboard │  │  auth   ││
│  │ .html    │  │  .html   │  │  pages   │  │  .html   │  │ pages   ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └─────────┘│
│                                                                        │
└────────────────────────────┬──────────────────────────────────────────┘
                             │
                             │ Imports
                             │
┌────────────────────────────▼──────────────────────────────────────────┐
│                      CLIENT-SIDE LIBRARIES                             │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                    SBS CORE SYSTEM                               │ │
│  │                    (sbs-core.js)                                 │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │                                                                  │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │ │
│  │  │ Storage  │  │   Auth   │  │   Cart   │  │    API   │       │ │
│  │  │ Manager  │  │  Module  │  │  Module  │  │  Client  │       │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │ │
│  │                                                                  │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │ │
│  │  │    UI    │  │  Helper  │  │ Checkout │                      │ │
│  │  │  Module  │  │  System  │  │  Module  │                      │ │
│  │  └──────────┘  └──────────┘  └──────────┘                      │ │
│  │                                                                  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                    TAXONOMY SYSTEM                               │ │
│  │                    (taxonomy.js)                                 │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │  Categories: BN-CLOTHES, BN-SHOES, PO-CLOTHES, PO-SHOES        │ │
│  │  Sizes: XS-XL (clothes), UK-6 to UK-12 (shoes)                 │ │
│  │  Size Labels: Human-readable dropdown options                   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                        │
└────────────────────────────┬──────────────────────────────────────────┘
                             │
                             │ HTTP Requests
                             │
┌────────────────────────────▼──────────────────────────────────────────┐
│                      CLOUDFLARE WORKERS                                │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  /api/auth/*           → Authentication endpoints                     │
│  /api/products/*       → Product management                           │
│  /api/orders/*         → Order processing                             │
│  /api/sell-submissions → Sell request handling                        │
│  /api/images/*         → Cloudflare Images integration                │
│                                                                        │
└────────────────────────────┬──────────────────────────────────────────┘
                             │
                             │ SQL Queries
                             │
┌────────────────────────────▼──────────────────────────────────────────┐
│                      D1 DATABASE                                       │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │    users     │  │   products   │  │    orders    │                │
│  │              │  │              │  │              │                │
│  │ - id         │  │ - id         │  │ - id         │                │
│  │ - email      │  │ - category   │  │ - user_id    │                │
│  │ - role       │  │ - size       │  │ - items_json │                │
│  │ - password   │  │ - brand      │  │ - status     │                │
│  └──────────────┘  └──────────────┘  └──────────────┘                │
│                                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │sell_submiss. │  │   sessions   │  │   analytics  │                │
│  │              │  │              │  │              │                │
│  │ - batch_id   │  │ - user_id    │  │ - metric     │                │
│  │ - items_json │  │ - token      │  │ - value      │                │
│  │ - status     │  │ - expires_at │  │ - period     │                │
│  └──────────────┘  └──────────────┘  └──────────────┘                │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 DATA FLOW DIAGRAMS

### 1. SHOP & CHECKOUT FLOW

```
┌─────────────┐
│   User on   │
│  shop.html  │
└──────┬──────┘
       │
       │ 1. Clicks "Add to Cart"
       ▼
┌─────────────────────────────┐
│   SBS.Cart.add(item)        │
│   ├─ Save to localStorage   │
│   ├─ Show toast             │
│   └─ Update cart badge      │
└──────┬──────────────────────┘
       │
       │ 2. Clicks "Checkout"
       ▼
┌─────────────────────────────┐
│   SBS.Checkout.start()      │
│   ├─ Get basket             │
│   ├─ Show checkout modal    │
│   └─ Render form            │
└──────┬──────────────────────┘
       │
       │ 3. Fills form & submits
       ▼
┌─────────────────────────────┐
│   SBS.API.post(             │
│     '/api/orders',          │
│     orderData               │
│   )                         │
└──────┬──────────────────────┘
       │
       │ 4. API request
       ▼
┌─────────────────────────────┐
│   Cloudflare Worker         │
│   ├─ Validate data          │
│   ├─ Generate order number  │
│   └─ Insert to D1           │
└──────┬──────────────────────┘
       │
       │ 5. Database write
       ▼
┌─────────────────────────────┐
│   D1 Database               │
│   INSERT INTO orders (...)  │
└──────┬──────────────────────┘
       │
       │ 6. Success response
       ▼
┌─────────────────────────────┐
│   SBS.Cart.clear()          │
│   Show confirmation modal   │
└─────────────────────────────┘
```

---

### 2. AUTHENTICATION FLOW

```
┌─────────────┐
│   User on   │
│ login.html  │
└──────┬──────┘
       │
       │ 1. Enters email/password
       ▼
┌─────────────────────────────┐
│   Form submit               │
│   POST to /api/auth/login   │
└──────┬──────────────────────┘
       │
       │ 2. API validates
       ▼
┌─────────────────────────────┐
│   Cloudflare Worker         │
│   ├─ Check password hash    │
│   ├─ Generate token         │
│   ├─ Create session         │
│   └─ Return user + token    │
└──────┬──────────────────────┘
       │
       │ 3. Success response
       ▼
┌─────────────────────────────┐
│   SBS.Auth.login(           │
│     userData,               │
│     token                   │
│   )                         │
│   ├─ Save to sessionStorage │
│   └─ Set expiry             │
└──────┬──────────────────────┘
       │
       │ 4. Redirect
       ▼
┌─────────────────────────────┐
│   dashboard.html            │
│   ├─ Check SBS.Auth.isLoggedIn()
│   └─ Load user data         │
└─────────────────────────────┘

Later visits:
┌─────────────┐
│   Any page  │
└──────┬──────┘
       │
       │ Check auth
       ▼
┌─────────────────────────────┐
│   SBS.Auth.isLoggedIn()     │
│   ├─ Check sessionStorage   │
│   ├─ Check expiry           │
│   └─ Return true/false      │
└─────────────────────────────┘
```

---

### 3. HELPER SYSTEM FLOW

```
┌─────────────┐
│   User on   │
│   any page  │
└──────┬──────┘
       │
       │ Clicks ? button
       ▼
┌─────────────────────────────┐
│   <button data-help=        │
│     "shop-how-to-buy">      │
└──────┬──────────────────────┘
       │
       │ Auto-detected by Helper
       ▼
┌─────────────────────────────┐
│   SBS.Helper.show(          │
│     'shop-how-to-buy'       │
│   )                         │
│   ├─ Check localStorage     │
│   │   (don't show again?)   │
│   ├─ Get content            │
│   └─ Show modal             │
└──────┬──────────────────────┘
       │
       │ Modal displayed
       ▼
┌─────────────────────────────┐
│   SBS.UI.showModal(content) │
│   ├─ Create overlay         │
│   ├─ Create content div     │
│   ├─ Add close button       │
│   └─ Append to body         │
└──────┬──────────────────────┘
       │
       │ User closes
       ▼
┌─────────────────────────────┐
│   Check "don't show again"  │
│   if checked:               │
│   SBS.Storage.set(          │
│     'helper-hide-topic',    │
│     true                    │
│   )                         │
└─────────────────────────────┘
```

---

## 🗂️ MODULE RELATIONSHIPS

```
┌───────────────────────────────────────────────────────────┐
│                        SBS CORE                           │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  Storage Manager ◄─────────────────┐                     │
│       ▲                             │                     │
│       │ uses                        │ uses                │
│       │                             │                     │
│  ┌────┴────┐  ┌────────┐  ┌────────┴───┐                │
│  │  Auth   │  │  Cart  │  │   Helper   │                │
│  │ Module  │  │ Module │  │   System   │                │
│  └────┬────┘  └───┬────┘  └────────────┘                │
│       │           │                                       │
│       │ uses      │ uses                                  │
│       │           │                                       │
│       ▼           ▼                                       │
│  ┌────────────────────────┐                              │
│  │     API Client         │◄──────── Checkout Module     │
│  │                        │          (uses API)           │
│  └────────┬───────────────┘                              │
│           │                                               │
│           │ uses                                          │
│           ▼                                               │
│  ┌───────────────────────┐                               │
│  │     UI Module         │◄──────── All Modules          │
│  │  (Toast, Modal, etc)  │          (use UI)             │
│  └───────────────────────┘                               │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### Dependencies

```
Storage Manager  → (none - base layer)
Auth Module      → Storage Manager
Cart Module      → Storage Manager, UI Module
API Client       → Auth Module (for tokens)
UI Module        → (none - utility layer)
Helper Module    → Storage Manager, UI Module
Checkout Module  → Cart Module, API Client, UI Module
```

---

## 📊 DATABASE RELATIONSHIPS

```
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE SCHEMA                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐                                               │
│  │  users   │◄────┐                                         │
│  └────┬─────┘     │                                         │
│       │           │                                         │
│       │ 1:N       │ 1:N                                     │
│       ▼           │                                         │
│  ┌──────────┐    │                                         │
│  │ sessions │    │                                         │
│  └──────────┘    │                                         │
│                  │                                         │
│       ┌──────────┴──────────┐                              │
│       │                     │                              │
│       ▼                     ▼                              │
│  ┌──────────┐         ┌──────────────┐                    │
│  │  orders  │         │sell_submiss. │                    │
│  └────┬─────┘         └──────────────┘                    │
│       │                                                    │
│       │ 1:N (optional)                                     │
│       ▼                                                    │
│  ┌──────────────┐                                         │
│  │ order_items  │                                         │
│  └──────┬───────┘                                         │
│         │                                                  │
│         │ N:1 (optional)                                   │
│         ▼                                                  │
│  ┌──────────┐                                             │
│  │ products │                                             │
│  └────┬─────┘                                             │
│       │                                                    │
│       │ 1:N                                                │
│       ▼                                                    │
│  ┌──────────┐                                             │
│  │  images  │                                             │
│  └──────────┘                                             │
│                                                            │
└────────────────────────────────────────────────────────────┘

Key:
1:N = One-to-many relationship
N:1 = Many-to-one relationship
◄── = Foreign key reference
```

---

## 🎯 REQUEST LIFECYCLE

### Complete Request from User to Database

```
1. USER ACTION
   │
   ├─ Click "Add to Cart"
   │
   ▼
2. CLIENT-SIDE JAVASCRIPT
   │
   ├─ SBS.Cart.add(item)
   │  ├─ Get current basket from localStorage
   │  ├─ Add new item
   │  ├─ Save to localStorage
   │  ├─ Call SBS.UI.showToast()
   │  └─ Call Cart.updateCount()
   │
   ▼
3. LATER: USER CLICKS CHECKOUT
   │
   ├─ SBS.Checkout.start()
   │  ├─ Get basket from Cart.get()
   │  ├─ Create checkout modal
   │  └─ Wait for form submission
   │
   ▼
4. FORM SUBMITTED
   │
   ├─ SBS.API.post('/api/orders', data)
   │  ├─ Prepare headers (Auth token)
   │  ├─ JSON.stringify(data)
   │  └─ fetch() call
   │
   ▼
5. NETWORK REQUEST
   │
   ├─ HTTPS to Cloudflare
   │
   ▼
6. CLOUDFLARE WORKER
   │
   ├─ /functions/api/orders.js
   │  ├─ Parse request body
   │  ├─ Validate data
   │  ├─ Generate order number
   │  ├─ Check authentication (if needed)
   │  └─ Prepare SQL query
   │
   ▼
7. DATABASE QUERY
   │
   ├─ INSERT INTO orders (...)
   │  ├─ Store in D1 database
   │  └─ Return order ID
   │
   ▼
8. WORKER RESPONSE
   │
   ├─ Format JSON response
   │  {
   │    success: true,
   │    order: {
   │      id: 123,
   │      order_number: 'ORD-20251003-001'
   │    }
   │  }
   │
   ▼
9. CLIENT RECEIVES RESPONSE
   │
   ├─ SBS.API.post() returns data
   │  ├─ SBS.Cart.clear()
   │  ├─ SBS.UI.showModal(confirmation)
   │  └─ setTimeout(() => location.reload(), 3000)
   │
   ▼
10. USER SEES CONFIRMATION
    │
    └─ "Order Confirmed! #ORD-20251003-001"
```

---

## 🎨 UI COMPONENT HIERARCHY

```
┌─────────────────────────────────────────────────────────────┐
│                         PAGE BODY                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Page Content                          │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │    │
│  │  │  Header  │  │   Main   │  │  Footer  │        │    │
│  │  └──────────┘  └──────────┘  └──────────┘        │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │            Helper Buttons (data-help="...")        │    │
│  │                    ?                               │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Modal Overlay (when shown)            │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │         Modal Content                        │  │    │
│  │  │  ┌─────────────────────────────────┐  [×]   │  │    │
│  │  │  │                                 │        │  │    │
│  │  │  │  Helper Content                │        │  │    │
│  │  │  │    or                          │        │  │    │
│  │  │  │  Checkout Form                 │        │  │    │
│  │  │  │    or                          │        │  │    │
│  │  │  │  Order Confirmation            │        │  │    │
│  │  │  │                                 │        │  │    │
│  │  │  └─────────────────────────────────┘        │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Toast Notification                     │    │
│  │         (bottom right corner)                       │    │
│  │  ┌──────────────────────────────────────────┐      │    │
│  │  │  ℹ️ Added to cart                        │      │    │
│  │  └──────────────────────────────────────────┘      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 SECURITY FLOW

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. CLIENT-SIDE                                             │
│     ┌─────────────────────────────────────────────┐        │
│     │  SBS.Auth.requireAuth()                     │        │
│     │  ├─ Check sessionStorage                    │        │
│     │  ├─ Check token expiry                      │        │
│     │  └─ Redirect if invalid                     │        │
│     └─────────────────────────────────────────────┘        │
│                                                              │
│  2. API REQUESTS                                            │
│     ┌─────────────────────────────────────────────┐        │
│     │  SBS.API.request()                          │        │
│     │  ├─ Add X-CSRF-Token header                 │        │
│     │  ├─ Add Authorization header                │        │
│     │  └─ HTTPS only                              │        │
│     └─────────────────────────────────────────────┘        │
│                                                              │
│  3. CLOUDFLARE WORKER                                       │
│     ┌─────────────────────────────────────────────┐        │
│     │  API Endpoint Handler                       │        │
│     │  ├─ Validate token                          │        │
│     │  ├─ Check session expiry                    │        │
│     │  ├─ Verify role (admin endpoints)           │        │
│     │  └─ Rate limiting                            │        │
│     └─────────────────────────────────────────────┘        │
│                                                              │
│  4. DATABASE                                                │
│     ┌─────────────────────────────────────────────┐        │
│     │  D1 Security                                │        │
│     │  ├─ Parameterized queries                   │        │
│     │  ├─ Foreign key constraints                 │        │
│     │  └─ Check constraints                       │        │
│     └─────────────────────────────────────────────┘        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📈 PERFORMANCE OPTIMIZATION

```
┌─────────────────────────────────────────────────────────────┐
│                  OPTIMIZATION LAYERS                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. BROWSER CACHING                                         │
│     ┌─────────────────────────────────────────────┐        │
│     │  sbs-core.js → Cache-Control: max-age=...  │        │
│     │  taxonomy.js → Immutable                    │        │
│     │  CSS files → Long-term cache               │        │
│     └─────────────────────────────────────────────┘        │
│                                                              │
│  2. LOCAL STORAGE                                           │
│     ┌─────────────────────────────────────────────┐        │
│     │  SBS.Storage with expiry                    │        │
│     │  ├─ Cart persists                           │        │
│     │  ├─ Auth session cached                     │        │
│     │  └─ Helper preferences saved                │        │
│     └─────────────────────────────────────────────┘        │
│                                                              │
│  3. CLOUDFLARE CDN                                          │
│     ┌─────────────────────────────────────────────┐        │
│     │  Edge caching for static assets             │        │
│     │  ├─ HTML, CSS, JS                           │        │
│     │  └─ Images from Cloudflare Images           │        │
│     └─────────────────────────────────────────────┘        │
│                                                              │
│  4. DATABASE INDEXES                                        │
│     ┌─────────────────────────────────────────────┐        │
│     │  Fast queries with indexes on:              │        │
│     │  ├─ users.email                             │        │
│     │  ├─ products.category                       │        │
│     │  ├─ orders.status                           │        │
│     │  └─ sessions.token                          │        │
│     └─────────────────────────────────────────────┘        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

**🎉 Architecture documentation complete!**

This visual guide complements the technical docs and shows how all pieces fit together.
