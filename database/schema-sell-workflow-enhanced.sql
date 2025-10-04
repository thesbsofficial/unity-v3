-- ENHANCED SELL REQUEST WORKFLOW SCHEMA
-- Comprehensive system for item review, offers, and negotiation

-- Main sell submissions table (enhanced with workflow)
CREATE TABLE IF NOT EXISTS sell_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT UNIQUE NOT NULL,              -- BATCH-20251004-00001
    
    -- Seller contact information
    contact_phone TEXT NOT NULL,
    contact_email TEXT,
    contact_handle TEXT,
    contact_method TEXT DEFAULT 'instagram',    -- instagram, snapchat, whatsapp, email
    
    -- Item details (JSON array for Quick Builder)
    items_json TEXT NOT NULL,                   -- Array of items with category, brand, size, condition, etc.
    items_count INTEGER DEFAULT 0,
    
    -- Collection address
    address TEXT,
    city TEXT,
    eircode TEXT,
    
    -- Submission workflow status
    status TEXT DEFAULT 'pending',              -- pending, under_review, offer_sent, offer_accepted, offer_rejected, 
                                                 -- items_received, inspected, payment_processing, completed, cancelled
    
    -- Review & decision tracking
    reviewed_at DATETIME,
    reviewed_by INTEGER,                        -- Admin user ID
    review_decision TEXT,                       -- want_all, want_some, decline_all
    review_notes TEXT,                          -- Internal admin notes
    
    -- Items we want (if want_some)
    wanted_items_json TEXT,                     -- Array of item indices/IDs from items_json
    
    -- Offer details
    offer_amount REAL,                          -- Total offer amount in EUR
    offer_breakdown_json TEXT,                  -- Itemized pricing: [{item_id, price, notes}]
    offer_sent_at DATETIME,
    offer_expires_at DATETIME,                  -- Optional expiry for offers
    offer_message TEXT,                         -- Personalized message to seller
    
    -- Seller response to offer
    seller_response TEXT,                       -- accepted, rejected, counter_offered
    seller_response_at DATETIME,
    seller_counter_amount REAL,                 -- If seller counter-offers
    seller_counter_message TEXT,                -- Seller's message with counter
    
    -- Counter-negotiation (admin responds to counter)
    admin_counter_amount REAL,
    admin_counter_message TEXT,
    admin_counter_at DATETIME,
    
    -- Final agreement
    final_agreed_amount REAL,
    final_agreed_at DATETIME,
    
    -- Physical item tracking
    items_shipped_at DATETIME,
    items_received_at DATETIME,
    tracking_number TEXT,
    shipping_method TEXT,                       -- courier, collection, drop_off
    
    -- Post-receipt inspection
    inspection_status TEXT,                     -- pending, passed, issues_found
    inspection_notes TEXT,
    inspection_completed_at DATETIME,
    inspection_by INTEGER,                      -- Admin user ID
    
    -- Payment processing
    payment_status TEXT DEFAULT 'pending',      -- pending, processing, paid, on_hold
    payment_method TEXT,                        -- bank_transfer, revolut, cash
    payment_reference TEXT,
    payment_processed_at DATETIME,
    payment_amount REAL,                        -- Actual amount paid (may differ if issues found)
    
    -- Seller account details (for payment)
    seller_iban TEXT,
    seller_account_name TEXT,
    seller_phone_number TEXT,                   -- For Revolut
    
    -- Communication log
    last_contact_at DATETIME,
    contact_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    
    -- Flags
    urgent_flag INTEGER DEFAULT 0,              -- Mark as urgent/priority
    seller_notified INTEGER DEFAULT 0,          -- Email/SMS sent
    
    FOREIGN KEY (reviewed_by) REFERENCES users(id),
    FOREIGN KEY (inspection_by) REFERENCES users(id)
);

