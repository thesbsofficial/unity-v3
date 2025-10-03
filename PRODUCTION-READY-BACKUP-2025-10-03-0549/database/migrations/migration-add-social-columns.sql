-- ADD SOCIAL MEDIA COLUMNS TO USERS
-- Date: October 2, 2025

-- Add Instagram and Snapchat handle columns
ALTER TABLE users ADD COLUMN instagram TEXT;
ALTER TABLE users ADD COLUMN snapchat TEXT;

-- Create indexes for social lookups (optional but helpful)
CREATE INDEX IF NOT EXISTS idx_users_instagram ON users(instagram);
CREATE INDEX IF NOT EXISTS idx_users_snapchat ON users(snapchat);
