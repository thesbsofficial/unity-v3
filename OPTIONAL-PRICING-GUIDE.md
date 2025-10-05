# 💰 OPTIONAL PRICING SYSTEM - HOW TO USE

**Status:** ✅ DEPLOYED  
**Database:** Price column added  
**Frontend:** Prices hidden when not set

---

## 🎯 HOW IT WORKS

### Products WITHOUT Prices:
```
┌─────────────────────┐
│  [Product Image]    │
│                     │
│  BN-CLOTHES         │
│  SIZE M             │
│  (no price pill)    │
│                     │
│  [Add to Basket]    │ ← Works! (Checkout = "Pay at Collection")
└─────────────────────┘
```

### Products WITH Prices:
```
┌─────────────────────┐
│  [Product Image]    │
│                     │
│  BN-CLOTHES         │
│  SIZE M             │
│  €45.99             │ ← Price pill shown
│                     │
│  [Add to Basket]    │ ← Works! (Checkout shows total)
└─────────────────────┘
```

---

## ✅ CART BEHAVIOR

### Mixed Cart (Some priced, some not):
```
🛒 Your Cart
─────────────────────
Nike Air Max        €89.99
Adidas Track Top    Pay at collection
Jordan 1 High       €120.00
─────────────────────
Subtotal:          €209.99 + items at collection
```

### All Items Without Prices:
```
🛒 Your Cart
─────────────────────
Nike Air Max        Pay at collection
Adidas Track Top    Pay at collection
Jordan 1 High       Pay at collection
─────────────────────
Total:             Pay at collection

💰 Pay at Collection: Final prices will be confirmed when you collect your items. Continue to reserve now!
```

---

## 🔧 HOW TO ADD PRICES

### Option 1: Using SQL (Quick Bulk Update)

```sql
-- Add price to a specific product
UPDATE products 
SET price = 45.99 
WHERE id = 'your-product-id';

-- Add price to multiple products by category
UPDATE products 
SET price = 89.99 
WHERE category = 'BN-SHOES' AND size = 'UK 9';

-- Set original_price for sale items
UPDATE products 
SET price = 79.99, original_price = 99.99 
WHERE id = 'product-id';
```

**Run these commands:**
```powershell
npx wrangler d1 execute unity-v3 --remote --command "UPDATE products SET price = 45.99 WHERE id = 'xxx';"
```

---

### Option 2: Using Inventory Tool (Coming Soon)

Your inventory management tool can be updated to include a price field:

```html
<label>Price (Optional)</label>
<input type="number" 
       name="price" 
       step="0.01" 
       placeholder="Leave blank for 'Pay at Collection'">
```

---

## 📊 PRICING STRATEGIES

### Strategy 1: **No Prices** (Current Default)
- All products show "Pay at Collection"
- Customers reserve items
- You confirm prices at pickup
- **Best for:** Variable pricing, negotiation model

### Strategy 2: **Some Prices**
- Set prices for brand new items
- Leave pre-owned items unpriced
- Mix of instant checkout + reservations
- **Best for:** Hybrid business model

### Strategy 3: **All Prices**
- Full e-commerce experience
- Instant checkout with totals
- No manual confirmation needed
- **Best for:** Scaling, automation

---

## 🎯 EXAMPLES

### Set Price for One Product:
```powershell
npx wrangler d1 execute unity-v3 --remote --command "UPDATE products SET price = 89.99 WHERE image_id = 'abc123';"
```

### Set Prices for All Nike Products:
```powershell
npx wrangler d1 execute unity-v3 --remote --command "UPDATE products SET price = 95.00 WHERE category LIKE '%Nike%';"
```

### Clear Prices (Back to "Pay at Collection"):
```powershell
npx wrangler d1 execute unity-v3 --remote --command "UPDATE products SET price = NULL WHERE id = 'xxx';"
```

### Check Which Products Have Prices:
```powershell
npx wrangler d1 execute unity-v3 --remote --command "SELECT id, category, size, price FROM products WHERE status='available' ORDER BY price DESC NULLS LAST LIMIT 20;"
```

---

## ✅ WHAT'S DEPLOYED

### Database Changes:
- ✅ `price` column added (REAL, nullable)
- ✅ `original_price` column added (for sales)
- ✅ Index on price for fast queries

### Frontend Changes:
- ✅ Price pill only shows if price > 0
- ✅ "Add to Basket" works for all products (priced or not)
- ✅ Cart shows "Pay at collection" for unpriced items
- ✅ Cart shows total for priced items
- ✅ Checkout works for all combinations

### Cart System:
- ✅ Calculates subtotal for priced items
- ✅ Shows "Pay at collection" notice for unpriced items
- ✅ Allows checkout regardless of pricing status

---

## 🚀 TEST IT NOW

**Live URL:** https://127939c2.unity-v3.pages.dev/shop  
(Will propagate to thesbsofficial.com in 5-10 minutes)

**Test Cases:**
1. ✅ Add product without price → Should work, show "Pay at collection"
2. ✅ Add product with price → Should work, show €XX.XX
3. ✅ Mix both in cart → Should show subtotal + "items at collection" notice
4. ✅ Complete checkout → Should create reservation

---

## 💡 RECOMMENDED WORKFLOW

1. **Start:** Leave all prices empty (current state)
2. **Test:** Add items to cart, complete checkout - works with "Pay at Collection"
3. **Add Prices:** Update individual products when ready
4. **Monitor:** See which products sell better with/without prices
5. **Scale:** Gradually add more prices as you standardize

---

**Your pricing system is now FULLY FLEXIBLE!** 🎉

Add prices when you want, leave them blank when you don't. The site adapts automatically.
