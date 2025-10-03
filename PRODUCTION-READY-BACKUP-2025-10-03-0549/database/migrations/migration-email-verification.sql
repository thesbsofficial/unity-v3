-- EMAIL VERIFICATION MIGRATION
-- Add email verification support to users table
-- Date: October 2, 2025

-- Create email verification tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    used_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Index for faster token lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_verification_token_hash 
ON email_verification_tokens(token_hash);

-- Index for cleanup queries (removing expired tokens)
CREATE INDEX IF NOT EXISTS idx_email_verification_expires 
ON email_verification_tokens(expires_at);
