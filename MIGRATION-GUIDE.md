# 🔄 MIGRATION TO UNIFIED SYSTEM

**Goal**: Replace scattered JS files with unified `sbs-core.js`  
**Timeline**: Can be done page-by-page (backwards compatible)  
**Status**: Optional but recommended

---

## 📋 WHAT TO MIGRATE

### Current System (Scattered)
```
/public/js/
├── app.js          → Auth, navigation, cart basics
├── checkout.js     → Checkout flow
├── helper.js       → Help system
└── taxonomy.js     → Categories/sizes (KEEP THIS)
```

### New System (Unified)
```
/public/js/
├── sbs-core.js     → Everything except taxonomy
└── taxonomy.js     → Categories/sizes (unchanged)
```

---

## 🚀 QUICK START

### Option 1: Add Alongside (Recommended)

**Keep old system** + **add new system** for testing:

```html
<!-- shop.html - OLD SYSTEM -->
<script src="/js/helper.js" defer></script>
<script src="/js/checkout.js" defer></script>
<script src="/js/app.js"></script>

<!-- ADD NEW SYSTEM (doesn't conflict) -->
<script src="/js/sbs-core.js"></script>
```

**Both work together!** Old functions still work, new `SBS.*` available.

### Option 2: Replace Completely

```html
<!-- BEFORE -->
<script src="/js/helper.js" defer></script>
<script src="/js/checkout.js" defer></script>
<script src="/js/app.js"></script>

<!-- AFTER -->
<script src="/js/sbs-core.js"></script>
<script src="/js/taxonomy.js" type="module"></script>
```

---

## 📄 PAGE-BY-PAGE GUIDE

### shop.html

#### Current Code:
```javascript
// Cart management (inline)
function addToCart(item) {
    const basket = JSON.parse(localStorage.getItem('sbs-basket')) || [];
    basket.push(item);
    localStorage.setItem('sbs-basket', JSON.stringify(basket));
    showToast('Added to cart');
    updateCartCount();
}

// Checkout (from checkout.js)
function checkout() {
    showCheckoutModal();
}
```

#### Migrated Code:
```javascript
// Cart management (unified)
function addToCart(item) {
    SBS.Cart.add(item);  // Handles storage, toast, count update
}

// Checkout (unified)
function checkout() {
    SBS.Checkout.start();
}
```

#### Helper Buttons:
```html
<!-- No change needed - auto-detected! -->
<button class="sbs-help-btn" data-help="shop-how-to-buy">?</button>
```

---

### sell.html

#### Current Code:
```javascript
// Helper initialization
document.addEventListener('DOMContentLoaded', () => {
    if (typeof HelperSystem !== 'undefined') {
        window.sbsHelper = new HelperSystem();
    }
});
```

#### Migrated Code:
```javascript
// Nothing needed! Helper auto-initializes
// Just keep the button:
<button class="sbs-help-btn" data-help="sell-how-to-sell">?</button>
```

---

### admin/inventory/index.html

#### Current Code:
```javascript
// Auth check
const user = JSON.parse(sessionStorage.getItem('sbs_user') || 'null');
if (!user || user.role !== 'admin') {
    window.location.href = '/login.html';
}

// API call
fetch('/api/products', {
    headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(data => {
    // Handle data
});
```

#### Migrated Code:
```javascript
// Auth check
SBS.Auth.requireAuth();
if (!SBS.Auth.isAdmin()) {
    window.location.href = '/admin/index.html';
}

// API call
const data = await SBS.API.get('/api/products');
// Handle data
```

---

### login.html / register.html

#### Current Code:
```javascript
// After successful login
sessionStorage.setItem('sbs_user', JSON.stringify(userData));
sessionStorage.setItem('sbs_csrf_token', token);
window.location.href = '/dashboard.html';
```

#### Migrated Code:
```javascript
// After successful login
SBS.Auth.login(userData, token);
window.location.href = '/dashboard.html';
```

---

## 🔧 FUNCTION MAPPING

### Authentication

| Old | New |
|-----|-----|
| `sessionStorage.getItem('sbs_user')` | `SBS.Auth.getCurrentUser()` |
| `!sessionStorage.getItem('sbs_user')` | `!SBS.Auth.isLoggedIn()` |
| `sessionStorage.clear()` | `SBS.Auth.logout()` |

### Cart/Basket

| Old | New |
|-----|-----|
| `JSON.parse(localStorage.getItem('sbs-basket'))` | `SBS.Cart.get()` |
| `localStorage.setItem('sbs-basket', JSON.stringify(basket))` | `SBS.Cart.set(basket)` |
| `basket.push(item); saveBasket()` | `SBS.Cart.add(item)` |
| `updateCartCount()` | `SBS.Cart.updateCount()` |

### API Calls

| Old | New |
|-----|-----|
| `fetch('/api/products').then(r => r.json())` | `await SBS.API.get('/api/products')` |
| `fetch('/api/orders', {method: 'POST', body: JSON.stringify(data)})` | `await SBS.API.post('/api/orders', data)` |

### UI

| Old | New |
|-----|-----|
| `showToast(message)` | `SBS.UI.showToast(message)` |
| `alert('Error')` | `SBS.UI.showToast('Error', 'error')` |

