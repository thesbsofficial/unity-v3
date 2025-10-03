# 📦 CLOUDFLARE IMAGES INVENTORY SYSTEM

**Last Updated:** October 3, 2025  
**System:** Cloudflare Images as Single Source of Truth

---

## 🎯 **HOW IT WORKS**

Your entire product inventory is managed **directly in Cloudflare Images Dashboard**. No database needed!

### The System:
1. **Upload images** to Cloudflare Images
2. **Add metadata** to each image in the CF Dashboard
3. **Products API** automatically reads the metadata
4. **Shop page** displays products based on CF Images metadata

---

## 📝 **METADATA FIELDS**

Edit these fields in **Cloudflare Images Dashboard → Click Image → Metadata**:

| Field | Description | Example | Required |
|-------|-------------|---------|----------|
| **name** | Product name | "Nike Air Max 90" | ✅ Yes |
| **price** | Price in euros or cents | "45.99" or "4599" | ✅ Yes |
| **category** | Product category | "BN-SHOES" | ✅ Yes |
| **brand** | Brand name | "Nike" | ⭐ Recommended |
| **size** | Size | "UK-9" or "M" | ⭐ Recommended |
| **condition** | Condition | "BN" or "PO" | Optional (auto from category) |
| **status** | Visibility | "active", "hidden", "sold" | Optional (default: active) |
| **sku** | SKU code | "SBS-B10031425-001" | Optional (auto-generated) |
| **stock** | Stock quantity | "1" | Optional (default: 1) |
| **featured** | Featured product | "true" or "false" | Optional |
| **description** | Full description | "Brand new Nike..." | Optional |

---

## 📋 **CATEGORY VALUES**

Must use **exactly** these values:

- **BN-CLOTHES** - Brand New Clothes
- **BN-SHOES** - Brand New Shoes  
- **PO-CLOTHES** - Pre-Owned Clothes
- **PO-SHOES** - Pre-Owned Shoes

### Size Auto-Assignment:
- **BN-CLOTHES / PO-CLOTHES** → XS, S, M, L, XL
- **BN-SHOES / PO-SHOES** → UK-6, UK-6-5, UK-7... UK-12

---

## 🚀 **HOW TO ADD A PRODUCT**

### Step 1: Upload Image
1. Go to **Cloudflare Dashboard** → **Images**
2. Click **"Upload Images"**
3. Select product photo(s)
4. Wait for upload to complete

### Step 2: Add Metadata
1. Click on the uploaded image
2. Click **"Metadata"** tab
3. Add fields:

```json
{
  "name": "Nike Air Max 90",
  "price": "89.99",
  "category": "BN-SHOES",
  "brand": "Nike",
  "size": "UK-9",
  "status": "active",
  "stock": "1"
}
```

4. Click **"Save"**

### Step 3: Verify
1. Wait 5-10 seconds for cache
2. Visit: https://thesbsofficial.com/api/products
3. Check if your product appears
4. Visit shop page to see it live!

---

## ✏️ **HOW TO EDIT A PRODUCT**

### Change Price:
1. Find image in CF Dashboard
2. Click image → Metadata
3. Edit `price` field: `"price": "79.99"`
4. Save
5. Refresh shop page after 5-10 seconds

### Mark as Sold:
1. Find image in CF Dashboard
2. Click image → Metadata
3. Edit `status` field: `"status": "sold"`
4. Save
5. Product will disappear from shop immediately

### Hide Product:
1. Edit metadata: `"status": "hidden"`
2. Product hidden but not deleted
3. Change back to `"active"` to re-list

---

## 🗑️ **HOW TO DELETE A PRODUCT**

### Soft Delete (Recommended):
1. Edit metadata: `"status": "sold"`
2. Product hidden from shop
3. Can restore by changing to `"active"`

### Hard Delete:
1. Go to CF Images Dashboard
2. Find image
3. Click delete button
4. Product permanently removed

---

## 📊 **STATUS VALUES**

| Status | Effect | Use Case |
|--------|--------|----------|
| **active** | Visible on shop | Normal listing |
| **hidden** | Hidden from shop | Temporary removal |
| **sold** | Hidden from shop | Marked as sold |

**Note:** Leave blank or omit for "active" (default)

---

## 💰 **PRICE FORMATS**

The API supports **two formats**:

### Format 1: Euros with decimals
```json
"price": "45.99"
```

### Format 2: Cents (integer)
```json
"price": "4599"
```

Both = €45.99

**Tip:** Use format 1 (with decimals) for clarity!

---

## 🏷️ **SKU AUTO-GENERATION**

If you don't set an SKU, one is auto-generated:

```
SBS-{first-8-chars-of-image-id}
```

Example: `SBS-e94b9282`

**To set custom SKU:**
```json
"sku": "SBS-NIKE-AM90-UK9"
```

---

