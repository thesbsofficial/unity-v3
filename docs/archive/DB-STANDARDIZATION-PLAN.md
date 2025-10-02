# Database Standardization Plan

## Current State Issues

### Naming Inconsistencies
1. **sell_cases** uses `contact_*` prefix unnecessarily
   - `contact_phone` → should be `phone`
   - `contact_channel` → should be `preferred_contact`
   - `contact_handle` → should be `social_handle`
   - `contact_email` → should be `email`

2. **users** table has redundant `full_name` column
   - Already has `first_name` and `last_name` (industry standard)
   - `full_name` should be removed

### Architecture Question: Shared vs Separate Data

**Current Setup:**
- `users` table: Registered buyers with accounts
- `sell_cases` table: Seller submissions (may or may not have account)

**Recommendation: HYBRID APPROACH (Keep Separate)**

**Why Keep Separate:**
1. **Different Use Cases**
   - Buyers need: email, password, order history, delivery addresses
   - Sellers need: phone, social handle, collection address, photos
   
2. **Privacy & Security**
   - Sellers might not want an account (Quick Builder is anonymous-friendly)
   - Buyers need secure login for order tracking
   
3. **Data Lifecycle**
   - Seller data: Temporary (60-day photo retention, case closes)
   - Buyer data: Permanent (order history, saved addresses)

4. **Flexibility**
   - Seller can submit without registering
   - If they register later, link via `user_id` in sell_cases

**BUT: Standardize the Field Names**

## Standardization Changes

### 1. Standardize Column Names

**sell_cases table changes:**
```sql
ALTER TABLE sell_cases RENAME COLUMN contact_phone TO phone;
ALTER TABLE sell_cases RENAME COLUMN contact_channel TO preferred_contact;
ALTER TABLE sell_cases RENAME COLUMN contact_handle TO social_handle;
ALTER TABLE sell_cases RENAME COLUMN contact_email TO email;
```

**users table cleanup:**
```sql
-- Remove redundant full_name column (can compute from first_name + last_name in app)
ALTER TABLE users DROP COLUMN full_name;
```

### 2. Consistent Field Usage Across Tables

| Field | users | sell_cases | orders | Notes |
|-------|-------|------------|--------|-------|
| `first_name` | ✓ | ❌ | ❌ | Only for registered users |
| `last_name` | ✓ | ❌ | ❌ | Only for registered users |
| `email` | ✓ | ✓ (optional) | ❌ | Both contexts |
| `phone` | ✓ | ✓ (required) | ❌ | Both contexts |
| `social_handle` | ✓ (login) | ✓ | ❌ | users = username, sell_cases = IG/Snap |
| `preferred_contact` | ✓ | ✓ | ❌ | How to reach them |
| `address` | ✓ | ✓ | ❌ | users = delivery, sell_cases = collection |
| `city` | ✓ | ✓ | ❌ | Both contexts |
| `delivery_address` | ❌ | ❌ | ✓ | Prefixed for order context |
| `delivery_city` | ❌ | ❌ | ✓ | Prefixed for order context |

### 3. Link Sellers to Users (Optional)

When a seller registers:
- Set `sell_cases.user_id` to their user ID
- Pull their saved contact info from `users` table for future submissions

## Implementation Order

1. ✅ Add `first_name`, `last_name` to users (already done)
2. ✅ Update API to use `first_name`, `last_name` (already done)
3. ⏳ Update register.html to collect `first_name`, `last_name`
4. ⏳ Rename columns in `sell_cases` table
5. ⏳ Update sell.html and API to use new column names
6. ⏳ Remove `full_name` column from users
7. ⏳ Update dashboard to display `first_name last_name`

## Benefits

✅ **Consistency**: Same field names across tables
✅ **Clarity**: No redundant `contact_*` prefixes
✅ **Flexibility**: Sellers can use Quick Builder without account
✅ **Integration**: Easy to link seller → user when they register
✅ **Standard**: Industry-standard `first_name` + `last_name`

## Migration Script

```sql
-- 1. Rename sell_cases columns
ALTER TABLE sell_cases RENAME COLUMN contact_phone TO phone;
ALTER TABLE sell_cases RENAME COLUMN contact_channel TO preferred_contact;
ALTER TABLE sell_cases RENAME COLUMN contact_handle TO social_handle;
ALTER TABLE sell_cases RENAME COLUMN contact_email TO email;

-- 2. Remove redundant column from users
ALTER TABLE users DROP COLUMN full_name;

-- Done! All tables now use consistent naming
```
