-- ============================================================================
-- 🎯 SBS UNIFIED DATABASE SCHEMA - COMPLETE & LOGICAL
-- Version: 3.0
-- Last Updated: October 3, 2025
-- 
-- CONSOLIDATES ALL TABLES:
-- - Users & Authentication
-- - Products & Inventory
-- - Orders & Transactions
-- - Sell Submissions & Batches
-- - Admin & System Data
-- ============================================================================

-- ============================================================================
-- 👤 USER MANAGEMENT
-- ============================================================================

-- Users: Customer & Admin accounts
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'customer' CHECK(role IN ('customer', 'admin')),
    
    -- Profile
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    instagram_handle TEXT,
    snapchat_handle TEXT,
    
    -- Address
    address TEXT,
    city TEXT DEFAULT 'Dublin',
    eircode TEXT,
    
    -- Preferences
    preferred_contact TEXT DEFAULT 'email' CHECK(preferred_contact IN ('email', 'sms', 'whatsapp')),
    
    -- Status
    is_active INTEGER DEFAULT 1,
    is_verified INTEGER DEFAULT 0,
    verification_token TEXT,
    verification_expires DATETIME,
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_verified ON users(is_verified);

-- Sessions: Active authentication sessions
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Password Resets: Secure password recovery
CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    used INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets(expires_at);

-- ============================================================================
-- 🛍️ INVENTORY MANAGEMENT
-- ============================================================================

-- Products: Shop inventory
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Classification (Following taxonomy.js)
    category TEXT NOT NULL CHECK(category IN ('BN-CLOTHES', 'BN-SHOES', 'PO-CLOTHES', 'PO-SHOES')),
    size TEXT NOT NULL,
    
    -- Product Details
    brand TEXT NOT NULL,
    description TEXT,
    condition TEXT DEFAULT 'new' CHECK(condition IN ('new', 'excellent', 'good')),
    
    -- Pricing
    price REAL NOT NULL,
    original_price REAL,
    
    -- Media
    image_url TEXT,
    image_id TEXT,  -- For products-smart API compatibility
    cloudflare_image_id TEXT,
    additional_images TEXT, -- JSON array of URLs
    
    -- Status
    status TEXT DEFAULT 'available' CHECK(status IN ('available', 'reserved', 'sold', 'removed')),
    featured INTEGER DEFAULT 0,
    
    -- Analytics
    views_count INTEGER DEFAULT 0,
    quantity_available INTEGER DEFAULT 1,
    quantity_sold INTEGER DEFAULT 0,
    days_to_sell INTEGER,
    
    -- Metadata
    sku TEXT UNIQUE,
    tags TEXT, -- JSON array for search
    notes TEXT,
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sold_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- ============================================================================
-- 💰 ORDERS & TRANSACTIONS
-- ============================================================================

-- Orders: Customer purchases
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE NOT NULL,
    user_id INTEGER,
    
    -- Customer Info (for guest orders)
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    
    -- Items (JSON array)
    items_json TEXT NOT NULL,
    
    -- Delivery
    delivery_method TEXT NOT NULL CHECK(delivery_method IN ('collection', 'delivery')),
    delivery_fee REAL DEFAULT 0,
    delivery_address TEXT,
    delivery_city TEXT,
    delivery_eircode TEXT,
    
    -- Pricing
    subtotal REAL NOT NULL,
    total REAL NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'processing', 'shipped', 'completed', 'cancelled')),
    payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'refunded')),
    
    -- Notes
    admin_notes TEXT,
    customer_notes TEXT,
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

-- Order Items: Detailed line items (normalized alternative to items_json)
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER,
    
    -- Snapshot at time of order
    product_name TEXT NOT NULL,
    product_brand TEXT NOT NULL,
    product_category TEXT NOT NULL,
    product_size TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER DEFAULT 1,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- ============================================================================
-- 📦 SELL SUBMISSIONS
-- ============================================================================

-- Sell Submissions: Customer sell requests
CREATE TABLE IF NOT EXISTS sell_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT UNIQUE NOT NULL,
    user_id INTEGER,
    
    -- Contact Info (for guest submissions)
    contact_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    contact_email TEXT,
    
    -- Items (JSON array)
    items_json TEXT NOT NULL,
    item_count INTEGER NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'reviewing', 'approved', 'rejected', 'paid')),
    
    -- Admin Review
    reviewed_by INTEGER,
    reviewed_at DATETIME,
    admin_notes TEXT,
    
    -- Pricing
    total_offer REAL,
    payment_method TEXT CHECK(payment_method IN ('bank_transfer', 'store_credit', NULL)),
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sell_submissions_batch ON sell_submissions(batch_id);
CREATE INDEX IF NOT EXISTS idx_sell_submissions_user ON sell_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_sell_submissions_status ON sell_submissions(status);
CREATE INDEX IF NOT EXISTS idx_sell_submissions_created ON sell_submissions(created_at);

