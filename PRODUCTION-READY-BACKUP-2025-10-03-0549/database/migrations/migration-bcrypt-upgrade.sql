-- Migration: Upgrade password hashing from SHA-256 to bcrypt
-- Date: October 2, 2025
-- Purpose: Security upgrade for authentication system

-- Step 1: Add column to track hash algorithm (temporary during migration)
ALTER TABLE users ADD COLUMN password_hash_type TEXT DEFAULT 'sha256';

-- Step 2: Add index for faster session lookups
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Step 3: Add is_active column if it doesn't exist (for soft deletes)
ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1;

-- Note: Existing passwords will remain SHA-256 until users log in again
-- The API will automatically upgrade them to bcrypt on next successful login
-- After all users have logged in at least once, the password_hash_type column can be removed
