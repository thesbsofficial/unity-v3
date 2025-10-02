# Database Standardization - Final Plan

## Core Principle
**All user data should be linked and reusable across buying, selling, and account management.**

## Standardized User Profile Fields

Every user (whether buying or selling) should have:
- `first_name`, `last_name` - Name
- `email` - Email address
- `phone` - Phone number
- `social_handle` - Instagram/Snapchat username (doubles as login username)
- `preferred_contact` - How they want to be contacted
- `address` - Street address
- `city` - City/Town
- `eircode` - Irish postcode (ALWAYS include)

## Implementation Plan

### 1. Add Missing Fields to users Table

```sql
-- Add eircode to users table
ALTER TABLE users ADD COLUMN eircode TEXT;

-- Add preferred_contact to users table (if not exists)
ALTER TABLE users ADD COLUMN preferred_contact TEXT DEFAULT 'instagram';
```

### 2. Standardize sell_cases Column Names

```sql
-- Rename contact_* fields to match users table
ALTER TABLE sell_cases RENAME COLUMN contact_phone TO phone;
ALTER TABLE sell_cases RENAME COLUMN contact_channel TO preferred_contact;
ALTER TABLE sell_cases RENAME COLUMN contact_handle TO social_handle;
ALTER TABLE sell_cases RENAME COLUMN contact_email TO email;
```

### 3. Link Everything Through user_id

**sell_cases:**
- If user is logged in → auto-fill from users table
- If not logged in → create anonymous submission
- When they register later → link to their account

**orders:**
- Always require login (user_id NOT NULL)
- Pull delivery info from users.address, users.city, users.eircode
- Can override per-order with delivery_address, delivery_city

### 4. Remove Redundant Fields

```sql
-- Remove full_name from users (use first_name + last_name)
ALTER TABLE users DROP COLUMN full_name;
```

## Final Standardized Schema

### users table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Login credentials
    social_handle TEXT UNIQUE NOT NULL,        -- Username (also IG/Snap handle)
    password_hash TEXT NOT NULL,
    
    -- Personal info
    first_name TEXT,
    last_name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    
    -- Address (used for both delivery and collection)
    address TEXT,
    city TEXT DEFAULT 'Dublin',
    eircode TEXT,
    
    -- Preferences
    preferred_contact TEXT DEFAULT 'instagram', -- instagram, snapchat, whatsapp, email, phone
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active INTEGER DEFAULT 1
);
```

### sell_cases table
```sql
CREATE TABLE sell_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id TEXT UNIQUE NOT NULL,
    user_id INTEGER,                           -- Link to users table (NULL if anonymous)
    
    -- Item details
    category TEXT NOT NULL,
    brand TEXT NOT NULL,
    condition TEXT NOT NULL,
    size TEXT,
    price REAL NOT NULL,
    defects TEXT,
    
    -- Collection address (from users table or manual entry)
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    eircode TEXT,
    
    -- Contact info (from users table or manual entry)
    phone TEXT NOT NULL,
    preferred_contact TEXT NOT NULL,           -- instagram or snapchat
    social_handle TEXT NOT NULL,               -- IG/Snap username
    email TEXT,                                -- Optional
    
    -- Case management
    photo_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    offer_amount REAL,
    offer_notes TEXT,
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Registration tracking
    save_profile INTEGER DEFAULT 0,
    registration_email_sent INTEGER DEFAULT 0,
    
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### orders table
```sql
CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,                  -- Always require login
    order_number TEXT UNIQUE NOT NULL,
    
    -- Order details
    status TEXT DEFAULT 'pending',
    total_amount REAL NOT NULL,
    items_json TEXT NOT NULL,
    
    -- Delivery (defaults from users table, can override)
    delivery_address TEXT,
    delivery_city TEXT,
    delivery_eircode TEXT,                     -- Add this!
    delivery_method TEXT,
    
    -- Payment
    payment_status TEXT DEFAULT 'pending',
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Migration Steps

### Step 1: Add Missing Columns
```sql
-- Add to users
ALTER TABLE users ADD COLUMN eircode TEXT;
ALTER TABLE users ADD COLUMN preferred_contact TEXT DEFAULT 'instagram';

-- Add to orders
ALTER TABLE orders ADD COLUMN delivery_eircode TEXT;
```

### Step 2: Rename sell_cases Columns
```sql
ALTER TABLE sell_cases RENAME COLUMN contact_phone TO phone;
ALTER TABLE sell_cases RENAME COLUMN contact_channel TO preferred_contact;
ALTER TABLE sell_cases RENAME COLUMN contact_handle TO social_handle;
ALTER TABLE sell_cases RENAME COLUMN contact_email TO email;
```

### Step 3: Remove Redundant Columns
```sql
ALTER TABLE users DROP COLUMN full_name;
```

## Frontend Updates Needed

### register.html
- ✅ Already has first_name, last_name fields (need to add)
- ✅ Has email, phone, preferred_contact
- ❌ Add address, city, eircode fields

### sell.html
- ✅ Has phone, social_handle, email
- ✅ Has address, city, eircode
- ✅ Has social channel selection
- ✅ If logged in → auto-fill from users table
- ✅ If not logged in → manual entry, offer to save profile

### shop.html (checkout)
- ❌ Add delivery fields: address, city, eircode
- ✅ If logged in → auto-fill from users table
- ✅ Allow override per-order

### dashboard.html
- Show user's profile with all fields
- Allow editing: first_name, last_name, email, phone, address, city, eircode, preferred_contact
- Show their sell history (cases where user_id matches)
- Show their buy history (orders where user_id matches)

## Benefits

✅ **Unified Profile**: One source of truth for user data
✅ **Auto-fill Everywhere**: Save time on forms
✅ **Better UX**: Sellers can track their submissions in dashboard
✅ **Complete Addresses**: Always include eircode for accurate delivery
✅ **Flexible**: Anonymous selling still works, can link later
✅ **Consistent Naming**: Same field names across all tables

## Next Actions

1. Run migration SQL on remote database
2. Update API to handle new field names
3. Update register.html to collect full profile (address, city, eircode)
4. Update sell.html to auto-fill from logged-in user
5. Update shop.html to collect delivery info
6. Update dashboard to show full profile editor
