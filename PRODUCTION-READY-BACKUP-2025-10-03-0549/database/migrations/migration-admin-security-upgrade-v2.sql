-- Admin Security Upgrade Migration (No explicit transactions)
-- Run with: npx wrangler d1 execute unity-v3 --remote --file=database/migrations/migration-admin-security-upgrade-v2.sql

-- ==================== Users Table Enhancements ====================

-- Add role column for RBAC
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';

-- Add PBKDF2 password hashing support
ALTER TABLE users ADD COLUMN password_salt TEXT;
ALTER TABLE users ADD COLUMN password_hash_type TEXT DEFAULT 'pbkdf2';
ALTER TABLE users ADD COLUMN password_iterations INTEGER DEFAULT 210000;

-- Add email verification
ALTER TABLE users ADD COLUMN email_verified_at DATETIME;
ALTER TABLE users ADD COLUMN email_verification_required INTEGER DEFAULT 1;

-- Add TOTP/2FA support
ALTER TABLE users ADD COLUMN totp_secret TEXT;
ALTER TABLE users ADD COLUMN totp_recovery_codes TEXT;

-- Add account lockout support
ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until DATETIME;

-- Add password change tracking
ALTER TABLE users ADD COLUMN last_password_change DATETIME;

-- ==================== Sessions Table Hardening ====================

-- Add CSRF protection
ALTER TABLE sessions ADD COLUMN csrf_secret TEXT;

-- Add session rotation tracking
ALTER TABLE sessions ADD COLUMN rotated_from TEXT;

-- Add session activity tracking
ALTER TABLE sessions ADD COLUMN last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Add client context for forensics
ALTER TABLE sessions ADD COLUMN ip_address TEXT;
ALTER TABLE sessions ADD COLUMN user_agent TEXT;

-- Add session invalidation support
ALTER TABLE sessions ADD COLUMN invalidated_at DATETIME;

-- ==================== Admin Allowlist Table ====================

CREATE TABLE IF NOT EXISTS admin_allowlist (
    user_id INTEGER PRIMARY KEY,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ==================== Admin Audit Logs Table ====================

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    resource TEXT,
    metadata_json TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_user ON admin_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_logs(created_at);

-- ==================== Password Reset Tokens Table ====================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create unique index on token hash for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_token_hash ON password_reset_tokens(token_hash);

-- ==================== Email Verification Tokens Table ====================

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create unique index on token hash for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_verification_token_hash ON email_verification_tokens(token_hash);