## 📦 **STOCK MANAGEMENT**

### Set Stock Quantity:
```json
"stock": "5"
```

### Mark Out of Stock:
```json
"stock": "0"
```
OR
```json
"status": "sold"
```

---

## 🌟 **FEATURED PRODUCTS**

Mark products as featured for homepage:

```json
"featured": "true"
```

Featured products appear first on shop page.

---

## 🔍 **SEARCH & FILTERING**

Products are automatically filterable by:
- Category (BN-CLOTHES, BN-SHOES, etc.)
- Brand (if specified)
- Size (from category)
- Price range
- In Stock status

---

## 📱 **TESTING YOUR CHANGES**

### 1. Check API Response:
```
https://thesbsofficial.com/api/products
```

### 2. Check with Debug Mode:
```
https://thesbsofficial.com/api/products?debug=true
```

Shows raw metadata for troubleshooting

### 3. Check Shop Page:
```
https://thesbsofficial.com/shop.html
```

---

## ⚡ **QUICK EXAMPLES**

### Example 1: Brand New Nike Shoes
```json
{
  "name": "Nike Air Max 90",
  "price": "89.99",
  "category": "BN-SHOES",
  "brand": "Nike",
  "size": "UK-9",
  "status": "active",
  "stock": "1",
  "description": "Brand new Nike Air Max 90 in white/black colorway"
}
```

### Example 2: Pre-Owned Hoodie
```json
{
  "name": "Supreme Box Logo Hoodie",
  "price": "199.99",
  "category": "PO-CLOTHES",
  "brand": "Supreme",
  "size": "L",
  "status": "active",
  "stock": "1",
  "description": "Pre-owned Supreme hoodie in excellent condition"
}
```

### Example 3: Out of Stock Item
```json
{
  "name": "Jordan 1 High",
  "price": "149.99",
  "category": "BN-SHOES",
  "brand": "Jordan",
  "size": "UK-10",
  "status": "sold",
  "stock": "0"
}
```

---

## 🚨 **COMMON ISSUES**

### Product Not Showing Up?
1. ✅ Check `status` is "active" (or blank)
2. ✅ Check `stock` is not "0"
3. ✅ Wait 10 seconds for cache
4. ✅ Check category spelling exactly matches

### Wrong Price Showing?
1. ✅ Check price format: use "45.99" not "€45.99"
2. ✅ Remove currency symbols
3. ✅ Use dot (.) not comma (,) for decimals

### Wrong Sizes Showing?
1. ✅ Category determines available sizes
2. ✅ BN-CLOTHES = XS, S, M, L, XL
3. ✅ BN-SHOES = UK-6 through UK-12
4. ✅ Size field is for pre-selecting, not limiting

---

## 📈 **BULK OPERATIONS**

### Upload Multiple Products:
1. Upload all images at once to CF Dashboard
2. Click first image → Add metadata → Save
3. Click second image → Add metadata → Save
4. Repeat for all images

**Tip:** Keep a spreadsheet of metadata to copy-paste!

---

## 🔐 **SECURITY NOTES**

- ✅ Only CF Images Edit permission needed
- ✅ No database access required
- ✅ Metadata changes instant (5-10s cache)
- ✅ All changes logged in CF Dashboard

---

## 📚 **METADATA TEMPLATE**

Copy this template for each new product:

```json
{
  "name": "",
  "price": "",
  "category": "BN-CLOTHES",
  "brand": "",
  "size": "",
  "status": "active",
  "stock": "1",
  "featured": "false",
  "description": ""
}
```

---

## ✅ **CHECKLIST FOR NEW PRODUCTS**

- [ ] Image uploaded to Cloudflare Images
- [ ] `name` field set
- [ ] `price` field set
- [ ] `category` field set (exact spelling!)
- [ ] `brand` field set (optional but recommended)
- [ ] `size` field set (optional)
- [ ] `status` = "active" or blank
- [ ] `stock` > 0 or blank
- [ ] Verified on /api/products
- [ ] Verified on shop page

---

## 🎓 **PRO TIPS**

1. **Use consistent naming:** "Nike Air Max 90" not "nike air max"
2. **Always set brand:** Helps with search and filtering
3. **Use featured sparingly:** Only highlight best products
4. **Keep descriptions short:** 1-2 sentences max
5. **Update stock immediately:** Mark sold items right away
6. **Test before launch:** Check API response before going live

---

## 🔗 **USEFUL LINKS**

- **Cloudflare Images Dashboard:** https://dash.cloudflare.com/625959b904a63f24f6bb7ec9b8c1ed7c/images
- **Products API:** https://thesbsofficial.com/api/products
- **Debug API:** https://thesbsofficial.com/api/products?debug=true
- **Shop Page:** https://thesbsofficial.com/shop.html

---

**🎉 That's it! Your inventory is now managed 100% in Cloudflare Images!**
