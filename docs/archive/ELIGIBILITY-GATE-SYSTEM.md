# Eligibility Gate System - Sell Page

**Implemented:** October 1, 2025  
**Pattern:** Progressive Disclosure + Choice Reduction (Hick's Law)

---

## Overview

The sell page now uses an **eligibility gate** to pre-qualify sellers before showing contact options. This reduces unqualified inquiries, speeds up decision-making, and provides a clear path for both qualified and unqualified sellers.

---

## Page Structure (Top → Bottom)

### 1. **Hero** (Visible)
- **Title:** "Sell to SBS"
- **Tagline:** "Dublin's trusted buyer for streetwear, shoes, tech & luxury. Same-day collection. Instant cash or transfer."
- **No contact buttons** — Forces users to check eligibility first

### 2. **Eligibility Gate** (Visible - Required)
- **Section Title:** "Are your items eligible?"
- **Collapsed Accordions** (4 categories):
  - **Streetwear:** Tracksuits & jackets only (TNF, Monterrain, Yelir, Montirex, Berghaus, Nike Tech, Hugo Boss)
  - **Shoes:** Men's UK 8-11 (Nike, New Balance, Asics - popular models only)
  - **Tech:** Smartphones (2020+), consoles, PC parts, TVs
  - **Jewellery & Watches:** Gold/silver, luxury watches (authentication required)

- **Not Accepted Box** (always visible):
  - Tees/loose items
  - Fast-fashion brands
  - Fakes/replicas
  - Broken/damaged tech
  - Low-value jewellery

- **Gate Buttons:**
  - ✅ **"Yes, my item matches"** (green button) → Reveals contact section
  - ❌ **"No / Not sure"** (outline button) → Shows community section

### 3. **Contact Section** (Hidden by default - `.is-gated`)
- **Reveals when:** User clicks "Yes, my item matches"
- **WhatsApp Templates:**
  - Single item template (with emojis: 🔥📸💰📍🧾)
  - Multiple items template
- **Instagram DM:** @thesbsofficial
- **Snapchat:** @thesbs2.0
- **Note:** "Include photos, your price, and your location for a fast reply"

### 4. **Photo Tips** (Hidden by default - `.is-gated`)
- **Reveals when:** User clicks "Yes, my item matches"
- **Collapsed Accordion:** "Photo Tips — Get Better Offers"
- **Content:** Clean background • Natural light • Front/back/close-ups • Labels & flaws • Tech specifics

### 5. **Trust Strip** (Always visible)
- ⏰ ~30 min replies
- 🚚 Same-day collection
- 💵 Instant cash/transfer
- 👑 Authentic only

### 6. **Community** (Hidden by default - `.is-gated`)
- **Reveals when:** User clicks "No / Not sure"
- **WhatsApp Group:** Join active buyers across Dublin
- **Telegram Group:** Larger community

---

## UX Patterns Used

### 1. **Hick's Law (Choice Reduction)**
- **Old flow:** 3 contact buttons immediately visible → overwhelming
- **New flow:** Single eligibility question → 2 simple choices (Yes/No)
- **Result:** Faster decision-making, less cognitive load

### 2. **Progressive Disclosure**
- **Principle:** Show only essential information first; reveal details on demand
- **Implementation:**
  - Eligibility criteria in collapsed accordions
  - Contact buttons hidden until qualified
  - Photo tips hidden until relevant
- **Source:** [Nielsen Norman Group - Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)

### 3. **Eligibility Pattern**
- **Principle:** Check suitability before starting a service (like UK Gov services)
- **Implementation:** Gate with clear "matches/doesn't match" decision point
- **Source:** [GOV.UK Design System - Check a service is suitable](https://design-system.service.gov.uk/patterns/check-a-service-is-suitable/)

### 4. **Form Field Reduction**
- **Principle:** Minimize visible fields/messages to reduce friction
- **Implementation:** Single sticky reminder bar instead of repeated instructions
- **Source:** [Baymard Institute - Form Design](https://baymard.com/learn/form-design)

---

## CSS Classes

### `.is-gated`
- **Purpose:** Hide sections until gate condition is met
- **Default state:** `display: none; opacity: 0;`
- **Active state:** `display: block; opacity: 1; animation: fadeIn 0.5s ease;`

### `.visible`
- **Purpose:** Reveal gated content
- **Added by:** JavaScript `classList.add('visible')`

### Button Styles
- **`.btn-success`:** Green "Yes" button (22c55e)
- **`.btn-outline`:** Gray "No" button (transparent with border)

---

## JavaScript Functions

### `revealContact()`
**Triggered by:** "Yes, my item matches" button  
**Actions:**
1. Add `.visible` class to `#contact-section`
2. Add `.visible` class to `#photo-tips-section`
3. Smooth scroll to contact section
4. Track `eligibility_yes` event (console.log, ready for Google Analytics)
5. Reinitialize Lucide icons for newly visible content

### `showCommunity()`
**Triggered by:** "No / Not sure" button  
**Actions:**
1. Add `.visible` class to `#community-section`
2. Smooth scroll to community section
3. Track `eligibility_no` event (console.log, ready for Google Analytics)
4. Reinitialize Lucide icons

---

## Analytics Events (Ready for Integration)

### Eligibility Gate
- `eligibility_yes` - User clicked "Yes, my item matches"
- `eligibility_no` - User clicked "No / Not sure"

### Accordion Interactions
- `accordion_open` - User expanded a criteria section
  - Property: `section` (e.g., "Streetwear", "Shoes", "Tech")

### Contact CTAs
- `cta_whatsapp` - WhatsApp template clicked
  - Property: `template_type` ("single_item" or "multiple_items")
- `cta_instagram` - Instagram DM clicked
- `cta_snapchat` - Snapchat clicked

### Community CTAs
- Community group links clicked (WhatsApp/Telegram)

---

## WhatsApp Templates

### Single Item (URL-encoded with emojis)
```
🔥 SELLING TO SBS

📸 PICTURES: [attach clear photos]
💰 MY ASKING PRICE: €[amount]
📍 MY LOCATION: [Dublin area]

🧾 ITEM DETAILS:
• Brand:
• Size:
• Condition:
• Extras (box/tags/receipt):
```

### Multiple Items (URL-encoded with emojis)
```
🔥 SELLING MULTIPLE ITEMS TO SBS

📸 PICTURES: [attach group + each item]
📍 MY LOCATION: [Dublin area]

🧾 ITEMS & PRICES:
1) [Brand/Model] — Size — Condition — €[price]
2) [Brand/Model] — Size — Condition — €[price]
3) [Brand/Model] — Size — Condition — €[price]

✅ Ready for same-day collection
```

**Note:** All WhatsApp links use `rel="noopener noreferrer"` and `target="_blank"` for security and proper tab handling.

---

## Benefits vs. Trade-offs

### ✅ Benefits
1. **Fewer unqualified DMs** - Users self-select before contacting
2. **Faster triage** - Clear criteria upfront saves time
3. **Better decision speed** - 2 choices instead of 3 reduces cognitive load (Hick's Law)
4. **Shorter first screen** - Less overwhelming on load
5. **Clear expectations** - Users know what you buy/don't buy before reaching out
6. **Community path** - Non-qualified users get alternative option (not a dead-end)

### ⚠️ Trade-offs
1. **Added friction** - One extra click required (mitigated by clear benefits)
2. **May deter borderline cases** - Some users might leave instead of clicking (acceptable: reduces time spent on unqualified leads)

---

## Accessibility Features

1. **ARIA attributes:** `aria-expanded` and `aria-controls` on accordions
2. **Minimum tap targets:** All buttons ≥ 44px (iOS/Android guidelines)
3. **Visible focus states:** Button hover/focus styles for keyboard navigation
4. **Semantic HTML:** Proper heading hierarchy (h1 → h2 → h3 → h4)
5. **Smooth scroll:** `scroll-behavior: smooth` for better UX

---

## Mobile Optimizations

1. **Sticky reminder bar:** Shows after 250px scroll
2. **Responsive accordions:** Touch-friendly headers
3. **Full-width buttons:** Easy tapping on mobile
4. **Emoji icons:** Visual cues that work without icon libraries
5. **Overflow prevention:** `overflow-x: hidden` on html/body

---

## Future Enhancements

### Analytics Integration
Replace `console.log()` statements with:
```javascript
gtag('event', 'eligibility_yes', { page: 'sell' });
gtag('event', 'cta_whatsapp', { template_type: 'single_item' });
```

### A/B Testing Ideas
1. Test button copy: "Yes, my item matches" vs "Start Selling"
2. Test gate position: Before hero vs after hero
3. Test accordion defaults: All collapsed vs 1 expanded

### Conversion Tracking
- Track completion rate: eligibility_yes → WhatsApp template complete
- Track bounce: eligibility_no → community click vs exit
- Track time-to-decision: page load → eligibility choice

---

## References

1. **Hick's Law (Choice Reduction)**  
   https://www.nngroup.com/videos/hicks-law-long-menus/

2. **Progressive Disclosure**  
   https://www.nngroup.com/articles/progressive-disclosure/

3. **Form Design Best Practices**  
   https://baymard.com/learn/form-design

4. **GOV.UK Eligibility Pattern**  
   https://design-system.service.gov.uk/patterns/check-a-service-is-suitable/

---

## Deployment Checklist

- [x] CSS styles added (`.is-gated`, `.btn-success`, `.btn-outline`, animations)
- [x] Page structure reordered (hero → gate → contact → tips → trust → community)
- [x] JavaScript gate functions implemented (`revealContact()`, `showCommunity()`)
- [x] Analytics events added (console.log, ready for gtag)
- [x] WhatsApp templates URL-encoded with emojis
- [x] Security attributes added (`rel="noopener noreferrer"`)
- [x] Accessibility attributes added (`aria-expanded`, `aria-controls`)
- [x] Mobile optimizations tested (sticky bar, touch targets)
- [x] Icon system compatibility (Lucide reinitialize on reveal)

---

**Next Steps:**
1. Deploy to Cloudflare Pages
2. Test on mobile (iOS Safari, Android Chrome)
3. Monitor console logs for user behavior patterns
4. Integrate Google Analytics if desired
5. A/B test different gate copy/positions
