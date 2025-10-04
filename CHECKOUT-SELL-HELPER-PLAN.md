# 🎯 CHECKOUT & SELL COMPLETION PLAN + HELPER SYSTEM

**Date:** October 3, 2025  
**Status:** 📋 PLANNING

---

## 🛒 PART 1: BASKET CHECKOUT FLOW

### Current State

✅ **Working:**

- Add to basket (localStorage)
- Remove from basket
- Cart display with item count
- Cart modal UI

❌ **Missing:**

- `checkout()` function implementation
- Order creation API integration
- Delivery details form
- Order confirmation flow
- Email notification to customer
- Admin notification

### Checkout Flow Design

```
1. User clicks "Proceed to Checkout" in cart
   ↓
2. Show delivery details modal
   - Full name
   - Phone number
   - Delivery address
   - City
   - Eircode (optional)
   - Delivery method: Collection (free) or Delivery (+€5)
   ↓
3. Validate all fields
   ↓
4. Calculate total: Items (free) + Delivery (€0 or €5)
   ↓
5. POST to /api/orders
   - Send basket items
   - Send delivery details
   - Send total amount
   ↓
6. API creates order in D1 database
   ↓
7. Show order confirmation
   - Order number (SBS-XXXXXXXX)
   - "We'll contact you on WhatsApp"
   - Expected collection/delivery time
   ↓
8. Clear basket
   ↓
9. Email notifications:
   - Customer: Order confirmation
   - Admin: New order alert
```

### Database Schema (Already Exists)

```sql
CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    order_number TEXT UNIQUE NOT NULL,
    items_json TEXT NOT NULL,
    total_amount REAL DEFAULT 0,
    delivery_address TEXT,
    delivery_city TEXT,
    delivery_method TEXT DEFAULT 'delivery',
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 📸 PART 2: SELL FORM SUBMISSION

### Current State

✅ **Working:**

- Multi-item builder
- Category/brand/condition/size selection
- Photo upload (optional, up to 5 per item)
- Contact details collection
- Form validation

❌ **Missing:**

- Form submission handler
- API endpoint to save submission
- Email notification system
- Admin review dashboard

### Sell Submission Flow

```
1. User fills Quick Builder form
   - Can add multiple items
   - Each item has: category, brand, condition, size, price, photos (optional)
   ↓
2. User clicks "Submit All Items"
   ↓
3. Validate all items
   ↓
4. Generate batch ID (BATCH-YYYYMMDD-XXXXX)
   ↓
5. POST to /api/sell-submissions
   - Send all items array
   - Send contact details (phone, social, email, address)
   - Send any uploaded photos
   ↓
6. API saves to D1 database
   ↓
7. Show confirmation
   - Batch ID
   - "We'll review and contact you on WhatsApp/Instagram"
   - Expected response time (24-48 hours)
   ↓
8. Email notifications:
   - Seller: Submission confirmation
   - Admin: New sell submission alert
   ↓
