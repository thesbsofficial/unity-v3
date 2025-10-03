-- ADD EMAIL_VERIFIED COLUMN MIGRATION
-- Add email_verified column to users table
-- Date: October 2, 2025

-- Add email_verified column (0 = not verified, 1 = verified)
ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);

-- Set existing users with no email to verified (they don't need verification)
-- Set existing users with email to unverified (they need to verify)
UPDATE users SET email_verified = 1 WHERE email IS NULL OR email = '';
UPDATE users SET email_verified = 0 WHERE email IS NOT NULL AND email != '';
