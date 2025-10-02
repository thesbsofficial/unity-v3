# 🚀 SBS UNITY DATABASE SETUP GUIDE

## Step 1: Create D1 Database

Run this command in your terminal:

```powershell
cd "c:\Users\fredb\Desktop\unity-v3\public (4)"
wrangler d1 create sbs-unity-db
```

You'll get output like:
```
✅ Successfully created DB 'sbs-unity-db'
database_id = "xxxx-xxxx-xxxx-xxxx"
```

**Copy the `database_id`** - you'll need it!

---

## Step 2: Update wrangler.toml

Open `wrangler.toml` and replace `YOUR_DATABASE_ID_HERE` with your actual database ID:

```toml
[[d1_databases]]
binding = "DB"
database_name = "sbs-unity-db"
database_id = "paste-your-id-here"
```

---

## Step 3: Initialize Database Schema

Run this command to create the tables:

```powershell
wrangler d1 execute sbs-unity-db --file=schema.sql
```

This creates:
- ✅ `users` table (customer accounts)
- ✅ `orders` table (customer orders)
- ✅ `sessions` table (login tokens)

---

## Step 4: Deploy to Cloudflare Pages

```powershell
wrangler pages deploy public
```

---

## Step 5: Test It Out! 🎉

### Test Registration:
1. Go to `https://your-site.pages.dev/register.html`
2. Create an account with:
   - Social handle: `@testuser`
   - Password: `password123`
   - Email: `test@example.com`

### Test Login:
1. Go to `https://your-site.pages.dev/login.html`
2. Login with your credentials
3. You'll be redirected to `/dashboard.html`

---

## 🔍 View Your Data

```powershell
# See all users
wrangler d1 execute sbs-unity-db --command="SELECT * FROM users"

# See all orders
wrangler d1 execute sbs-unity-db --command="SELECT * FROM orders"

# See active sessions
wrangler d1 execute sbs-unity-db --command="SELECT * FROM sessions"
```

---

## 📡 API Endpoints Created

### Authentication:
- `POST /api/users/register` - Create new account
- `POST /api/users/login` - Login
- `GET /api/users/me` - Get user profile (requires auth)
- `POST /api/users/logout` - Logout

### Orders:
- `POST /api/orders` - Create order (requires auth)
- `GET /api/orders` - Get user's orders (requires auth)

### Health Check:
- `GET /api/health` - Check API status

---

## 🔐 Security Features:
- ✅ Password hashing (SHA-256)
- ✅ Session tokens (30-day expiry)
- ✅ Auth required for orders
- ✅ CORS enabled
- ✅ SQL injection prevention (prepared statements)

---

## 🎯 What's Next?

Your login/register pages are now fully functional! Next steps:
1. Create `/dashboard.html` for logged-in users
2. Add password reset functionality
3. Create order checkout flow
4. Add admin panel for order management

---

## 🐛 Troubleshooting

### "Database not found"
- Make sure you ran `wrangler d1 create sbs-unity-db`
- Check the database_id in wrangler.toml

### "Login fails"
- Open browser console to see error messages
- Check that tables were created: `wrangler d1 execute sbs-unity-db --command="SELECT name FROM sqlite_master WHERE type='table'"`

### "CORS errors"
- Make sure you deployed after making changes
- Clear browser cache

---

**Ready to go! 🚀 Run the commands above and your authentication system will be live!**
