# SBS 8UNITY Tag & Vocabulary Registry

> **Purpose:** This document is the canonical source for every category, size, tag, and reserved keyword used across the SBS admin hub, upload pipeline, and public site. Update this file whenever a new term is added or retired.
>
> **Scope:** Live vocabulary as of 2025-09-27 pulled from `script.js`, dublin files, and published build plans.

---

## 1. Inventory Categories (Admin & Public)

| Code | Human Label | Notes |
| --- | --- | --- |
| `BN-CLOTHES` | Brand New • Clothes | Upload form → Category select |
| `BN-SHOES`   | Brand New • Shoes   | Upload form → Category select |
| `PO-CLOTHES` | Pre-Owned • Clothes | Upload form → Category select |
| `PO-SHOES`   | Pre-Owned • Shoes   | Upload form → Category select |

These codes double as Cloudflare metadata, upload filename markers, and public site `data-category` attributes (mapped to `brand-new-clothes`, `brand-new-shoes`, etc.).

---

## 2. Size Vocabulary

### 2.1 Clothing (Brand New)
```
XS, S, M, L, XL
```

### 2.2 Clothing (Pre-Owned) — Includes mix-and-match sets
```
XS, S, M, L, XL,
XS-TOP-S-BOTTOM,
S-TOP-XS-BOTTOM,
S-TOP-M-BOTTOM,
M-TOP-S-BOTTOM,
M-TOP-L-BOTTOM,
L-TOP-M-BOTTOM,
L-TOP-XL-BOTTOM,
XL-TOP-L-BOTTOM
```
> **Rule:** Only allow ±1 size difference between top and bottom pieces. Keep hyphenated format exactly as shown for filename generation (`SIZE-<value>` markers).

### 2.3 Footwear (BN + PO)
```
UK-6, UK-6-5,
UK-7, UK-7-5,
UK-8, UK-8-5,
UK-9, UK-9-5,
UK-10, UK-10-5,
UK-11, UK-11-5,
UK-12
```
> Half sizes use `-5` suffix (e.g., `UK-9-5` for UK 9.5). Maintain the `UK-` prefix for consistency with file naming and tag filtering.

---

## 3. Section & Status Tags (Admin Filters)

| Tag | Meaning | Where Used |
| --- | --- | --- |
| `FEATURED`   | Spotlight items      | Grid badges, quick filters, upload preset |
| `SALE`       | Discounted items     | Grid badges, quick filters, upload preset |
| `NEW`        | Recent arrivals      | Grid badges, quick filters |
| `TRENDING`   | High-demand items    | Grid badges |
| `STAFF-PICKS`| Curated selections   | Grid badges |
| `LIVE`       | Available on site    | Included by default in upload workflow |
| `DROP`       | Limited release      | Special collections |
| `EXCLUSIVE`  | VIP/Member only      | Restricted access items |
| `LIMITED`    | Low stock / scarce   | Hidden "Additional Tag" preset |
| `BESTSELLER` | Top-selling products | Hidden "Additional Tag" preset |
| `PREMIUM`    | High-end items       | Hidden "Additional Tag" preset |
| `CLEARANCE`  | Final sale stock     | Hidden "Additional Tag" preset |
| `NEW UPLOAD` | Temp marker post-upload | UI badge only (added manually if desired) |
| `TEST UPLOAD`| Explicit test assets | UI badge only |
| `DELETED`    | Legacy deletion marker (now disabled) | Appears only on historical data |

> **Current Active Tags in Dublin System:** `LIVE`, `FEATURED`, `NEW`, `TRENDING`, `DROP`, `EXCLUSIVE`

### Status Field (In-Memory Today)
```
available, reserved, sold, archived, new
```
> Persist these values once the unified data core lands. They power the status counter in the admin header.

---

## 4. System / Automation Markers

| Marker | Pattern | Description |
| --- | --- | --- |
| Batch ID | `BATCH-B<MMDDHHMM>` | Assigned at upload session start; used in filenames (`BATCH-B09251430`). |
| Item Sequence | `ITEM-<###>` | Zero-padded per batch (`ITEM-001`). |
| Filename Markers | `DESC-`, `CAT-`, `SIZE-`, `DATE-`, `TIME-`, `BATCH-`, `ITEM-` | Present in every generated filename. |

Keep these markers reserved; do not use them as free-form tags.

---

## 5. Dublin Implementation Examples

### Current Dublin Item Structure:
```javascript
{
    name: 'Temple Bar Bomber Jacket',
    description: 'Premium bomber inspired by Dublin\'s cultural quarter...',
    price: '149',
    category: 'BN-CLOTHES',
    tags: ['LIVE', 'new'],
    image: 'https://cloudflare-url-here'
}
```

### Tag Color Coding (Dublin System):
```javascript
const tagColors = {
    'FEATURED': '#D4AF37',  // Gold
    'NEW': '#00ff41',       // Green
    'TRENDING': '#a78bfa',  // Purple
    'SALE': '#f87171'       // Red
};
```

---

## 6. Planned / Documented Presets (Not Yet Enforced)

Source: `SBS-ADMIN-HUB-BUILD-PLAN.md`

- **Style / Department:** `men`, `women`, `unisex`
- **Product Type:** `tracksuit`, `hoodie`, `tee`, `denim`, `jacket`, `sneaker`, `sandal`, `boot`, `accessory`
- **Colour Tags:** `black`, `white`, `grey`, `navy`, `red`, `blue`, `green`, `beige`
- **Section Tags:** `featured`, `sale`, `new`, `view-all`

> When Phase 3 "Constants wired" begins, convert these into enforced dropdowns and update this registry accordingly.

---

## 7. Public Site Alignment

- Catalogue accordions expect categories:
  - `brand-new-clothes`
  - `brand-new-shoes`
  - `pre-owned-clothes`
  - `pre-owned-shoes`
- Size buttons use the same size vocabulary defined above.
- Plan: drive public listings from `/api/items?tags=FEATURED` etc. to keep site auto-synced.

---

## 8. Maintenance Rules

1. **When adding a new tag/size/category:**
   - Update the upload form presets.
   - Update this file.
   - Add validation rule (once Phase 2 is complete).
2. **When deprecating a term:**
   - Remove it from presets.
   - Note the last date used here and plan a cleanup job.
3. **Review cadence:** Revisit this registry at the end of every major release or monthly if tags change frequently.

---

## 9. Current Implementation Status

✅ **Categories consistently implemented:** `BN-CLOTHES`, `BN-SHOES` across all Dublin files  
✅ **Tags consistently implemented:** `FEATURED`, `NEW`, `TRENDING`, `LIVE`, `DROP`, `EXCLUSIVE`  
✅ **Color coding standardized** across Dublin UI components  
🔄 **PO-CLOTHES and PO-SHOES** ready for implementation when needed  
📋 **Size vocabulary** defined but not yet enforced in Dublin system  

---

_Last updated: 2025-09-27_  
_Status: UNIFIED ROOT DIRECTORY - All Dublin files aligned_