-- Sell Items: Individual items in submissions (normalized alternative)
CREATE TABLE IF NOT EXISTS sell_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL,
    
    -- Item Details
    category TEXT NOT NULL,
    size TEXT NOT NULL,
    brand TEXT NOT NULL,
    description TEXT,
    condition TEXT,
    
    -- Media
    image_urls TEXT, -- JSON array
    
    -- Admin Assessment
    approved INTEGER DEFAULT 0,
    offer_price REAL,
    rejection_reason TEXT,
    
    -- If converted to product
    product_id INTEGER,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (submission_id) REFERENCES sell_submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sell_items_submission ON sell_items(submission_id);
CREATE INDEX IF NOT EXISTS idx_sell_items_product ON sell_items(product_id);

-- ============================================================================
-- 📊 ANALYTICS & SYSTEM
-- ============================================================================

-- Analytics: Key business metrics
CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_type TEXT NOT NULL,
    metric_value REAL NOT NULL,
    metric_data TEXT, -- JSON for complex data
    period TEXT, -- 'daily', 'weekly', 'monthly'
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics(metric_type);
CREATE INDEX IF NOT EXISTS idx_analytics_recorded ON analytics(recorded_at);

-- System Logs: Important events
CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_level TEXT DEFAULT 'info' CHECK(log_level IN ('debug', 'info', 'warning', 'error', 'critical')),
    category TEXT NOT NULL,
    message TEXT NOT NULL,
    details TEXT, -- JSON
    user_id INTEGER,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(log_level);
CREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs(category);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON system_logs(created_at);

-- ============================================================================
-- 🎨 CLOUDFLARE IMAGES TRACKING
-- ============================================================================

-- Images: Track all Cloudflare images
CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cloudflare_id TEXT UNIQUE NOT NULL,
    
    -- Association
    entity_type TEXT NOT NULL CHECK(entity_type IN ('product', 'sell_item', 'user', 'other')),
    entity_id INTEGER,
    
    -- Metadata
    filename TEXT,
    uploaded_by INTEGER,
    file_size INTEGER,
    width INTEGER,
    height INTEGER,
    
    -- URL variants
    public_url TEXT,
    thumbnail_url TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_images_cloudflare_id ON images(cloudflare_id);
CREATE INDEX IF NOT EXISTS idx_images_entity ON images(entity_type, entity_id);

-- ============================================================================
-- 🔧 UTILITY VIEWS - Easy Data Access
-- ============================================================================

-- Active Products View
CREATE VIEW IF NOT EXISTS v_active_products AS
SELECT 
    p.*,
    CASE 
        WHEN p.category LIKE 'BN-%' THEN 'Brand New'
        WHEN p.category LIKE 'PO-%' THEN 'Pre-Owned'
    END as condition_category,
    CASE
        WHEN p.category LIKE '%-CLOTHES' THEN 'Clothes'
        WHEN p.category LIKE '%-SHOES' THEN 'Shoes'
    END as product_type
FROM products p
WHERE p.status = 'available'
AND p.is_active = 1;

-- Recent Orders View
CREATE VIEW IF NOT EXISTS v_recent_orders AS
SELECT 
    o.*,
    u.email as customer_email,
    u.first_name || ' ' || u.last_name as customer_full_name,
    json_extract(o.items_json, '$[0].brand') as first_item_brand
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
ORDER BY o.created_at DESC;

-- Pending Submissions View
CREATE VIEW IF NOT EXISTS v_pending_submissions AS
SELECT 
    s.*,
    u.email as customer_email,
    reviewer.email as reviewer_email
FROM sell_submissions s
LEFT JOIN users u ON s.user_id = u.id
LEFT JOIN users reviewer ON s.reviewed_by = reviewer.id
WHERE s.status IN ('pending', 'reviewing')
ORDER BY s.created_at ASC;

-- ============================================================================
-- 📝 INITIAL DATA - System Essentials
-- ============================================================================

-- Insert default admin (password: admin123 - CHANGE THIS!)
INSERT OR IGNORE INTO users (id, email, password_hash, role, first_name, is_verified, is_active)
VALUES (1, 'admin@8unity.ie', '$2a$10$xxxxxxxxxxx', 'admin', 'Admin', 1, 1);

-- ============================================================================
-- 🎯 END OF UNIFIED SCHEMA
-- ============================================================================
