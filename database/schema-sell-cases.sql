-- Sell Cases Database Schema for SBS Quick Builder
-- This schema stores seller submissions and photo references

-- Main sell cases table
CREATE TABLE IF NOT EXISTS sell_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id TEXT UNIQUE NOT NULL,              -- e.g., 'CASE-2025-001'
    user_id INTEGER,                            -- NULL if not registered user
    
    -- Item details
    category TEXT NOT NULL,                     -- BN-CLOTHES, BN-SHOES, PO-CLOTHES, PO-SHOES
    brand TEXT NOT NULL,
    condition TEXT NOT NULL,                    -- Brand New & Tagged, Like New, etc.
    size TEXT,                                  -- UK-6, M, XS-TOP-S-BOTTOM, etc.
    price REAL NOT NULL,                        -- Seller's asking price
    defects TEXT,                               -- Optional defects/issues description
    
    -- Collection address
    address TEXT NOT NULL,                      -- Street address
    city TEXT NOT NULL,                         -- City/Town
    eircode TEXT,                               -- Irish postal code (optional)
    
    -- Contact details (for internal use)
    phone TEXT NOT NULL,                        -- E.164 format: +353871234567
    preferred_contact TEXT NOT NULL,            -- 'instagram' or 'snapchat'
    social_handle TEXT NOT NULL,                -- Username (no @)
    email TEXT,                                 -- Optional email
    
    -- Photo tracking
    photo_count INTEGER DEFAULT 0,              -- Number of photos uploaded
    
    -- Case status
    status TEXT DEFAULT 'pending',              -- pending, reviewing, offered, accepted, rejected, collected
    offer_amount REAL,                          -- Your counter-offer (if any)
    offer_notes TEXT,                           -- Internal notes about the offer
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Registration tracking
    save_profile INTEGER DEFAULT 0,             -- 1 if user opted to save profile
    registration_email_sent INTEGER DEFAULT 0   -- 1 if registration email sent
);

-- Photo references table (points to R2 storage)
CREATE TABLE IF NOT EXISTS case_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id TEXT NOT NULL,
    filename TEXT NOT NULL,                     -- Original filename
    r2_key TEXT NOT NULL,                       -- Full R2 path: cases/{case-id}/{filename}
    file_size INTEGER,                          -- Size in bytes
    mime_type TEXT,                             -- image/jpeg, image/png, etc.
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES sell_cases(case_id) ON DELETE CASCADE
);

-- Case notes/history table (for admin use)
CREATE TABLE IF NOT EXISTS case_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id TEXT NOT NULL,
    admin_user TEXT,                            -- Who added the note
    note_type TEXT,                             -- 'comment', 'status_change', 'offer_made', etc.
    note_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES sell_cases(case_id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_case_photos_case_id ON case_photos(case_id);
CREATE INDEX IF NOT EXISTS idx_sell_cases_status ON sell_cases(status);
CREATE INDEX IF NOT EXISTS idx_sell_cases_created ON sell_cases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sell_cases_case_id ON sell_cases(case_id);
CREATE INDEX IF NOT EXISTS idx_case_notes_case_id ON case_notes(case_id);

-- View for active cases (for admin dashboard)
CREATE VIEW IF NOT EXISTS active_cases AS
SELECT 
    sc.case_id,
    sc.category,
    sc.brand,
    sc.condition,
    sc.size,
    sc.price,
    sc.status,
    sc.photo_count,
    sc.created_at,
    sc.contact_phone,
    sc.contact_channel || ': @' || sc.contact_handle as contact_info,
    sc.city
FROM sell_cases sc
WHERE sc.status IN ('pending', 'reviewing', 'offered')
ORDER BY sc.created_at DESC;
