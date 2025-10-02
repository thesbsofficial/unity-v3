# Quick Sell Builder - Implementation

**Implemented:** October 1, 2025  
**Pattern:** Progressive Disclosure + Fixed Lists + Instant Estimation

---

## Overview

The Quick Sell Builder is a guided form that helps sellers create standardized, clean messages with:
- **Fixed dropdown lists** (no custom text = clean data)
- **Instant price estimates** based on condition
- **One-click copy + WhatsApp** functionality
- **Two-path system** (Quick Builder OR Manual Contact)

---

## User Flow

### 1. Eligibility Check
User clicks **"Yes, my item matches"** on eligibility gate

### 2. Two-Path Choice Screen
```
┌─────────────────────────────────────┐
│  Choose Your Selling Method:        │
│                                      │
│  ⚡ Quick Builder    ✍️ Manual       │
│  Guided form        WhatsApp/IG/SC  │
│  [Use Builder]      [Contact]       │
└─────────────────────────────────────┘
```

### 3A. Quick Builder Path (New!)
- **Step 1:** Category (Streetwear • Shoes • Tech • Jewellery)
- **Step 2:** Brand (dynamically populated dropdown)
- **Step 3:** Condition (5 radio buttons with descriptions)
- **Step 4:** Size (only if relevant to category)
- **Auto-display:** Price estimate range
- **Step 5:** Your asking price (€)
- **Step 6:** Location (Dublin area)
- **Step 7:** Photos ready checkbox
- **Step 8:** Notes (optional)
- **Generate** → Clean message + Copy/WhatsApp buttons

### 3B. Manual Contact Path (Existing)
- WhatsApp templates (single/multiple items)
- Instagram DM
- Snapchat
- Photo tips accordion

---

## Brand Lists (Fixed Dropdowns)

### Streetwear (9 brands)
- The North Face
- Monterrain
- Yelir
- Montirex
- Berghaus
- **Trailberg** ✨ (NEW)
- OnCloud
- Columbia
- Hugo Boss

**Helper:** "Tracksuits & jackets only — no tees or loose items"

### Shoes (3 brands - Radio buttons)
- Nike
- New Balance
- Asics

**Helper:** "Men's UK 8-11, popular models only"

### Tech (13+ items)
- iPhone
- Samsung Galaxy
- Google Pixel
- OnePlus
- PlayStation 5
- Xbox Series X
- Nintendo Switch
- NVIDIA GPU
- AMD GPU
- Samsung SSD
- LG Monitor
- Sony TV
- Other Tech Item

**Helper:** "Recent tech with decent resale value"  
**Note:** User can add their CEX research later to expand this list

### Jewellery (3 items - Radio buttons)
- Gold Jewellery
- Silver Jewellery
- Luxury Watch (Rolex etc.)

**Helper:** "Authentication required at jeweller/agreed store"

---

## Size Lists (Conditional Display)

### Streetwear Sizes
XS • S • M • L • XL • XXL

### Shoe Sizes
UK 8 • UK 8.5 • UK 9 • UK 9.5 • UK 10 • UK 10.5 • UK 11

### Tech & Jewellery
*Size field hidden (N/A)*

---

## Condition Scale + Price Estimates

### Brand New & Tagged
- **Description:** Unworn, tags on, original packaging
- **Typical offer:** €70-€130
- **Multiplier:** 100% of ceiling

### Like New
- **Description:** Worn 1-2x, no visible wear
- **Typical offer:** €40-€80
- **Multiplier:** 90% of ceiling

### Mint
- **Description:** Lightly worn, minimal signs, no defects
- **Typical offer:** €30-€50
- **Multiplier:** 80% of ceiling

### Decent
- **Description:** Noticeable wear/marks but fully usable
- **Typical offer:** €20-€40
- **Multiplier:** 60% of ceiling

### Poor
- **Description:** Heavy wear or issues (stains, scuffs, damage)
- **Typical offer:** €0 (can be negotiated on case-by-case basis)
- **Multiplier:** 0% (individual negotiation)

**Note:** These are baseline ranges. Actual offers vary per brand/style. Algorithm can be refined with more data.

---

## Generated Message Format

```
🔥 SELLING TO SBS

Category: {Category}
Brand: {Brand}
Condition: {Condition}
Size: {Size} (if applicable)

My price: €{Price}
Location: {Location}
Photos: ✓ Ready to send

Notes: {Optional notes/extras}

✅ Ready for same-day collection
```

