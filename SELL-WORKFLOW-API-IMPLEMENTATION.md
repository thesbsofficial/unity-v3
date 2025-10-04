# 🚀 SELL WORKFLOW API IMPLEMENTATION

**Priority:** High  
**Status:** Ready to Implement  
**Estimated Time:** 4-6 hours

---

## 📋 API ENDPOINTS TO CREATE/UPDATE

### 1. GET `/api/admin/sell-requests` (ENHANCE EXISTING)
**Add filters:**
- `?status=offer_sent` - Filter by workflow status
- `?seller_response=pending` - Filter by seller response
- `?inspection_needed=true` - Items awaiting inspection
- `?payment_needed=true` - Items awaiting payment

**Response enhancement:**
```javascript
{
  "success": true,
  "submissions": [
    {
      "id": 1,
      "batch_id": "BATCH-20251004-00001",
      "status": "offer_sent",
      "items_count": 3,
      "offer_amount": 150.00,
      "seller_response": null,
      "days_waiting": 2,
      "contact_info": {
        "phone": "+353871234567",
        "handle": "@sneakerking",
        "method": "instagram"
      },
      "created_at": "2025-10-04T10:00:00Z",
      "offer_sent_at": "2025-10-04T14:00:00Z"
    }
  ],
  "summary": {
    "pending_review": 5,
    "offers_sent": 8,
    "awaiting_items": 3,
    "inspection_needed": 2,
    "payment_needed": 1
  }
}
```

---

### 2. PUT `/api/admin/sell-requests/:id/review` (NEW)
**Purpose:** Admin reviews submission and decides what to buy

**Request Body:**
```javascript
{
  "review_decision": "want_some",  // want_all, want_some, decline_all
  "wanted_items": [0, 2, 4],       // Array of item indices (if want_some)
  "review_notes": "Only interested in Nike items"
}
```

**Response:**
```javascript
{
  "success": true,
  "submission": {
    "id": 1,
    "status": "under_review",
    "review_decision": "want_some",
    "wanted_items_json": "[0,2,4]",
    "reviewed_at": "2025-10-04T15:00:00Z",
    "reviewed_by": 1
  },
  "message": "Review saved. Ready to create offer."
}
```

---

### 3. POST `/api/admin/sell-requests/:id/offer` (NEW)
**Purpose:** Create and send offer to seller

**Request Body:**
```javascript
{
  "offer_amount": 150.00,
  "offer_breakdown": [
    {
      "item_index": 0,
      "description": "Nike Air Max 90 - UK 8",
      "price": 60.00,
      "notes": "Excellent condition"
    },
    {
      "item_index": 2,
      "description": "Adidas Ultraboost - UK 9",
      "price": 90.00,
      "notes": "Brand new with tags"
    }
  ],
  "offer_message": "Hi! We'd love to buy these items from you...",
  "offer_expires_at": "2025-10-11T23:59:59Z",  // Optional
  "send_notification": true  // Send email/SMS
}
```

**Response:**
```javascript
{
  "success": true,
  "submission": {
    "id": 1,
    "status": "offer_sent",
    "offer_amount": 150.00,
    "offer_sent_at": "2025-10-04T15:30:00Z"
  },
  "notification_sent": true,
  "message": "Offer sent to seller successfully"
}
```

**Database Updates:**
```sql
UPDATE sell_submissions SET
  status = 'offer_sent',
  offer_amount = 150.00,
  offer_breakdown_json = '[...]',
  offer_sent_at = datetime('now'),
  offer_message = '...',
  seller_notified = 1
WHERE id = 1;

INSERT INTO sell_offer_history (
  submission_id, offer_type, offered_by, offer_amount, 
  offer_details_json, offer_message
) VALUES (1, 'initial_offer', 'admin', 150.00, '[...]', '...');

INSERT INTO sell_communication_log (
  submission_id, communication_type, direction, subject, message_content
) VALUES (1, 'email', 'outbound', 'Offer for Your Items', '...');
```

---

### 4. POST `/api/admin/sell-requests/:id/seller-response` (NEW)
**Purpose:** Record seller's response to offer (can be called by seller via magic link, or admin manually)

