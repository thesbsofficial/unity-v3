# 🧪 QUICK TEST GUIDE - Dual Buttons + Offers

## ✅ Quick Tests (5 minutes)

### 1. Test Dual Buttons Work
```
1. Go to: https://thesbsofficial.com/shop
2. Look at any product card
3. Should see TWO buttons side-by-side:
   - Left: "Add to Basket" or "Reserve"
   - Right: "💰 Offer" (green button)
4. Click "Add to Basket" → Item added to cart ✅
5. Click "💰 Offer" → Modal opens ✅
```

### 2. Test Offer Submission
```
1. Click "💰 Offer" on any product
2. Fill in:
   - Name: "Test Customer"
   - Contact: "test@email.com"
   - Offer: "45.00"
3. Click "Submit Offer"
4. Should see success message ✅
5. Modal closes ✅
```

### 3. Test Highest Offer Display
```
1. Submit 2-3 offers on same product (use different amounts)
2. Refresh the shop page
3. Product should now show animated badge:
   "🔥 2 Offers: €50.00" (or whatever your highest was)
4. Badge should pulse/animate ✅
```

---

## 🔍 Verify in Database

After testing, check if offers were saved:

```bash
npx wrangler d1 execute unity-v3 --remote --command "SELECT offer_id, product_id, offer_amount, customer_name, created_at FROM customer_offers ORDER BY created_at DESC LIMIT 5;"
```

**Should see:**
- Your test offers
- Correct amounts
- Customer names
- Recent timestamps

---

## 🎯 What to Look For

### ✅ Good Signs
- Both buttons visible on ALL products
- "💰 Offer" button is green
- Clicking buttons works (no errors in console)
- Offer modal opens with product info
- After submitting, success message appears
- Highest offer badge shows on products with offers
- Badge is animated (pulse effect)
- Badge shows correct count and amount

### ⚠️ Warning Signs
- Only ONE button showing
- Buttons overlapping or misaligned
- Clicking does nothing
- Console errors (press F12)
- No highest offer badge after submitting
- Badge shows wrong amount

---

## 🐛 If Something's Wrong

### Buttons Not Showing
1. Hard refresh: `Ctrl + Shift + R` (PC) or `Cmd + Shift + R` (Mac)
2. Clear cache
3. Wait 5-10 minutes for deployment to propagate

### Offer Not Saving
1. Check browser console (F12) for errors
2. Verify API endpoint: https://thesbsofficial.com/api/offers/submit
3. Check database: See command above

### No Highest Offer Badge
1. Submit at least 1 offer
2. Refresh page (offers loaded on page load)
3. Check API: https://thesbsofficial.com/api/offers/highest
4. Should return JSON with offers data

---

## 💻 Test Commands

### See All Offers
```bash
npx wrangler d1 execute unity-v3 --remote --command "SELECT * FROM customer_offers ORDER BY created_at DESC;"
```

### See Highest Offers by Product
```bash
npx wrangler d1 execute unity-v3 --remote --command "SELECT product_id, MAX(offer_amount) as highest, COUNT(*) as count FROM customer_offers WHERE status='pending' GROUP BY product_id;"
```

### Delete Test Offers (if needed)
```bash
npx wrangler d1 execute unity-v3 --remote --command "DELETE FROM customer_offers WHERE customer_name='Test Customer';"
```

---

## 📱 Mobile Testing

Don't forget to test on mobile:
1. Open https://thesbsofficial.com/shop on your phone
2. Both buttons should still be visible
3. Should be side-by-side (not stacked)
4. Easy to tap both buttons
5. Modal should work on mobile

---

## ✅ Success Criteria

**System is working if:**
- ✅ Every product shows 2 buttons (except reserved)
- ✅ "Add to Basket" adds to cart
- ✅ "💰 Offer" opens modal
- ✅ Offer submission saves to database
- ✅ Products with offers show animated badge
- ✅ Badge displays correct highest amount
- ✅ Badge shows offer count
- ✅ Works on both desktop and mobile

---

## 🎉 Expected Results

### Visual Example

**Product WITHOUT offers:**
```
┌─────────────────────────────┐
│      [Product Image]        │
│ BN-CLOTHES | SIZE M         │
│ 📸 Check Photo              │
│ [Add to Basket] [💰 Offer] │
└─────────────────────────────┘
```

**Product WITH 3 offers (highest €45):**
```
┌─────────────────────────────┐
│      [Product Image]        │
│ PO-SHOES | SIZE UK 9        │
│ €40.00                      │
│ 🔥 3 Offers: €45.00 ⟨pulse⟩│
│ [Add to Basket] [💰 Offer] │
└─────────────────────────────┘
```

---

**Quick Start:** Just visit your shop and look for the dual buttons! 🚀
