-- DATABASE STANDARDIZATION MIGRATION
-- Run Date: October 2, 2025
-- Database: unity-v3 (Remote Production)
-- Status: Tables are empty - safe to modify

-- ============================================
-- PHASE 1: ADD MISSING COLUMNS
-- ============================================

-- Add eircode to users table
ALTER TABLE users ADD COLUMN eircode TEXT;

-- Add preferred_contact to users table
ALTER TABLE users ADD COLUMN preferred_contact TEXT DEFAULT 'instagram';

-- Add delivery_eircode to orders table
ALTER TABLE orders ADD COLUMN delivery_eircode TEXT;

-- Add delivery_phone to orders table (in case different from user phone)
ALTER TABLE orders ADD COLUMN delivery_phone TEXT;

-- ============================================
-- PHASE 2: RENAME sell_cases COLUMNS
-- ============================================

-- Rename contact_phone to phone
ALTER TABLE sell_cases RENAME COLUMN contact_phone TO phone;

-- Rename contact_channel to preferred_contact
ALTER TABLE sell_cases RENAME COLUMN contact_channel TO preferred_contact;

-- Rename contact_handle to social_handle
ALTER TABLE sell_cases RENAME COLUMN contact_handle TO social_handle;

-- Rename contact_email to email
ALTER TABLE sell_cases RENAME COLUMN contact_email TO email;

-- ============================================
-- PHASE 3: CLEANUP (OPTIONAL - Do Last)
-- ============================================

-- Remove redundant full_name column from users
-- NOTE: Only do this after confirming all code uses first_name + last_name
-- ALTER TABLE users DROP COLUMN full_name;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify users table structure
-- PRAGMA table_info(users);

-- Verify sell_cases table structure
-- PRAGMA table_info(sell_cases);

-- Verify orders table structure
-- PRAGMA table_info(orders);

-- Check all table names
-- SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;