**Request Body:**
```javascript
{
  "response": "accepted",  // accepted, rejected, counter_offered
  "counter_amount": 175.00,  // If counter_offered
  "counter_message": "I was hoping for €175",  // If counter_offered
  "response_source": "seller_portal"  // seller_portal, manual_entry, email_reply
}
```

**Response:**
```javascript
{
  "success": true,
  "submission": {
    "id": 1,
    "status": "offer_accepted",  // or still offer_sent if countered
    "seller_response": "accepted",
    "final_agreed_amount": 150.00,
    "final_agreed_at": "2025-10-05T14:00:00Z"
  },
  "next_action": "Request shipping details"
}
```

---

### 5. POST `/api/admin/sell-requests/:id/counter-offer` (NEW)
**Purpose:** Admin responds to seller's counter-offer

**Request Body:**
```javascript
{
  "counter_amount": 165.00,
  "counter_message": "We can do €165 as our final offer",
  "is_final": true  // Mark as final offer
}
```

**Response:**
```javascript
{
  "success": true,
  "submission": {
    "id": 1,
    "status": "offer_sent",
    "admin_counter_amount": 165.00,
    "admin_counter_at": "2025-10-05T15:00:00Z"
  },
  "notification_sent": true
}
```

---

### 6. POST `/api/admin/sell-requests/:id/items-received` (NEW)
**Purpose:** Mark items as physically received

**Request Body:**
```javascript
{
  "tracking_number": "IE123456789",
  "shipping_method": "AnPost",
  "received_by": "John Doe",
  "notes": "Package in good condition"
}
```

**Response:**
```javascript
{
  "success": true,
  "submission": {
    "id": 1,
    "status": "items_received",
    "items_received_at": "2025-10-08T10:00:00Z",
    "tracking_number": "IE123456789"
  },
  "next_action": "Begin inspection"
}
```

---

### 7. POST `/api/admin/sell-requests/:id/inspect` (NEW)
**Purpose:** Record inspection results for each item

**Request Body:**
```javascript
{
  "inspections": [
    {
      "item_index": 0,
      "condition_matches": true,
      "actual_condition": "excellent",
      "defects_found": null,
      "authenticity_verified": true,
      "original_offer_price": 60.00,
      "adjusted_price": 60.00,
      "accepted": true
    },
    {
      "item_index": 2,
      "condition_matches": false,
      "actual_condition": "good",
      "defects_found": "Minor scuff on heel",
      "authenticity_verified": true,
      "original_offer_price": 90.00,
      "adjusted_price": 70.00,
      "adjustment_reason": "Condition not as described",
      "accepted": true
    }
  ],
  "overall_notes": "Most items in good condition, one adjustment needed",
  "notify_seller_of_adjustments": true
}
```

**Response:**
```javascript
{
  "success": true,
  "submission": {
    "id": 1,
    "status": "inspected",
    "inspection_status": "passed",
    "inspection_completed_at": "2025-10-08T14:00:00Z",
    "original_offer": 150.00,
    "adjusted_total": 130.00,
    "adjustment_reason": "One item condition adjustment"
  },
  "adjustments_made": true,
  "seller_notified": true,
  "next_action": "Process payment of €130.00"
}
```

**Database:**
```sql
UPDATE sell_submissions SET
  status = 'inspected',
  inspection_status = 'passed',
  inspection_completed_at = datetime('now'),
  payment_amount = 130.00
WHERE id = 1;

-- Insert individual item inspections
INSERT INTO sell_item_inspections (...) VALUES (...);
```

---

### 8. POST `/api/admin/sell-requests/:id/payment` (NEW)
**Purpose:** Process and record payment

**Request Body:**
```javascript
{
  "payment_method": "bank_transfer",  // bank_transfer, revolut, cash
  "payment_amount": 130.00,
  "recipient_iban": "IE12BOFI90000112345678",  // If bank_transfer
  "recipient_name": "John Doe",
  "recipient_phone": "+353871234567",  // If revolut
  "payment_reference": "BATCH-20251004-00001",
  "payment_date": "2025-10-08T14:00:00Z",
  "confirmation_proof": "proof_image_id",  // Optional
  "notes": "Payment sent via SEPA transfer"
}
```