### Helper System

| Old | New |
|-----|-----|
| `window.sbsHelper.showHelp('topic')` | `SBS.Helper.show('topic')` |
| `new HelperSystem()` | Not needed - auto-init |

---

## ✅ MIGRATION CHECKLIST

### Phase 1: Add Core System
- [ ] Add `<script src="/js/sbs-core.js"></script>` to all pages
- [ ] Test that pages still work (backwards compatible)
- [ ] Verify console shows "🎯 SBS Core System Initialized"

### Phase 2: Update shop.html
- [ ] Replace cart functions with `SBS.Cart.*`
- [ ] Replace checkout call with `SBS.Checkout.start()`
- [ ] Test add to cart, view cart, checkout flow

### Phase 3: Update sell.html
- [ ] Remove old helper initialization
- [ ] Test help buttons work
- [ ] Add sell submission integration (TODO)

### Phase 4: Update Admin Pages
- [ ] Replace auth checks with `SBS.Auth.*`
- [ ] Replace fetch calls with `SBS.API.*`
- [ ] Test admin access control

### Phase 5: Update Auth Pages
- [ ] Update login to use `SBS.Auth.login()`
- [ ] Update logout to use `SBS.Auth.logout()`
- [ ] Test login/logout flow

### Phase 6: Cleanup (Optional)
- [ ] Remove old script tags
- [ ] Delete unused JS files (backup first!)
- [ ] Test everything still works

---

## 🎯 TESTING STRATEGY

### 1. Parallel Testing
Keep both systems running, test new system gradually:

```html
<!-- Load both systems -->
<script src="/js/app.js"></script>
<script src="/js/sbs-core.js"></script>

<script>
// Test new system
console.log('Old cart:', JSON.parse(localStorage.getItem('sbs-basket')));
console.log('New cart:', SBS.Cart.get());
// Should match!
</script>
```

### 2. Feature-by-Feature
Migrate one feature at a time:
1. ✅ Auth checks → `SBS.Auth.*`
2. ✅ Cart operations → `SBS.Cart.*`
3. ✅ API calls → `SBS.API.*`
4. ✅ Checkout → `SBS.Checkout.*`
5. ✅ Helper → `SBS.Helper.*`

### 3. Rollback Plan
If issues arise:
```bash
git checkout HEAD~1 public/js/
npx wrangler pages deploy public
```

---

## 🔍 DEBUGGING

### Check Core Loaded
```javascript
console.log(window.SBS);  // Should show object with modules
```

### Check Cart Data
```javascript
console.log('Cart items:', SBS.Cart.get());
console.log('Cart count:', SBS.Cart.getCount());
console.log('Cart total:', SBS.Cart.getTotal());
```

### Check Auth
```javascript
console.log('Logged in:', SBS.Auth.isLoggedIn());
console.log('User:', SBS.Auth.getCurrentUser());
console.log('Is admin:', SBS.Auth.isAdmin());
```

### Check Storage
```javascript
console.log('All SBS data:', SBS.Storage);
```

---

## ⚡ PERFORMANCE NOTES

### Bundle Size Comparison

**Before** (scattered):
- app.js: ~8KB
- checkout.js: ~7KB
- helper.js: ~12KB
- **Total: ~27KB** (3 HTTP requests)

**After** (unified):
- sbs-core.js: ~25KB
- **Total: ~25KB** (1 HTTP request)

**Result**: ✅ Smaller bundle + fewer requests = faster load!

### Caching
```
/js/sbs-core.js → Cache forever (immutable)
Update version in script tag when needed:
<script src="/js/sbs-core.js?v=3.0"></script>
```

---

## 💡 BEST PRACTICES

### 1. Don't Mix Old + New for Same Feature
```javascript
// ❌ BAD - Mixing old and new cart
const oldCart = JSON.parse(localStorage.getItem('sbs-basket'));
SBS.Cart.add(item);  // Out of sync!

// ✅ GOOD - Use one or the other
SBS.Cart.add(item);
const cart = SBS.Cart.get();
```

### 2. Use Async/Await
```javascript
// ❌ BAD - Promise chains
SBS.API.get('/api/products')
    .then(data => {
        // ...
    })
    .catch(err => {
        // ...
    });

// ✅ GOOD - Async/await
try {
    const data = await SBS.API.get('/api/products');
    // ...
} catch (err) {
    SBS.UI.showToast(err.message, 'error');
}
```

### 3. Consistent Error Handling
```javascript
// ✅ Standardized error display
try {
    await SBS.API.post('/api/orders', data);
    SBS.UI.showToast('Order created!', 'success');
} catch (error) {
    SBS.UI.showToast(error.message, 'error');
}
```

---

## 🎉 MIGRATION COMPLETE!

Once migrated, your codebase will be:
- ✅ **More maintainable** - Single source of truth
- ✅ **More consistent** - Unified patterns
- ✅ **More performant** - Fewer requests
- ✅ **More testable** - Isolated modules
- ✅ **More scalable** - Easy to extend

**Questions?** Check `UNIFIED-SYSTEM-DOCS.md` for full reference.