**Output channels:**
1. **Copy to Clipboard** (blue button)
2. **Open WhatsApp** (gold button, prefilled)
3. Can also paste to Instagram/Snapchat manually

---

## Form Validation Rules

### Generate Button Enabled When:
- ✓ Category selected
- ✓ Brand selected
- ✓ Condition selected
- ✓ Size selected (if applicable to category)
- ✓ Price entered (number > 0)
- ✓ Location entered (text)
- ✓ Photos checkbox checked

### Progressive Disclosure:
1. Category → Shows Brand dropdown
2. Brand → Shows Condition radios
3. Condition → Shows Size (if needed), Price, Location, Photos, Notes
4. All required → Enables "Generate" button

---

## UI/UX Features

### Mobile-Optimized
- **Large touch targets:** All buttons ≥ 56px
- **Radio chips:** Visual, easy to tap
- **Sticky Generate button:** Always visible at bottom
- **Smooth scrolling:** To generated message

### Accessibility
- `aria-expanded` on accordions
- Proper label associations
- Focus states on all inputs
- Keyboard navigation support

### Visual Feedback
- Selected radios: Gold background
- Disabled button: 50% opacity
- Copy button: Green confirmation (2 seconds)
- Form groups: Progressive reveal

---

## JavaScript Data Structure

```javascript
const builderData = {
  brands: { 
    'Streetwear': [...],
    'Shoes': [...],
    'Tech': [...],
    'Jewellery': [...]
  },
  sizes: { 
    'Streetwear': [...],
    'Shoes': [...],
    'Tech': [],
    'Jewellery': []
  },
  priceRanges: {
    'Brand New & Tagged': { min: 70, max: 130 },
    'Like New': { min: 40, max: 80 },
    'Mint': { min: 30, max: 50 },
    'Decent': { min: 20, max: 40 },
    'Poor': { min: 0, max: 0 }
  },
  brandHelpers: {
    'Streetwear': 'Tracksuits & jackets only — no tees or loose items',
    'Shoes': 'Men\'s UK 8-11, popular models only',
    'Tech': 'Recent tech with decent resale value',
    'Jewellery': 'Authentication required at jeweller/agreed store'
  }
};
```

---

## Analytics Events (Ready)

### Path Selection
- `builder_selected` - User chose Quick Builder
- `manual_contact_selected` - User chose Manual Contact

### Form Completion
- `message_generated` - Form completed, message created
  - Property: `category` (which category was selected)

### Actions
- `message_copied` - User clicked Copy button
- `whatsapp_opened` - User clicked Open WhatsApp (via link tracking)

---

## Future Enhancements

### 1. CEX Tech Research Integration
Current tech list is placeholder. User will:
- Research CEX popular items
- Add most-traded smartphones, consoles, PC parts
- Update `builderData.brands.Tech` array

### 2. Photo Upload (Future)
Currently: Checkbox "I have photos ready"  
Future: Direct upload → stored with intake JSON → POST to `/api/sell/intakes`

### 3. Refined Price Algorithm
Current: Fixed ranges per condition  
Future: 
- Brand-specific ceiling prices `{Brand: {ceiling: 150}}`
- Condition multiplier × ceiling = accurate range
- Learns from accepted offers over time

### 4. Dashboard Integration
Ready but not connected:
```javascript
// POST /api/sell/intakes
{
  category, brand, condition, size,
  price, location, photos_count, notes,
  timestamp, source: 'sell-builder'
}
```

### 5. A/B Testing
- Test button copy: "Quick Builder" vs "Guided Form"
- Test price estimate visibility: Always show vs "Show estimate" toggle
- Test condition descriptions: Short vs detailed

---

## Benefits vs. Manual Templates

### ✅ Quick Builder Benefits
1. **Standardized data** - Easy to parse/filter
2. **Faster for sellers** - No typing brand/condition descriptions
3. **Price expectations set** - Estimate shown before contact
4. **Cleaner dashboard** - Structured JSON vs free text
5. **Fewer errors** - Dropdowns prevent typos

### ✅ Manual Template Benefits
1. **Flexibility** - For unusual items not in lists
2. **Multiple items** - Bulk template for 3+ items
3. **Familiarity** - Some users prefer WhatsApp directly
4. **Less friction** - For experienced sellers

### 🎯 Strategy
Two paths = serve both audiences:
- **New/casual sellers** → Quick Builder (hand-holding)
- **Power sellers** → Manual templates (speed)

---

## Page Layout Changes

