# Database Setup - SBS Unity V3

## 📊 Database Type

**You're using: Cloudflare D1**

- **Not MySQL** ❌
- **Not MariaDB** ❌
- **It's SQLite-based** ✅

### What is Cloudflare D1?

D1 is Cloudflare's serverless SQL database built on SQLite. It runs at the edge and scales automatically.

**Key features:**

- SQLite-compatible syntax
- Serverless (no connection strings needed)
- Globally distributed
- Free tier: 5 GB storage, 5 million reads/day
- Bound directly to your Worker via `env.DB`

---

## 🗄️ Your Database Structure

### Database Name: `unity-v3`

**Database ID:** `1235f2c7-7b73-44b7-95c2-b44260e51179`

### Tables:

#### 1. `users` - Customer accounts

```sql
- id (PRIMARY KEY, AUTOINCREMENT)
- social_handle (UNIQUE, NOT NULL)
- email (UNIQUE)
- phone
- password_hash (NOT NULL)
- first_name, last_name
- address, city, eircode
- preferred_contact (default: 'instagram')
- created_at, updated_at, last_login
- is_active (default: 1)
- role (for admin access)
- is_allowlisted (for admin security)
```

#### 2. `orders` - Customer purchases

```sql
- id (PRIMARY KEY, AUTOINCREMENT)
- user_id (FOREIGN KEY → users.id)
- order_number (UNIQUE, format: 'SBS-XXXXXXXX')
- status (default: 'pending')
- total_amount
- items_json (product details stored as JSON)
- delivery_address, delivery_city, delivery_eircode, delivery_phone
- delivery_method
- payment_status (default: 'pending')
- created_at, updated_at
```

#### 3. `sessions` - Active login sessions

```sql
- id (PRIMARY KEY, AUTOINCREMENT)
- user_id (FOREIGN KEY → users.id)
- token (UNIQUE, NOT NULL)
- expires_at (NOT NULL)
- created_at
```

---

## 🖼️ Image Storage

**Images are NOT stored in the database.**

You use **Cloudflare Images** for product photos:

- Account Hash: `7B8CAeDtA5h1f1Dyh_X-hg`
- Currently: 78 images
- Delivery URL: `https://imagedelivery.net/[ACCOUNT_HASH]/[IMAGE_ID]/[VARIANT]`

**Also configured (but not yet used):**

- R2 Bucket: `sbs-product-images` (admin-controlled marketing images)
- R2 Bucket: `sbs-user-uploads` (seller-uploaded photos)

---

## 🔧 How It Works

### In `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "unity-v3"
database_id = "1235f2c7-7b73-44b7-95c2-b44260e51179"
```

### In your Worker code:

```javascript
// Access database via env.DB
const result = await env.DB.prepare("SELECT * FROM users WHERE email = ?")
  .bind(email)
  .first();
```

---

## 🆚 SQLite vs MySQL/MariaDB

| Feature            | D1/SQLite              | MySQL/MariaDB                  |
| ------------------ | ---------------------- | ------------------------------ |
| **Type**           | Serverless, file-based | Server-based                   |
| **Syntax**         | SQLite SQL             | MySQL SQL                      |
| **Auto-increment** | `AUTOINCREMENT`        | `AUTO_INCREMENT`               |
| **Datetime**       | `CURRENT_TIMESTAMP`    | `NOW()` or `CURRENT_TIMESTAMP` |
| **Boolean**        | INTEGER (0/1)          | BOOLEAN or TINYINT             |
| **Connection**     | Built-in binding       | Connection string required     |
| **Scaling**        | Automatic              | Manual configuration           |

**Your syntax is already SQLite-compatible!** ✅

---

## 📝 Schema Location

**Main schema file:** `/schema.sql`

**Migration files:** `/database/migrations/`

- `db-indexes-working.sql`
- `db-performance-boost.sql`
- `migration-add-indexes.sql`
- `migration-admin-security-upgrade-v2.sql`
- `migration-bcrypt-upgrade.sql`
- `migration-session-tokens-table.sql`
- `migration-standardization.sql`

---

## 🚀 Applying Schema Changes

### Option 1: Via Wrangler (Recommended)

```bash
npx wrangler d1 execute unity-v3 --file=schema.sql
```

### Option 2: Via Dashboard

1. Go to Cloudflare Dashboard
2. Workers & Pages → D1
3. Select `unity-v3` database
4. Use Console to run SQL commands

### Option 3: Via API

```javascript
const result = await env.DB.prepare("CREATE TABLE IF NOT EXISTS ...").run();
```

---

## 🔍 Querying Your Database

### Check tables:

```bash
npx wrangler d1 execute unity-v3 --command="SELECT name FROM sqlite_master WHERE type='table'"
```

### View users:

```bash
npx wrangler d1 execute unity-v3 --command="SELECT * FROM users LIMIT 10"
```

### Check orders:

```bash
npx wrangler d1 execute unity-v3 --command="SELECT * FROM orders ORDER BY created_at DESC LIMIT 10"
```

---

## 🎯 Why D1 (Not MySQL)?

1. **Serverless** - No server management
2. **Edge-native** - Runs where your Worker runs
3. **Free tier** - Perfect for small-to-medium projects
4. **Simple setup** - No connection strings or credentials
5. **Cloudflare ecosystem** - Integrates with Pages/Workers/Images/R2

---

## ⚠️ D1 Limitations

- **Read-only replicas** - Writes go to primary, reads can be replicated
- **No stored procedures** - Use Worker code instead
- **SQLite syntax only** - Can't use MySQL-specific features
- **Max 10 GB per database** - On free plan

For your e-commerce site with 78 products, this is more than enough! ✅

---

## 📊 Current Database Stats

**From `/api/health` endpoint:**

```json
{
  "status": "ok",
  "database": "connected",
  "checks": [
    {
      "name": "tables_present",
      "passed": true,
      "details": ["users", "orders", "sessions"]
    }
  ]
}
```

---

## 🔐 Security Notes

- Passwords stored with bcrypt hashing
- Sessions use secure random tokens
- Admin access requires `role='admin'` AND `is_allowlisted=1`
- CSRF tokens on all mutations
- No SQL injection (using prepared statements)

---

## 📚 Further Reading

- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Wrangler D1 Commands](https://developers.cloudflare.com/workers/wrangler/commands/#d1)

---

**Summary:** You're using **Cloudflare D1 (SQLite)**, not MySQL or MariaDB. Everything is already configured correctly! ✅