**Response:**
```javascript
{
  "success": true,
  "submission": {
    "id": 1,
    "status": "completed",
    "payment_status": "sent",
    "payment_amount": 130.00,
    "payment_processed_at": "2025-10-08T14:00:00Z",
    "completed_at": "2025-10-08T14:00:00Z"
  },
  "payment_id": 5,
  "message": "Payment processed successfully"
}
```

**Database:**
```sql
UPDATE sell_submissions SET
  status = 'completed',
  payment_status = 'sent',
  payment_method = 'bank_transfer',
  payment_amount = 130.00,
  payment_processed_at = datetime('now'),
  completed_at = datetime('now')
WHERE id = 1;

INSERT INTO sell_payments (
  submission_id, payment_method, payment_amount, recipient_iban, recipient_name
) VALUES (1, 'bank_transfer', 130.00, 'IE12...', 'John Doe');

-- Update seller profile
UPDATE seller_profiles SET
  total_items_sold = total_items_sold + 2,
  total_amount_paid = total_amount_paid + 130.00,
  last_submission_at = datetime('now')
WHERE contact_phone = '+353871234567';
```

---

## 🎨 ADMIN UI COMPONENTS

### 1. **Submission Review Modal**
```
┌─────────────────────────────────────────┐
│ Review Submission: BATCH-20251004-00001 │
├─────────────────────────────────────────┤
│                                         │
│ Items Submitted (3 total):              │
│                                         │
│ ☐ Item 1: Nike Air Max 90 - UK 8       │
│    Condition: Brand New                 │
│    Seller Price: €80                    │
│                                         │
│ ☐ Item 2: Puma RS-X - UK 9             │
│    Condition: Good                      │
│    Seller Price: €40                    │
│                                         │
│ ☐ Item 3: Adidas Ultraboost - UK 9     │
│    Condition: Excellent                 │
│    Seller Price: €100                   │
│                                         │
├─────────────────────────────────────────┤
│ Decision:                               │
│ ◉ Want All Items                        │
│ ○ Want Selected Items (Select above)   │
│ ○ Decline All Items                     │
│                                         │
│ Review Notes:                           │
│ ┌─────────────────────────────────────┐ │
│ │ Great selection, all match criteria │ │
│ └─────────────────────────────────────┘ │
│                                         │
│    [Cancel]      [Save & Create Offer] │
└─────────────────────────────────────────┘
```

### 2. **Offer Creation Modal**
```
┌─────────────────────────────────────────┐
│ Create Offer: BATCH-20251004-00001      │
├─────────────────────────────────────────┤
│ Items to Purchase (2 selected):         │
│                                         │
│ Item 1: Nike Air Max 90 - UK 8         │
│ Your Offer: € [60.00]                   │
│ Notes: [Excellent condition]            │
│                                         │
│ Item 3: Adidas Ultraboost - UK 9       │
│ Your Offer: € [90.00]                   │
│ Notes: [Brand new with tags]            │
│                                         │
│ ─────────────────────────────────────   │
│ Total Offer: €150.00                    │
│                                         │
│ Message to Seller:                      │
│ ┌─────────────────────────────────────┐ │
│ │ Hi! We'd love to buy these items... │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Offer Expires: [10/11/2025] (Optional) │
│                                         │
│ ☑ Send email notification               │
│ ☑ Send SMS notification                 │
│                                         │
│       [Cancel]      [Send Offer]        │
└─────────────────────────────────────────┘
```

