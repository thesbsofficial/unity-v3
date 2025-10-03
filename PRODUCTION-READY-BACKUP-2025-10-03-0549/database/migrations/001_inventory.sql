-- ========================================
-- SBS UNITY V3 - INVENTORY SYSTEM MIGRATION
-- Created: October 3, 2025
-- ========================================

-- Drop existing inventory table if it exists (clean slate)
DROP TABLE IF EXISTS inventory;
DROP INDEX IF EXISTS idx_inventory_category_size;
DROP INDEX IF EXISTS idx_inventory_batch;
DROP INDEX IF EXISTS idx_inventory_status;
DROP INDEX IF EXISTS idx_inventory_brand;
DROP INDEX IF EXISTS idx_inventory_sku;

-- Create inventory table with proper structure
CREATE TABLE inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Cloudflare Images Integration
    cloudflare_image_id TEXT UNIQUE NOT NULL,
    filename TEXT NOT NULL,
    
    -- Product Information (parsed from filename or manual entry)
    condition TEXT NOT NULL CHECK(condition IN ('BN', 'PO')),
    category TEXT NOT NULL CHECK(category IN ('STREETWEAR', 'SHOES', 'TECH', 'JEWELLERY')),
    size TEXT,                              -- NULL for Tech/Jewellery
    batch TEXT NOT NULL,                    -- e.g., B10021430
    upload_date TEXT NOT NULL,              -- YYYYMMDD format
    item_number INTEGER NOT NULL,
    
    -- Manual Metadata (NOT in filename)
    brand TEXT,
    model TEXT,
    price_cents INTEGER NOT NULL DEFAULT 0, -- Price in cents (e.g., 4599 = €45.99)
    
    -- Status Management
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'active', 'hidden', 'sold', 'archived')),
    
    -- Auto-generated Fields
    tags_json TEXT,                         -- JSON array for search/filtering
    sku TEXT GENERATED ALWAYS AS ('SBS-' || batch || '-' || printf('%03d', item_number)) STORED,
    
    -- Inventory Management
    quantity INTEGER NOT NULL DEFAULT 1,    -- Stock quantity
    reserved INTEGER NOT NULL DEFAULT 0,    -- Items in pending orders
    available INTEGER GENERATED ALWAYS AS (quantity - reserved) STORED,
    
    -- Timestamps
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT                         -- Soft delete
);

-- Indexes for fast filtering on Shop and Admin pages
CREATE INDEX idx_inventory_category_size ON inventory(category, size) WHERE deleted_at IS NULL;
CREATE INDEX idx_inventory_batch ON inventory(batch);
CREATE INDEX idx_inventory_status ON inventory(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_inventory_brand ON inventory(brand) WHERE deleted_at IS NULL;
CREATE INDEX idx_inventory_sku ON inventory(sku);
CREATE INDEX idx_inventory_available ON inventory(available) WHERE deleted_at IS NULL AND status = 'active';

-- ========================================
-- Create batches table for batch management
-- ========================================

DROP TABLE IF EXISTS batches;
DROP INDEX IF EXISTS idx_batches_batch_id;
DROP INDEX IF EXISTS idx_batches_location;
DROP INDEX IF EXISTS idx_batches_created_at;

CREATE TABLE batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT UNIQUE NOT NULL,          -- e.g., B10021430
    alias TEXT,                             -- Optional human-friendly name
    location TEXT,                          -- e.g., Dublin, Cork
    item_count INTEGER DEFAULT 0,
    locked BOOLEAN DEFAULT 0,               -- Prevent edits to finalized batch
    metadata_json TEXT,                     -- Extra details
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_batches_batch_id ON batches(batch_id);
CREATE INDEX idx_batches_location ON batches(location);
CREATE INDEX idx_batches_created_at ON batches(created_at);

-- ========================================
-- Create inventory_sync_log for tracking syncs
-- ========================================

DROP TABLE IF EXISTS inventory_sync_log;

CREATE TABLE inventory_sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sync_type TEXT NOT NULL CHECK(sync_type IN ('manual', 'auto')),
    images_found INTEGER NOT NULL,
    images_added INTEGER NOT NULL,
    images_updated INTEGER NOT NULL,
    images_unchanged INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('success', 'partial', 'failed')),
    error_message TEXT,
    sync_started_at TEXT NOT NULL,
    sync_completed_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- Create inventory_history for audit trail
-- ========================================

DROP TABLE IF EXISTS inventory_history;

CREATE TABLE inventory_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventory_id INTEGER NOT NULL,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by TEXT,                        -- User ID or 'system'
    change_reason TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inventory_id) REFERENCES inventory(id)
);

CREATE INDEX idx_inventory_history_inventory_id ON inventory_history(inventory_id);
CREATE INDEX idx_inventory_history_created_at ON inventory_history(created_at);

-- ========================================
-- Sample data (optional - remove for production)
-- ========================================

-- Example batch
INSERT INTO batches (batch_id, alias, location, item_count) VALUES
('B10031425', 'October Launch Batch', 'Dublin', 0);

-- Example inventory items (will be populated by sync)
-- These will be replaced by actual Cloudflare Images sync

COMMIT;
