-- ============================================================================
-- 📦 PRODUCT RESERVATIONS SYSTEM
-- Tracks items in checkout that are pending admin approval
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Product & Order Info
    product_id INTEGER NOT NULL,
    order_id INTEGER,
    order_number TEXT,
    
    -- Customer Info
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    
    -- Reservation Details
    reserved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME, -- Auto-expire after 24 hours if not confirmed
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'cancelled', 'expired')),
    admin_notes TEXT,
    
    -- Timestamps
    reviewed_at DATETIME,
    reviewed_by INTEGER, -- admin user_id
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_reservations_product ON product_reservations(product_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON product_reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_order ON product_reservations(order_number);
CREATE INDEX IF NOT EXISTS idx_reservations_expires ON product_reservations(expires_at);

-- ============================================================================
-- TRIGGER: Auto-update product status when reserved
-- ============================================================================

CREATE TRIGGER IF NOT EXISTS update_product_on_reservation
AFTER INSERT ON product_reservations
WHEN NEW.status = 'pending'
BEGIN
    UPDATE products 
    SET status = 'reserved', 
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.product_id;
END;

-- ============================================================================
-- TRIGGER: Update product status when reservation confirmed/cancelled
-- ============================================================================

CREATE TRIGGER IF NOT EXISTS update_product_on_reservation_status
AFTER UPDATE OF status ON product_reservations
BEGIN
    UPDATE products 
    SET status = CASE 
        WHEN NEW.status = 'confirmed' THEN 'sold'
        WHEN NEW.status IN ('cancelled', 'expired') THEN 'available'
        ELSE 'reserved'
    END,
    sold_at = CASE 
        WHEN NEW.status = 'confirmed' THEN CURRENT_TIMESTAMP
        ELSE NULL
    END,
    updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.product_id;
END;
