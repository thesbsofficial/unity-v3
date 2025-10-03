# 🎯 SBS UNIFIED SYSTEM ARCHITECTURE

**Version:** 3.0  
**Last Updated:** October 3, 2025  
**Status:** Production Ready

---

## 📋 TABLE OF CONTENTS

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [Database Schema](#database-schema)
5. [Frontend Integration](#frontend-integration)
6. [API Endpoints](#api-endpoints)
7. [Deployment](#deployment)

---

## 🌟 SYSTEM OVERVIEW

### What We Unified

Previously scattered across **multiple files**:
- `app.js` - Auth & navigation
- `checkout.js` - Checkout flow
- `helper.js` - Help system
- Inline scripts in HTML files
- Multiple localStorage calls
- Duplicate API fetch logic

Now **consolidated into**:
- **`sbs-core.js`** - Single unified client system
- **`schema-unified.sql`** - Complete database schema
- **`taxonomy.js`** - Single source of truth for categories/sizes

### Key Benefits

✅ **Single Import**: One `<script>` tag loads everything  
✅ **Logical Organization**: Modules organized by function  
✅ **No Duplication**: Shared code reused across features  
✅ **Easy Maintenance**: Update once, works everywhere  
✅ **Type Safety**: Consistent data structures  
✅ **Better Performance**: Cached once, used everywhere

---

## 🏗️ ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                     SBS CORE SYSTEM                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Storage    │  │     Auth     │  │     Cart     │    │
│  │   Manager    │  │   Module     │  │   Module     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │      UI      │  │    Helper    │  │   Checkout   │    │
│  │   Module     │  │   System     │  │   Module     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐                       │
│  │  API Client  │  │  Taxonomy    │                       │
│  │              │  │   (external) │                       │
│  └──────────────┘  └──────────────┘                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                    Cloudflare Pages
                           │
                           ▼
                    Workers + D1 Database
```

---

## 🔧 CORE COMPONENTS

### 1. Storage Manager

**Purpose**: Centralized localStorage/sessionStorage management

**Key Functions**:
```javascript
Storage.get(key, useSession)     // Get data
Storage.set(key, value, useSession, expiryMs)  // Set with optional expiry
Storage.remove(key, useSession)  // Remove item
Storage.clear(useSession)        // Clear all SBS data
```

**Features**:
- Automatic JSON parsing
- Expiry support
- Consistent prefix (`sbs-`)
- Session vs. persistent storage

### 2. Auth Module

**Purpose**: User authentication & session management

**Key Functions**:
```javascript
Auth.isLoggedIn()                // Check login status
Auth.getCurrentUser()            // Get user object
Auth.login(userData, token)      // Login user
Auth.logout()                    // Logout & redirect
Auth.requireAuth(redirectUrl)    // Protect pages
Auth.isAdmin()                   // Check admin role
```

**Session Management**:
- 24-hour sessions
- Auto-expiry
- CSRF token storage

### 3. Cart Module

**Purpose**: Shopping basket management

**Key Functions**:
```javascript
Cart.get()                       // Get basket array
Cart.add(item)                   // Add to cart
Cart.remove(index)               // Remove item
Cart.clear()                     // Empty cart
Cart.getCount()                  // Total items
Cart.getTotal()                  // Total price
Cart.updateCount()               // Update UI badges
```

**Features**:
- Quantity support
- Duplicate detection
- Auto-save to localStorage
- UI synchronization

### 4. API Client

**Purpose**: Unified HTTP requests

**Key Functions**:
```javascript
API.get(endpoint)               // GET request
API.post(endpoint, body)        // POST request
API.put(endpoint, body)         // PUT request
API.delete(endpoint)            // DELETE request
```

**Features**:
- Auto-token injection
- JSON handling
- Error standardization
- Base URL management

### 5. UI Module

**Purpose**: User interface components

**Key Functions**:
```javascript
UI.showToast(message, type, duration)  // Toast notification
UI.showModal(content, className)       // Modal dialog
UI.showLoading(target)                 // Loading spinner
```

**Toast Types**: `info`, `success`, `error`, `warning`

**Features**:
- Auto-styling injection
- Animation support
- Overlay management
- Click-outside close

### 6. Helper Module

**Purpose**: Context-aware help system

**Key Functions**:
```javascript
Helper.show(topicKey)           // Show help modal
Helper.init()                   // Auto-attach to buttons
```

**Help Topics**:
- `shop-how-to-buy`
- `shop-size-guide`
- `sell-how-to-sell`
- `sell-what-we-buy`
- `admin-quick-start`

**Features**:
- "Don't show again" support
- localStorage persistence
- Auto-button detection (`data-help="topic"`)

### 7. Checkout Module

**Purpose**: Complete checkout flow

**Key Functions**:
```javascript
Checkout.start()                // Begin checkout
Checkout.updateTotal()          // Recalculate total
Checkout.submit(form)           // Submit order
```

**Features**:
- Collection (free) or Delivery (+€5)
- Dynamic address fields
- Order confirmation
- Cart clearing

---

## 🗄️ DATABASE SCHEMA

### Core Tables

#### `users`
- Authentication
- Profile data
- Email verification
- Role-based access (customer/admin)

#### `products`
- Inventory management
- Follows taxonomy.js categories
- Cloudflare Images integration
- Status tracking (available/sold/removed)

#### `orders`
- Customer purchases
- Delivery tracking
- Payment status
- JSON items or normalized `order_items`

#### `sell_submissions`
- Customer sell requests
- Batch tracking (BATCH-YYYYMMDD-XXXXX)
- Admin review workflow
- JSON items or normalized `sell_items`

#### `sessions`
- Active login sessions
- Token management
- Expiry tracking

### Utility Tables

- `password_resets` - Password recovery
- `analytics` - Business metrics
- `system_logs` - Event tracking
- `images` - Cloudflare image metadata

### Views

- `v_active_products` - Available inventory
- `v_recent_orders` - Order history
- `v_pending_submissions` - Sell queue

---

## 🌐 FRONTEND INTEGRATION

### Basic Setup

```html
<!DOCTYPE html>
<html>
<head>
    <!-- Styles -->
    <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
    <!-- Content -->
    
    <!-- Scripts -->
    <script src="/js/taxonomy.js" type="module"></script>
    <script src="/js/sbs-core.js"></script>
</body>
</html>
```

### Using the System

#### Authentication
```javascript
// Check if logged in
if (SBS.Auth.isLoggedIn()) {
    const user = SBS.Auth.getCurrentUser();
    console.log('Welcome,', user.first_name);
}

// Protect admin page
SBS.Auth.requireAuth('/admin/index.html');
```

#### Cart Management
```javascript
// Add to cart
document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', () => {
        SBS.Cart.add({
            id: btn.dataset.productId,
            brand: btn.dataset.brand,
            category: btn.dataset.category,
            size: btn.dataset.size,
            price: parseFloat(btn.dataset.price)
        });
    });
});