### 3. **Negotiation Interface**
```
┌─────────────────────────────────────────┐
│ Negotiation: BATCH-20251004-00001       │
├─────────────────────────────────────────┤
│                                         │
│ 📤 Your Offer (Oct 4, 2:00 PM)          │
│    €150.00 total                        │
│    ├ Nike Air Max: €60                  │
│    └ Adidas Ultraboost: €90             │
│                                         │
│ 📥 Seller Counter (Oct 5, 2:30 PM)      │
│    €175.00                              │
│    "I was hoping for €175"              │
│                                         │
│ ─────────────────────────────────────   │
│                                         │
│ Your Response:                          │
│ ◉ Accept Counter (€175)                 │
│ ○ Make Counter-Offer                    │
│ ○ Decline and Cancel                    │
│                                         │
│ Counter Amount: € [165.00]              │
│ Message: [We can do €165 as final]      │
│ ☑ Mark as final offer                   │
│                                         │
│       [Cancel]      [Send Response]     │
└─────────────────────────────────────────┘
```

### 4. **Inspection Form**
```
┌─────────────────────────────────────────┐
│ Item Inspection: BATCH-20251004-00001   │
├─────────────────────────────────────────┤
│                                         │
│ Item 1: Nike Air Max 90 - UK 8         │
│ ┌─────────────────────────────────────┐ │
│ │ ☑ Condition matches description     │ │
│ │ ☑ Authenticity verified             │ │
│ │ ☐ Defects found                     │ │
│ │                                     │ │
│ │ Actual Condition: [Excellent ▼]    │ │
│ │ Original Offer: €60.00              │ │
│ │ Adjusted Price: € [60.00]           │ │
│ │                                     │ │
│ │ Notes: [All good, as described]     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Item 2: Adidas Ultraboost - UK 9       │
│ ┌─────────────────────────────────────┐ │
│ │ ☐ Condition matches description     │ │
│ │ ☑ Authenticity verified             │ │
│ │ ☑ Defects found                     │ │
│ │                                     │ │
│ │ Actual Condition: [Good ▼]          │ │
│ │ Defects: [Minor scuff on heel]      │ │
│ │                                     │ │
│ │ Original Offer: €90.00              │ │
│ │ Adjusted Price: € [70.00]           │ │
│ │ Reason: [Condition not as described]│ │
│ └─────────────────────────────────────┘ │
│                                         │
│ New Total: €130.00 (was €150.00)       │
│ ☑ Notify seller of price adjustment     │
│                                         │
│     [Cancel]      [Complete Inspection] │
└─────────────────────────────────────────┘
```

---

## 🔄 WORKFLOW STATUS BADGE COLORS

```javascript
const statusColors = {
  'pending': 'gray',           // ⚪ Awaiting review
  'under_review': 'blue',      // 🔵 Being reviewed
  'offer_sent': 'yellow',      // 🟡 Awaiting seller response
  'offer_accepted': 'green',   // 🟢 Accepted, awaiting items
  'offer_rejected': 'red',     // 🔴 Rejected by seller
  'items_received': 'purple',  // 🟣 Items received, inspection pending
  'inspected': 'orange',       // 🟠 Inspected, payment pending
  'payment_processing': 'teal',// 🔷 Payment being processed
  'completed': 'success',      // ✅ Transaction complete
  'cancelled': 'gray'          // ⚫ Cancelled/declined
};
```

---

## 🚀 IMPLEMENTATION ORDER

### Day 1: Database & Core API
1. ✅ Create enhanced schema
2. Run migration on D1
3. Create PUT `/review` endpoint
4. Create POST `/offer` endpoint
5. Test offer creation flow

### Day 2: Negotiation & Response
6. Create POST `/seller-response` endpoint
7. Create POST `/counter-offer` endpoint
8. Test negotiation flow
9. Add seller notification system

### Day 3: Inspection & Payment
10. Create POST `/items-received` endpoint
11. Create POST `/inspect` endpoint
12. Create POST `/payment` endpoint
13. Test complete workflow

### Day 4: Admin UI
14. Build review modal
15. Build offer creation modal
16. Build negotiation interface
17. Build inspection form
18. Build payment form

### Day 5: Polish & Test
19. Add email templates
20. Test end-to-end workflow
21. Add error handling
22. Deploy to production

---

**Next Step:** Run database migration  
**Command:** `wrangler d1 execute unity_db --file=./database/schema-sell-workflow-enhanced.sql`