### Before
1. Hero
2. How It Works
3. Contact buttons
4. What We Buy
5. Not Accepted
6. Photo Tips
7. Trust Strip
8. Community

### After
1. Hero
2. **Eligibility Gate** (collapsed accordions)
3. **Two-Path Choice** (Builder OR Manual)
4. **Quick Builder** (new section, gated)
5. **Manual Contact** (existing, gated)
6. Photo Tips (gated)
7. Trust Strip
8. Community (gated)

**Result:** 40% shorter initial page, progressive disclosure pattern

---

## CSS Additions

### New Classes
- `.choice-screen` - Two-path decision point
- `.choice-cards` - 2-column grid (responsive)
- `.quick-builder` - Builder form container
- `.builder-form` - Form wrapper with border
- `.form-group` - Individual field container
- `.form-label` - Gold labels for inputs
- `.form-helper` - Gray italic hints
- `.radio-group` - Grid of radio chips
- `.radio-option` - Individual radio wrapper
- `.form-select` - Styled dropdown
- `.form-input` - Text/number input
- `.form-textarea` - Notes field
- `.checkbox-group` - Checkbox + label
- `.price-range-display` - Green estimate box
- `.message-preview` - Monospace message output
- `.btn-generate` - Gold generate button
- `.btn-copy` - Blue copy button

### Responsive Behavior
- **Desktop:** 2-column accordion grid, side-by-side choice cards
- **Mobile:** Single column, stacked layouts, 56px touch targets

---

## 2-Column Accordion Grid

**Updated:** `.accordion` now uses CSS Grid
```css
.accordion {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}
```

**Benefits:**
- Shorter page (4 items in 2 rows vs 4 rows)
- Easier to scan categories
- Better use of widescreen space

---

## Not Accepted Updates

Added **"Designer brands"** to exclusion list:
- ❌ Tees/loose items
- ❌ Fast-fashion brands
- ❌ **Designer brands** ✨ (NEW)
- ❌ Fakes/replicas
- ❌ Broken/heavily damaged tech
- ❌ Low-value jewellery or non-authentic watches

---

## Deployment Checklist

- [x] Backup created (`sell-backup-eligibility-gate.html`)
- [x] CSS added (choice screen, builder form, 300+ lines)
- [x] HTML structure (two-path choice + builder form)
- [x] JavaScript logic (cascading dropdowns, validation, generation)
- [x] Brand lists populated (Streetwear, Shoes, Tech, Jewellery)
- [x] Price ranges configured (€70-€130 down to €0)
- [x] Size logic (conditional display)
- [x] Message generation (template with emojis)
- [x] Copy to clipboard (with success feedback)
- [x] WhatsApp prefill (URL-encoded message)
- [x] Analytics events (console.log, ready for gtag)
- [x] Accordion 2-column grid
- [x] Designer brands added to Not Accepted
- [x] Trailberg brand added to Streetwear
- [x] Mobile optimizations (touch targets, responsive grids)

---

## Testing Scenarios

### Happy Path
1. Load /sell → Check eligibility → Click "Yes"
2. See choice screen → Click "Quick Builder"
3. Select Streetwear → The North Face
4. Select Mint condition → See €30-€50 estimate
5. Enter price (€40), location (Swords), check photos
6. Click Generate → See message
7. Click Copy → Success confirmation
8. Click WhatsApp → Opens with prefilled message

### Edge Cases
- Select Tech → No size field shown (correct)
- Select Jewellery → Only 3 brands, no sizes
- Select Poor condition → See "€0 can be negotiated"
- Generate button disabled until all required fields
- Back to Choice → Clears form state

### Mobile
- Touch targets ≥ 56px
- Radio chips easy to tap
- Smooth scrolling to generated message
- WhatsApp opens in app (not desktop web)

---

## References

1. **Hick's Law (Choice Reduction)**  
   https://www.nngroup.com/videos/hicks-law-long-menus/

2. **Progressive Disclosure**  
   https://www.nngroup.com/articles/progressive-disclosure/

3. **Form Design Best Practices**  
   https://baymard.com/learn/form-design

4. **Dropdown vs Radio Usability**  
   https://baymard.com/blog/drop-down-usability

---

**Next Steps:**
1. Deploy to Cloudflare Pages
2. Test Quick Builder on mobile
3. Add CEX tech research to expand tech brand list
4. Monitor console logs for user behavior
5. Refine price ranges based on actual offers
6. A/B test choice screen copy
7. Integrate POST `/api/sell/intakes` when dashboard ready