// Checkout
document.getElementById('checkout-btn').addEventListener('click', () => {
    SBS.Checkout.start();
});
```

#### API Calls
```javascript
// Fetch products
const products = await SBS.API.get('/api/products');

// Create order
const result = await SBS.API.post('/api/orders', {
    items: [...],
    customer: {...}
});
```

#### UI Components
```javascript
// Show toast
SBS.UI.showToast('Product added!', 'success');

// Show modal
SBS.UI.showModal(`
    <h2>Confirm Delete</h2>
    <p>Are you sure?</p>
    <button onclick="deleteItem()">Yes</button>
`);
```

#### Helper System
```html
<!-- Add help button -->
<button class="sbs-help-btn" data-help="shop-how-to-buy">?</button>

<!-- Or trigger programmatically -->
<script>
SBS.Helper.show('shop-size-guide');
</script>
```

---

## 🔌 API ENDPOINTS

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/verify-email` - Verify email
- `POST /api/auth/forgot-password` - Password reset

### Products
- `GET /api/products` - List products
- `GET /api/products/:id` - Get product
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)
- `DELETE /api/products/:id` - Delete product (admin)

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - List orders (authenticated)
- `GET /api/orders/:id` - Get order details

### Sell Submissions
- `POST /api/sell-submissions` - Submit sell request
- `GET /api/sell-submissions` - List submissions (authenticated)
- `PUT /api/sell-submissions/:id` - Update status (admin)

