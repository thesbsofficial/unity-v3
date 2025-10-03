-- 📊 SBS ANALYTICS SYSTEM - DATABASE SCHEMA
-- Comprehensive event tracking and analytics aggregation

-- ═══════════════════════════════════════════════════════════════
-- TABLE 1: Raw Analytics Events
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Event Info
    event_type TEXT NOT NULL, -- page_view, product_view, add_to_cart, purchase, search, etc.
    event_category TEXT, -- customer, product, order, system
    
    -- User Info
    user_id INTEGER, -- FK to users (if logged in)
    session_id TEXT NOT NULL, -- Anonymous session tracking
    user_agent TEXT, -- Browser info
    ip_address TEXT, -- IP for fraud detection
    
    -- Context
    product_id TEXT, -- If event relates to product (CF Images ID)
    order_id INTEGER, -- If event relates to order
    category TEXT, -- Product category
    brand TEXT, -- Product brand
    page_url TEXT, -- Current page URL
    referrer TEXT, -- Where they came from
    
    -- Event Data (JSON for flexibility)
    metadata TEXT, -- JSON: {search_term, price, quantity, filters, etc.}
    
    -- Value
    value DECIMAL(10, 2) DEFAULT 0.00, -- Monetary value (for purchases)
    quantity INTEGER DEFAULT 1, -- Quantity (for cart adds, purchases)
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_product_id ON analytics_events(product_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics_events(DATE(created_at));

-- ═══════════════════════════════════════════════════════════════
-- TABLE 2: Daily Summary (Aggregated Data)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS analytics_daily_summary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE UNIQUE NOT NULL,
    
    -- Traffic Metrics
    total_sessions INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    page_views INTEGER DEFAULT 0,
    avg_session_duration INTEGER DEFAULT 0, -- seconds
    
    -- Product Engagement
    products_viewed INTEGER DEFAULT 0,
    unique_products_viewed INTEGER DEFAULT 0,
    
    -- Conversion Funnel
    cart_adds INTEGER DEFAULT 0,
    checkouts_initiated INTEGER DEFAULT 0,
    orders_completed INTEGER DEFAULT 0,
    
    -- Revenue Metrics
    revenue DECIMAL(10, 2) DEFAULT 0.00,
    avg_order_value DECIMAL(10, 2) DEFAULT 0.00,
    items_sold INTEGER DEFAULT 0,
    
    -- Top Performers
    top_product_id TEXT,
    top_product_views INTEGER DEFAULT 0,
    top_category TEXT,
    top_brand TEXT,
    
    -- Calculated Rates
    conversion_rate DECIMAL(5, 2) DEFAULT 0.00, -- (orders / unique_visitors) * 100
    cart_abandonment_rate DECIMAL(5, 2) DEFAULT 0.00, -- (cart_adds - orders) / cart_adds * 100
    add_to_cart_rate DECIMAL(5, 2) DEFAULT 0.00, -- (cart_adds / product_views) * 100
    
    -- Search Analytics
    total_searches INTEGER DEFAULT 0,
    unique_search_terms INTEGER DEFAULT 0,
    top_search_term TEXT,
    
    -- Sync Info
    synced_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_daily_summary_date ON analytics_daily_summary(date);

-- ═══════════════════════════════════════════════════════════════
-- TABLE 3: Product Performance (Per Product Analytics)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS analytics_product_performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT NOT NULL,
    date DATE NOT NULL,
    
    -- Engagement Metrics
    views INTEGER DEFAULT 0,
    unique_viewers INTEGER DEFAULT 0,
    cart_adds INTEGER DEFAULT 0,
    purchases INTEGER DEFAULT 0,
    
    -- Revenue
    revenue DECIMAL(10, 2) DEFAULT 0.00,
    units_sold INTEGER DEFAULT 0,
    
    -- Calculated Rates
    view_to_cart_rate DECIMAL(5, 2) DEFAULT 0.00, -- (cart_adds / views) * 100
    cart_to_purchase_rate DECIMAL(5, 2) DEFAULT 0.00, -- (purchases / cart_adds) * 100
    overall_conversion_rate DECIMAL(5, 2) DEFAULT 0.00, -- (purchases / views) * 100
    
    -- Product Info (cached for performance)
    product_name TEXT,
    category TEXT,
    brand TEXT,
    price DECIMAL(10, 2),
    
    -- Sync Info
    synced_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(product_id, date)
);

CREATE INDEX IF NOT EXISTS idx_product_perf_product_id ON analytics_product_performance(product_id);
CREATE INDEX IF NOT EXISTS idx_product_perf_date ON analytics_product_performance(date);
CREATE INDEX IF NOT EXISTS idx_product_perf_revenue ON analytics_product_performance(revenue DESC);

-- ═══════════════════════════════════════════════════════════════
-- TABLE 4: Search Analytics
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS analytics_searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    search_term TEXT NOT NULL,
    date DATE NOT NULL,
    
    -- Metrics
    search_count INTEGER DEFAULT 1,
    results_found INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0, -- How many times results were clicked
    
    -- Performance
    avg_results_count DECIMAL(10, 2) DEFAULT 0.00,
    click_through_rate DECIMAL(5, 2) DEFAULT 0.00, -- (clicks / searches) * 100
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(search_term, date)
);

CREATE INDEX IF NOT EXISTS idx_searches_date ON analytics_searches(date);
CREATE INDEX IF NOT EXISTS idx_searches_count ON analytics_searches(search_count DESC);

-- ═══════════════════════════════════════════════════════════════
-- TABLE 5: Sync Log (Track sync history)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS analytics_sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sync_type TEXT NOT NULL, -- daily_summary, product_performance, searches
    sync_date DATE,
    
    -- Results
    status TEXT DEFAULT 'success', -- success, failed, partial
    events_processed INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    error_message TEXT,
    
    -- Performance
    duration_ms INTEGER, -- How long sync took
    
    -- Timestamps
    started_at DATETIME,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_log_date ON analytics_sync_log(sync_date);
CREATE INDEX IF NOT EXISTS idx_sync_log_type ON analytics_sync_log(sync_type);

-- ═══════════════════════════════════════════════════════════════
-- VIEWS FOR EASY QUERYING
-- ═══════════════════════════════════════════════════════════════

-- Top Products Last 7 Days
CREATE VIEW IF NOT EXISTS v_top_products_7d AS
SELECT 
    product_id,
    product_name,
    category,
    brand,
    SUM(views) as total_views,
    SUM(cart_adds) as total_cart_adds,
    SUM(purchases) as total_purchases,
    SUM(revenue) as total_revenue,
    AVG(overall_conversion_rate) as avg_conversion_rate
FROM analytics_product_performance
WHERE date >= date('now', '-7 days')
GROUP BY product_id
ORDER BY total_revenue DESC;

-- Daily Trend (Last 30 Days)
CREATE VIEW IF NOT EXISTS v_daily_trend_30d AS
SELECT 
    date,
    unique_visitors,
    page_views,
    orders_completed,
    revenue,
    conversion_rate,
    avg_order_value
FROM analytics_daily_summary
WHERE date >= date('now', '-30 days')
ORDER BY date DESC;

-- Top Searches Last 7 Days
CREATE VIEW IF NOT EXISTS v_top_searches_7d AS
SELECT 
    search_term,
    SUM(search_count) as total_searches,
    AVG(results_found) as avg_results,
    AVG(click_through_rate) as avg_ctr
FROM analytics_searches
WHERE date >= date('now', '-7 days')
GROUP BY search_term
ORDER BY total_searches DESC
LIMIT 20;
