-- Analytics Events Table for SBS Unity v3
-- This table captures all user interactions and system events for analysis.
-- Created: Oct 4, 2025

DROP TABLE IF EXISTS analytics_events;

CREATE TABLE analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,              -- e.g., 'page_view', 'add_to_cart', 'checkout_start'
    event_data TEXT,                       -- JSON object with event-specific details
    user_id INTEGER,                       -- Foreign key to users table (nullable for anonymous users)
    session_id TEXT,                       -- Correlates events within a single user session
    ip_address TEXT,
    user_agent TEXT,
    path TEXT,                             -- The URL path where the event occurred
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_analytics_event_type ON analytics_events (event_type);
CREATE INDEX idx_analytics_timestamp ON analytics_events (timestamp);
CREATE INDEX idx_analytics_user_id ON analytics_events (user_id);