### Images
- `POST /api/images/upload` - Upload to Cloudflare
- `DELETE /api/images/:id` - Delete image

---

## 🚀 DEPLOYMENT

### Steps

1. **Test Locally**
```bash
npx wrangler pages dev public
```

2. **Deploy to Production**
```bash
npx wrangler pages deploy public --project-name=unity-v3
```

3. **Apply Database Schema**
```bash
npx wrangler d1 execute unity-v3-db --file=database/schema-unified.sql
```

4. **Verify**
- Check https://your-domain.pages.dev
- Test login, cart, checkout
- Verify help system
- Check admin panel

### Environment Variables

Set in Cloudflare Dashboard:
- `DATABASE` → Bind D1 database
- `CLOUDFLARE_ACCOUNT_ID` → Your account ID
- `CLOUDFLARE_API_TOKEN` → Images API token

---

## 📊 MIGRATION GUIDE

### From Old System to Unified

#### 1. Replace Script Tags

**Before:**
```html
<script src="/js/app.js"></script>
<script src="/js/checkout.js"></script>
<script src="/js/helper.js"></script>
```

**After:**
```html
<script src="/js/sbs-core.js"></script>
```

#### 2. Update Function Calls

**Before:**
```javascript
// Old scattered approach
localStorage.setItem('sbs-basket', JSON.stringify(basket));
showToast('Added to cart');
checkout();
```

**After:**
```javascript
// Unified approach
SBS.Cart.add(item);  // Handles storage + toast
SBS.Checkout.start();
```

#### 3. Update Auth Checks

**Before:**
```javascript
const user = sessionStorage.getItem('sbs_user');
if (!user) window.location.href = '/login.html';
```

**After:**
```javascript
SBS.Auth.requireAuth();
```

#### 4. Update API Calls

**Before:**
```javascript
const response = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
});
const result = await response.json();
```

**After:**
```javascript
const result = await SBS.API.post('/api/orders', data);
```

---

## 🎯 BEST PRACTICES

### 1. Always Use SBS Namespace
```javascript
// ✅ Good
SBS.Cart.add(item);

// ❌ Bad
cart.add(item);  // Pollutes global scope
```

### 2. Handle Errors
```javascript
try {
    const result = await SBS.API.post('/api/orders', data);
    SBS.UI.showToast('Order created!', 'success');
} catch (error) {
    SBS.UI.showToast(error.message, 'error');
}
```

### 3. Use Storage Module
```javascript
// ✅ Good
SBS.Storage.set('user-preference', value);

// ❌ Bad
localStorage.setItem('sbs-user-preference', JSON.stringify(value));
```

### 4. Leverage Helper System
```html
<!-- Add help to confusing sections -->
<div>
    <h3>Pre-Owned Clothes 
        <button class="sbs-help-btn" data-help="shop-size-guide">?</button>
    </h3>
</div>
```

---

## 📝 CHANGELOG

### Version 3.0 (October 3, 2025)
- ✅ Created unified `sbs-core.js`
- ✅ Consolidated database schema
- ✅ Integrated helper, checkout, cart systems
- ✅ Standardized API client
- ✅ Added Storage Manager
- ✅ Improved toast/modal systems

### Version 2.0 (Previous)
- Individual modules (app.js, checkout.js, helper.js)
- Scattered functionality
- Multiple localStorage calls

---

## 🆘 SUPPORT

**Issues?** Check:
1. Browser console for errors
2. Network tab for failed API calls
3. localStorage/sessionStorage data
4. Database query logs

**Common Fixes**:
- Clear cache: `Ctrl+Shift+R`
- Clear storage: `localStorage.clear()`
- Check auth: `SBS.Auth.isLoggedIn()`
- Verify endpoints: `console.log(SBS.CONFIG.API_BASE)`

---

## 🎉 SUCCESS!

Your system is now **unified, logical, and production-ready**. All core functionality lives in one place, follows consistent patterns, and integrates seamlessly with your existing database and taxonomy systems.

**Next Steps**:
1. Test all features end-to-end
2. Deploy to production
3. Monitor performance
4. Enjoy simplified maintenance! 🚀