-- Offer history table (tracks all offers and counter-offers)
CREATE TABLE IF NOT EXISTS sell_offer_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL,
    offer_type TEXT NOT NULL,                   -- initial_offer, counter_offer_seller, counter_offer_admin, final_agreement
    offered_by TEXT NOT NULL,                   -- admin, seller
    offer_amount REAL NOT NULL,
    offer_details_json TEXT,                    -- Itemized breakdown
    offer_message TEXT,
    offer_sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    response TEXT,                              -- accepted, rejected, countered
    response_at DATETIME,
    
    FOREIGN KEY (submission_id) REFERENCES sell_submissions(id) ON DELETE CASCADE
);

-- Communication log table (all messages with seller)
CREATE TABLE IF NOT EXISTS sell_communication_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL,
    communication_type TEXT NOT NULL,           -- email, sms, instagram_dm, snapchat, phone_call
    direction TEXT NOT NULL,                    -- outbound, inbound
    subject TEXT,
    message_content TEXT,
    sent_by INTEGER,                            -- Admin user ID if outbound
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME,
    response_required INTEGER DEFAULT 0,
    
    FOREIGN KEY (submission_id) REFERENCES sell_submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (sent_by) REFERENCES users(id)
);

-- Item inspection details table (detailed inspection per item)
CREATE TABLE IF NOT EXISTS sell_item_inspections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL,
    item_index INTEGER NOT NULL,               -- Index in items_json array
    item_description TEXT,                      -- Copy of item details for reference
    
    -- Inspection results
    condition_matches INTEGER DEFAULT 1,        -- 0 if different from described
    actual_condition TEXT,
    defects_found TEXT,
    authenticity_verified INTEGER DEFAULT 1,    -- 0 if fake/suspicious
    
    -- Pricing adjustment
    original_offer_price REAL,
    adjusted_price REAL,
    adjustment_reason TEXT,
    
    -- Decision
    accepted INTEGER DEFAULT 1,                 -- 0 if rejecting this item
    rejection_reason TEXT,
    
    inspected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    inspected_by INTEGER,
    
    FOREIGN KEY (submission_id) REFERENCES sell_submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (inspected_by) REFERENCES users(id)
);

-- Seller profiles table (for repeat sellers)
CREATE TABLE IF NOT EXISTS seller_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_phone TEXT UNIQUE NOT NULL,
    contact_email TEXT,
    contact_handle TEXT,
    preferred_contact_method TEXT DEFAULT 'instagram',
    
    -- Seller stats
    total_submissions INTEGER DEFAULT 0,
    total_accepted INTEGER DEFAULT 0,
    total_rejected INTEGER DEFAULT 0,
    total_items_sold INTEGER DEFAULT 0,
    total_amount_paid REAL DEFAULT 0,
    
    -- Seller reputation
    avg_item_condition_rating REAL,             -- 1-5 scale
    reliability_score REAL,                     -- Based on description accuracy
    response_speed_avg_hours REAL,
    
    -- Seller preferences
    preferred_payment_method TEXT,
    iban TEXT,
    account_name TEXT,
    
    -- Flags
    trusted_seller INTEGER DEFAULT 0,
    blacklisted INTEGER DEFAULT 0,
    blacklist_reason TEXT,
    
    -- Timestamps
    first_submission_at DATETIME,
    last_submission_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Payment tracking table (detailed payment records)
CREATE TABLE IF NOT EXISTS sell_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL,
    seller_profile_id INTEGER,
    
    -- Payment details
    payment_method TEXT NOT NULL,               -- bank_transfer, revolut, cash
    payment_amount REAL NOT NULL,
    payment_reference TEXT,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Bank details (if transfer)
    recipient_iban TEXT,
    recipient_name TEXT,
    
    -- Revolut details
    recipient_phone TEXT,
    
    -- Status
    payment_status TEXT DEFAULT 'pending',      -- pending, sent, confirmed, failed
    confirmed_at DATETIME,
    confirmation_proof TEXT,                    -- File reference or screenshot ID
    
    -- Admin tracking
    processed_by INTEGER,
    notes TEXT,
    
    FOREIGN KEY (submission_id) REFERENCES sell_submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_profile_id) REFERENCES seller_profiles(id),
    FOREIGN KEY (processed_by) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sell_submissions_status ON sell_submissions(status);
