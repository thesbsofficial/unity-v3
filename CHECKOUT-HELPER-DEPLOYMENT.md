# 🎯 CHECKOUT & HELPER DEPLOYMENT GUIDE

**Date:** October 3, 2025  
**Status:** 📦 READY TO DEPLOY

---

## ✅ COMPLETED

### 1. Helper System ✅
- **`/public/js/helper.js`** - Complete helper system with 15+ topics
- **`/public/css/helper.css`** - Helper button styles
- **`HELPER-SYSTEM-GUIDE.md`** - Complete usage documentation

### Features:
- Context-aware help tooltips
- "Don't show again" functionality (localStorage)
- Mobile-friendly
- Keyboard shortcuts (Escape to close)
- Beautiful modal design

---

## 📋 NEXT STEPS

### Step 1: Add Helper System to Shop.html

Add to `<head>` section (around line 13):
```html
<!-- Helper System -->
<link rel="stylesheet" href="/css/helper.css">
<script src="/js/helper.js" defer></script>
```

Add helper buttons to hero section (around line 650):
```html
<!-- HERO SECTION -->
<section class="hero" style="position: relative;">
    <button class="sbs-help-btn" data-help="shop-how-to-buy">?</button>
    <h1>SBS SHOP</h1>
    <p>Premium streetwear collection. Brand new clothes and shoes with authentic style.</p>
</section>
```

### Step 2: Add Helper System to Sell.html

Add to `<head>` section:
```html
<!-- Helper System -->
<link rel="stylesheet" href="/css/helper.css">
<parameter name="script" src="/js/helper.js" defer></script>
```

Add helper buttons to form sections:
```html
<div class="container" style="position: relative;">
    <button class="sbs-help-btn" data-help="sell-how-to-sell">?</button>
    <!-- form content -->
</div>
```

### Step 3: Build Checkout Modal

Create `/public/js/checkout.js`:

```javascript
// Checkout function
function checkout() {
    const basket = JSON.parse(localStorage.getItem('sbs-basket')) || [];
    
    if (basket.length === 0) {
        alert('Your basket is empty!');
        return;
    }
    
    // Show checkout modal
    showCheckoutModal(basket);
}

function showCheckoutModal(items) {
    // Create modal HTML
    const modal = document.createElement('div');
    modal.id = 'checkout-modal';
    modal.innerHTML = `
        <div class="checkout-overlay">
            <div class="checkout-content">
                <h2>🛒 Checkout</h2>
                <button onclick="closeCheckout()">×</button>
                
                <div class="checkout-items">
                    <h3>Your Items (${items.length})</h3>
                    ${items.map(item => `
                        <div class="checkout-item">
                            <img src="${item.imageUrl}" alt="${item.category}">
                            <div>
                                <strong>${item.category}</strong>
                                <p>Size: ${item.size}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <form id="checkout-form">
                    <h3>Delivery Details</h3>
                    <input type="text" name="name" placeholder="Full Name *" required>
                    <input type="tel" name="phone" placeholder="Phone Number *" required>
                    <input type="text" name="address" placeholder="Address *" required>
                    <input type="text" name="city" placeholder="City *" required>
                    <input type="text" name="eircode" placeholder="Eircode (optional)">
                    
                    <h3>Delivery Method</h3>
                    <label>
                        <input type="radio" name="delivery" value="collection" checked>
                        Collection (Free)
                    </label>
                    <label>
                        <input type="radio" name="delivery" value="delivery">
                        Delivery (+€5)
                    </label>
                    
                    <div class="checkout-total">
                        <strong>Total:</strong> <span id="checkout-total">€0</span>
                    </div>
                    
                    <button type="submit" class="btn-primary">Confirm Order</button>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Update total on delivery method change
    document.querySelectorAll('input[name="delivery"]').forEach(radio => {
        radio.addEventListener('change', updateTotal);
    });
    
    updateTotal();
    
    // Handle form submission
    document.getElementById('checkout-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitOrder(new FormData(e.target), items);
    });
}

function updateTotal() {
    const deliveryMethod = document.querySelector('input[name="delivery"]:checked').value;
    const deliveryFee = deliveryMethod === 'delivery' ? 5 : 0;
    document.getElementById('checkout-total').textContent = `€${deliveryFee}`;
}

async function submitOrder(formData, items) {
    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: items.map(item => ({
                    product_id: item.id,
                    category: item.category,
                    size: item.size
                })),
                customer_name: formData.get('name'),
                phone: formData.get('phone'),
                delivery_address: formData.get('address'),
                delivery_city: formData.get('city'),
                delivery_eircode: formData.get('eircode'),
                delivery_method: formData.get('delivery'),
                total_amount: formData.get('delivery') === 'delivery' ? 5 : 0
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Clear basket
            localStorage.removeItem('sbs-basket');
            
            // Show confirmation
            alert(`Order confirmed! Order number: ${data.order.order_number}\n\nWe'll contact you on WhatsApp soon!`);
            
            // Close modal and refresh
            closeCheckout();
            location.reload();
        } else {
            alert('Order failed. Please try again or contact us directly.');
        }
    } catch (error) {
        console.error('Checkout error:', error);
        alert('Something went wrong. Please contact us via WhatsApp.');
    }
}

