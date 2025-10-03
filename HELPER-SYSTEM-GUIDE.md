# 🆘 HELPER SYSTEM - USAGE GUIDE

**Created:** October 3, 2025  
**Status:** ✅ READY TO USE

---

## 📦 What's Included

### Files Created:
1. **`/public/js/helper.js`** - Main helper system JavaScript
2. **`/public/css/helper.css`** - Helper button styles
3. **This guide** - How to use it

---

## 🚀 How to Add Helpers to Any Page

### Step 1: Include the Files

Add to your HTML `<head>`:

```html
<link rel="stylesheet" href="/css/helper.css">
<script src="/js/helper.js" defer></script>
```

### Step 2: Add Helper Buttons

Add anywhere in your HTML (usually top-right of sections):

```html
<!-- Example: Shop page -->
<section class="hero help-section">
    <button class="sbs-help-btn" data-help="shop-how-to-buy">?</button>
    <h1>Shop</h1>
    <p>Browse our collection</p>
</section>
```

**Important:** Add `help-section` class to parent container for positioning, or use `position: relative` on the parent.

---

## 📚 Available Helper Topics

### Shop Page (`/shop.html`)
- `shop-how-to-buy` - Complete buying process
- `shop-size-guide` - Size chart and explanations
- `shop-condition` - BN vs PO condition labels
- `shop-contact` - Contact methods

### Sell Page (`/sell.html`)
- `sell-how-to-sell` - Selling process step-by-step
- `sell-what-we-buy` - Categories and brands accepted
- `sell-pricing-tips` - How to set realistic prices
- `sell-photo-tips` - Photo best practices
- `sell-payment` - Payment methods and timeline

### Admin Pages
- `admin-quick-start` - Admin dashboard overview
- `admin-inventory` - Inventory uploader guide
- `admin-analytics` - Analytics dashboard explained

### Customer Dashboard
- `dashboard-orders` - Order status meanings
- `dashboard-submissions` - Sell submission tracking

---

## 🎨 Button Placement Examples

### In Hero Section (Top-right)
```html
<section class="hero" style="position: relative;">
    <button class="sbs-help-btn" data-help="shop-how-to-buy">?</button>
    <h1>Welcome</h1>
</section>
```

### In Form Section
```html
<div class="form-container" style="position: relative;">
    <button class="sbs-help-btn" data-help="sell-how-to-sell">?</button>
    <form>...</form>
</div>
```

### In Admin Panel
```html
<div class="admin-section" style="position: relative;">
    <button class="sbs-help-btn" data-help="admin-inventory">?</button>
    <h2>Inventory</h2>
</div>
```

---

## ✨ Features

### Auto-Dismissal
Users can check "Don't show this again" and the helper won't appear again (stored in localStorage)

### Keyboard Shortcuts
- **Escape** - Close helper modal

### Mobile-Friendly
- Responsive design
- Touch-friendly buttons
- Optimized for small screens

### Accessibility
- Semantic HTML
- Keyboard navigation
- Clear focus states

---

## 🎯 Adding New Helper Topics

Edit `/public/js/helper.js` and add to the `helperContent` object:

```javascript
const helperContent = {
    // ... existing topics ...
    
    'your-new-topic': {
        title: '🎯 Your Title',
        content: `
            <h4>Subtitle</h4>
            <p>Your content here...</p>
            
            <ol class="help-list">
                <li>Step 1</li>
                <li>Step 2</li>
            </ol>
            
            <p class="help-note">💡 Helpful tip</p>
        `
    }
};
```

Then use it:

```html
<button class="sbs-help-btn" data-help="your-new-topic">?</button>
```

---

## 🧪 Testing Checklist

- [ ] Helper button appears in top-right corner
- [ ] Click opens modal with correct content
- [ ] Click backdrop closes modal
- [ ] Escape key closes modal
- [ ] "Don't show again" persists in localStorage
- [ ] Works on mobile (touch-friendly)
- [ ] Multiple helpers on same page work independently

---

## 📋 Pages to Add Helpers To

### High Priority
- [ ] `/shop.html` - How to buy, size guide, condition labels
- [ ] `/sell.html` - How to sell, what we buy, pricing tips
- [ ] `/admin/index.html` - Quick start guide
- [ ] `/admin/analytics.html` - Analytics explained

### Medium Priority
- [ ] `/admin/inventory/index.html` - Upload guide
- [ ] `/dashboard.html` - Orders and submissions
- [ ] `/admin/requests/` - Sell request review

### Low Priority
- [ ] Other admin pages
- [ ] Login/register pages (if needed)

---

## 💡 Best Practices

1. **Don't Overload** - Max 2-3 helpers per page
2. **Be Contextual** - Only show helpers relevant to current page
3. **Keep Content Brief** - Users want quick answers
4. **Use Visual Elements** - Emojis, lists, highlights
5. **Test on Mobile** - Most users are on phones

---

## 🚀 Quick Deploy

After adding helpers to pages:

```bash
cd "c:\Users\fredb\Desktop\unity-v3\public (4)"
git add public/js/helper.js public/css/helper.css
git commit -m "ADD HELPER SYSTEM: Context-aware help on all pages"
npx wrangler pages deploy --project-name=unity-v3 --branch=MAIN .
```

---

**Helper System Ready!** 🎉  
*Add `?` buttons to any page for instant context-aware help*