CREATE INDEX IF NOT EXISTS idx_sell_submissions_batch_id ON sell_submissions(batch_id);
CREATE INDEX IF NOT EXISTS idx_sell_submissions_created_at ON sell_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sell_submissions_contact_phone ON sell_submissions(contact_phone);

CREATE INDEX IF NOT EXISTS idx_sell_offer_history_submission_id ON sell_offer_history(submission_id);
CREATE INDEX IF NOT EXISTS idx_sell_offer_history_offer_sent_at ON sell_offer_history(offer_sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_sell_communication_log_submission_id ON sell_communication_log(submission_id);
CREATE INDEX IF NOT EXISTS idx_sell_communication_log_sent_at ON sell_communication_log(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_sell_item_inspections_submission_id ON sell_item_inspections(submission_id);

CREATE INDEX IF NOT EXISTS idx_seller_profiles_contact_phone ON seller_profiles(contact_phone);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_trusted ON seller_profiles(trusted_seller);

CREATE INDEX IF NOT EXISTS idx_sell_payments_submission_id ON sell_payments(submission_id);
CREATE INDEX IF NOT EXISTS idx_sell_payments_payment_status ON sell_payments(payment_status);

-- Views for admin dashboard

-- Active submissions requiring action
CREATE VIEW IF NOT EXISTS active_sell_requests AS
SELECT 
    ss.id,
    ss.batch_id,
    ss.status,
    ss.items_count,
    ss.contact_phone,
    ss.contact_method || ': ' || COALESCE(ss.contact_handle, 'N/A') as contact_info,
    ss.offer_amount,
    ss.seller_response,
    ss.created_at,
    ss.offer_sent_at,
    ss.items_received_at,
    CASE 
        WHEN ss.status = 'pending' THEN 'Review needed'
        WHEN ss.status = 'offer_sent' THEN 'Awaiting seller response'
        WHEN ss.status = 'offer_accepted' THEN 'Awaiting items'
        WHEN ss.status = 'items_received' THEN 'Inspection needed'
        WHEN ss.status = 'inspected' THEN 'Payment needed'
        ELSE ss.status
    END as action_required
FROM sell_submissions ss
WHERE ss.status IN ('pending', 'under_review', 'offer_sent', 'offer_accepted', 'items_received', 'inspected')
ORDER BY ss.urgent_flag DESC, ss.created_at ASC;

-- Seller performance view
CREATE VIEW IF NOT EXISTS seller_performance AS
SELECT 
    sp.id,
    sp.contact_phone,
    sp.contact_handle,
    sp.total_submissions,
    sp.total_accepted,
    sp.total_rejected,
    sp.total_items_sold,
    sp.total_amount_paid,
    ROUND((sp.total_accepted * 100.0 / NULLIF(sp.total_submissions, 0)), 1) as acceptance_rate,
    sp.avg_item_condition_rating,
    sp.reliability_score,
    sp.trusted_seller,
    sp.blacklisted,
    sp.last_submission_at
FROM seller_profiles sp
ORDER BY sp.total_amount_paid DESC;

-- Pending payments view
CREATE VIEW IF NOT EXISTS pending_payments AS
SELECT 
    ss.batch_id,
    ss.contact_phone,
    ss.contact_handle,
    ss.final_agreed_amount,
    ss.payment_method,
    ss.seller_iban,
    ss.seller_account_name,
    ss.inspection_completed_at,
    JULIANDAY('now') - JULIANDAY(ss.inspection_completed_at) as days_waiting
FROM sell_submissions ss
WHERE ss.status = 'inspected' 
  AND ss.payment_status = 'pending'
  AND ss.inspection_status = 'passed'
ORDER BY days_waiting DESC;