function closeCheckout() {
    const modal = document.getElementById('checkout-modal');
    if (modal) modal.remove();
}
```

### Step 4: Add Checkout Styles to shop.html

Add to `<style>` section:
```css
/* Checkout Modal */
.checkout-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.checkout-content {
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 12px;
    max-width: 500px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    padding: 24px;
    position: relative;
}

.checkout-content h2 {
    margin-bottom: 20px;
}

.checkout-content button[onclick="closeCheckout()"] {
    position: absolute;
    top: 16px;
    right: 16px;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: #fff;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    font-size: 24px;
    cursor: pointer;
}

.checkout-items {
    margin-bottom: 24px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
}

.checkout-item {
    display: flex;
    gap: 12px;
    margin: 12px 0;
    align-items: center;
}

.checkout-item img {
    width: 60px;
    height: 80px;
    object-fit: cover;
    border-radius: 4px;
}

#checkout-form input[type="text"],
#checkout-form input[type="tel"] {
    width: 100%;
    padding: 12px;
    margin-bottom: 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid #333;
    border-radius: 6px;
    color: #fff;
    font-size: 14px;
}

#checkout-form label {
    display: block;
    margin: 12px 0;
    color: #ccc;
}

.checkout-total {
    margin: 20px 0;
    padding: 16px;
    background: rgba(212, 175, 55, 0.1);
    border-radius: 6px;
    font-size: 18px;
}

.btn-primary {
    width: 100%;
    padding: 14px;
    background: #d4af37;
    color: #000;
    border: none;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
}
```

---

## 🚀 DEPLOYMENT

```bash
cd "c:\Users\fredb\Desktop\unity-v3\public (4)"

# Stage all files
git add public/js/helper.js public/css/helper.css public/js/checkout.js

# Commit
git commit -m "ADD HELPER SYSTEM + CHECKOUT FLOW: Context help on all pages + complete checkout"

# Deploy
npx wrangler pages deploy --project-name=unity-v3 --branch=MAIN .
```

---

## 📊 WHAT'S LEFT

### Sell Form Submission (Next Priority)
1. Create `/functions/api/sell-submissions.js` endpoint
2. Add form submission handler to sell.html
3. Create `sell_submissions` table in database
4. Add admin review interface

### Admin Features
1. Build `/admin/requests/` page for reviewing sell submissions
2. Add email notifications (customer + admin)
3. Integrate with analytics system

---

**Helper System: ✅ COMPLETE**  
**Checkout Flow: 📝 Code ready, needs integration**  
**Sell Submission: 📋 Planned, ready to build**

Let me know which to prioritize next!
