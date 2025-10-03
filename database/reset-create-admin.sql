-- 🗑️ RESET DATABASE & CREATE ADMIN ACCOUNT
-- WARNING: This will DELETE ALL USERS and create fresh admin account

-- Disable foreign key constraints temporarily
PRAGMA foreign_keys = OFF;

-- Delete all related data (in reverse dependency order)
DELETE FROM session_tokens;
DELETE FROM email_verification_tokens;
DELETE FROM password_reset_tokens;
DELETE FROM admin_audit_logs;
DELETE FROM case_notes;
DELETE FROM case_photos;
DELETE FROM sell_cases;
DELETE FROM sessions;
DELETE FROM orders;

-- Delete all existing users
DELETE FROM users;

-- Re-enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Create SBS admin account
-- Username: SBS
-- Password: IAMADMIN
-- Email: fredbademosi1@icloud.com
-- Full Name: Fred Bademosi
-- Phone: 0899662211
-- Address: 50 Boroimhe Cedars, Swords, Dublin K67 W838
-- Instagram: @thesbsofficial
-- Role: admin

INSERT INTO users (
    social_handle,
    email,
    phone,
    password_hash,
    password_salt,
    first_name,
    last_name,
    full_name,
    address,
    city,
    eircode,
    instagram,
    role,
    email_verified,
    email_verified_at,
    email_verification_required,
    is_allowlisted,
    is_active,
    created_at,
    updated_at
) VALUES (
    'SBS',
    'fredbademosi1@icloud.com',
    '0899662211',
    -- Password: IAMADMIN (will be properly hashed on first login)
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    NULL,
    'Fred',
    'Bademosi',
    'Fred Bademosi',
    '50 Boroimhe Cedars, Swords',
    'Dublin',
    'K67 W838',
    '@thesbsofficial',
    'admin',
    1,
    CURRENT_TIMESTAMP,
    0,
    1,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Verify the account was created
SELECT 
    id,
    social_handle,
    email,
    full_name,
    phone,
    address,
    city,
    eircode,
    instagram,
    role,
    email_verified,
    is_allowlisted,
    created_at
FROM users
WHERE social_handle = 'SBS';