9. Admin reviews in /admin/requests/
```

### Database Schema (Needs Creation)

```sql
CREATE TABLE IF NOT EXISTS sell_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT UNIQUE NOT NULL,
    user_id INTEGER,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'accepted', 'rejected')),
    items_json TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    contact_channel TEXT NOT NULL,
    contact_handle TEXT NOT NULL,
    contact_email TEXT,
    address TEXT,
    city TEXT,
    eircode TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TEXT,
    reviewed_by INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
);
```

---

## ❓ PART 3: HELPER SYSTEM (Context-Aware Tips)

### Purpose

Add small `?` helper buttons that explain features without cluttering the UI

### Design Principles

1. **Unobtrusive** - Small ? icon in corner, doesn't distract
2. **Context-aware** - Only shows relevant info for that screen
3. **Dismissible** - Can close and won't show again (localStorage)
4. **Mobile-friendly** - Works perfectly on small screens

### Helper Locations

#### Shop Page (`/shop.html`)

```
? Helper Topics:
- "How to buy" - Add to basket → Checkout → Collection/Delivery
- "Size guide" - Explains size system (UK shoes, clothing sizes)
- "Condition labels" - BN = Brand New, PO = Pre-owned
- "Questions?" - Contact via WhatsApp/Instagram
```

#### Sell Page (`/sell.html`)

```
? Helper Topics:
- "How to sell" - Fill form → Submit → Get offer → Accept/Decline
- "What we buy" - Categories, conditions, brands we accept
- "Pricing tips" - How to set realistic prices
- "Photo tips" - How to take good photos (optional)
- "Payment methods" - Cash, bank transfer, RevolutTime
```

#### Admin Dashboard (`/admin/*`)

```
? Helper Topics:
- "Inventory tool" - How to upload, organize, manage stock
- "Analytics" - Understanding metrics and trends
- "Orders" - Processing, fulfillment, customer communication
- "Requests" - Reviewing sell submissions, making offers
```

#### Customer Dashboard (`/dashboard.html`)

```
? Helper Topics:
- "My orders" - Track status, contact about orders
- "My submissions" - Track sell requests, accept offers
- "Account settings" - Update details, preferences
```

### Helper Component Design

```html
<!-- Helper Button (Top-right corner of section) -->
<button class="help-btn" onclick="showHelp('shop-how-to-buy')">
  <span>?</span>
</button>

<!-- Helper Modal (Overlay) -->
<div class="help-modal" id="help-modal" style="display: none;">
  <div class="help-content">
    <button class="help-close" onclick="closeHelp()">×</button>
    <h3 class="help-title">📦 How to Buy</h3>
    <div class="help-body">
      <ol>
        <li><strong>Browse</strong> - Find items you love</li>
        <li><strong>Add to Basket</strong> - Click the basket button</li>
        <li><strong>Checkout</strong> - Enter delivery details</li>
        <li><strong>Collection/Delivery</strong> - Choose your option</li>
        <li><strong>We'll Contact You</strong> - Via WhatsApp to arrange</li>
      </ol>
      <p class="help-note">💡 All items are authentic and as described</p>
    </div>
    <label class="help-checkbox">
      <input type="checkbox" onchange="dontShowAgain('shop-how-to-buy')" />
      Don't show this again
    </label>
  </div>
</div>
```

### Helper Topics Content

#### Shop Helpers

1. **How to Buy**: Step-by-step buying process
2. **Size Guide**: UK shoe sizes, clothing size charts
3. **Condition Labels**: BN vs PO explained
4. **Contact Us**: WhatsApp, Instagram, email

#### Sell Helpers

1. **How to Sell**: Submit → Review → Offer → Accept
2. **What We Buy**: Categories, brands, conditions
3. **Pricing Tips**: Setting realistic expectations
4. **Photo Tips**: Best practices for item photos
5. **Payment Info**: How and when you get paid

#### Admin Helpers

1. **Quick Start**: First-time admin setup
2. **Inventory Upload**: Using the smart uploader
3. **Analytics**: Understanding the dashboard
4. **Order Processing**: Fulfillment workflow
5. **Sell Requests**: Reviewing and making offers

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Checkout Flow ✅

- [ ] Create checkout modal UI
- [ ] Add delivery details form
- [ ] Implement `checkout()` function
- [ ] Integrate with `/api/orders` endpoint
- [ ] Show order confirmation
- [ ] Clear basket after order
- [ ] Add email notifications
- [ ] Test full flow

### Phase 2: Sell Submission ✅

- [ ] Create `sell_submissions` table
- [ ] Create `/api/sell-submissions` endpoint
- [ ] Implement submission handler in sell.html
- [ ] Generate batch IDs
- [ ] Handle photo uploads
- [ ] Show submission confirmation
- [ ] Add email notifications
- [ ] Create admin review interface

### Phase 3: Helper System ✅

- [ ] Design helper component (CSS + HTML)
- [ ] Create helper content library
- [ ] Add helpers to shop.html
- [ ] Add helpers to sell.html
- [ ] Add helpers to admin pages
- [ ] Add helpers to dashboard
- [ ] Implement "don't show again" localStorage
- [ ] Test on mobile

---

## 🎨 VISUAL MOCKUPS

### Checkout Modal

```
╔═══════════════════════════════════╗
║  🛒 Checkout                      ║
║                                   ║
║  Your Items (3)                   ║
║  ┌─────────────────────────────┐ ║
║  │ 📦 Streetwear Hoodie (L)    │ ║
║  │ 📦 Nike Air Max (UK 9)      │ ║
║  │ 📦 Tech Gadget              │ ║
║  └─────────────────────────────┘ ║
║                                   ║
║  Delivery Details:                ║
║  ┌─────────────────────────────┐ ║
║  │ Name: [____________]        │ ║
║  │ Phone: [___________]        │ ║
║  │ Address: [__________]       │ ║
║  │ City: [____________]        │ ║
║  │ Eircode: [_________]        │ ║
║  └─────────────────────────────┘ ║
║                                   ║
║  Delivery Method:                 ║
║  ○ Collection (Free)              ║
║  ● Delivery (+€5)                 ║
║                                   ║
║  Total: €5.00                     ║
║                                   ║
║  [Confirm Order]                  ║
╚═══════════════════════════════════╝
```

### Helper Button (Top-right)

```
┌───────────────────────┐
│ Shop                ? │ ← Helper button
│                       │
│ [Products here...]    │
└───────────────────────┘
```

### Helper Modal

```
╔═══════════════════════════════════╗
║  ❓ How to Buy               × ║
║                                   ║
║  1. Browse - Find items you love  ║
║  2. Add to Basket - Click 🧺      ║
║  3. Checkout - Enter details      ║
║  4. We'll Contact You - WhatsApp  ║
║                                   ║
║  💡 All items are authentic       ║
║                                   ║
║  ☐ Don't show this again          ║
║                                   ║
║  [Got it!]                        ║
╚═══════════════════════════════════╝
```

---

## 🚀 DEPLOYMENT ORDER

1. **Database Migration** - Add sell_submissions table
2. **Sell Submission API** - Build /api/sell-submissions
3. **Sell Form Handler** - Complete submission logic
4. **Checkout Modal UI** - Build delivery details form
5. **Checkout Function** - Integrate with /api/orders
6. **Helper System** - Add helpers to all pages
7. **Email Notifications** - Customer + Admin alerts
8. **Admin Review Dashboard** - View/manage submissions
9. **Testing** - Full end-to-end testing
10. **Deploy to Production** - Push all changes

---

**Let's build it!** 🎉
