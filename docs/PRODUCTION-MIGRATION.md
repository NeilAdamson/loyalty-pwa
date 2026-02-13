# Production Admin Email Migration Guide

## Problem
Production environment still has old admin email (`admin@loyaltyladies.com`) instead of the new one (`admin@punchcard.co.za`).

## Solution

### Step 1: Update Production .env File

SSH into your VPS and edit the `.env` file:

```bash
ssh user@your-vps-ip
cd ~/loyalty-pwa
nano .env  # or use your preferred editor
```

Update these lines:
```ini
# Change from:
ADMIN_EMAIL=admin@loyaltyladies.com
ADMIN_PASSWORD=secure_admin_password

# To:
ADMIN_EMAIL=admin@punchcard.co.za
ADMIN_PASSWORD=password1234
```

Save and exit.

### Step 2: Restart API Container to Pick Up New Env Vars

```bash
docker compose restart api
```

### Step 3: Run Seed Script to Migrate Admin User

The seed script will automatically detect the old admin (`admin@loyaltyladies.com`) and migrate it to the new email (`admin@punchcard.co.za`):

```bash
docker compose exec api pnpm db:seed
```

Expected output:
```
Migrating admin from admin@loyaltyladies.com to admin@punchcard.co.za
Admin migrated to: admin@punchcard.co.za
```

### Step 4: Verify Migration

Run the diagnostic script to verify (script is already in container):

```bash
# Run diagnostic (no copying needed - script is included in container)
docker compose exec api node diagnose-admin.js
```

You should see:
- ✅ Found admin: `admin@punchcard.co.za`
- ✅ Password `password1234` is VALID
- No mention of `admin@loyaltyladies.com`

### Step 5: Test Login

1. Go to `https://punchcard.co.za/admin/login`
2. Login with:
   - Email: `admin@punchcard.co.za`
   - Password: `password1234`

## Alternative: Manual Migration (if seed script doesn't work)

If you prefer to migrate manually via SQL:

```bash
# Access database
docker compose exec db psql -U loyalty_app -d loyalty

# Run SQL commands:
UPDATE admin_users 
SET email = 'admin@punchcard.co.za',
    password_hash = '$2a$10$...' -- (hash of password1234)
WHERE email = 'admin@loyaltyladies.com';

# Exit psql
\q
```

**Note:** You'll need to generate the bcrypt hash for `password1234`. Use the seed script instead - it handles this automatically.

## Troubleshooting

### If migration fails with "unique constraint" error:
This means both emails exist. The seed script will delete the old one automatically.

### If you can't login after migration:
1. Check API logs: `docker compose logs api | grep -i admin`
2. Verify admin exists: Run `diagnose-admin.js`
3. Check for typos in email (e.g., "punccard" vs "punchcard")

### If you need to keep the old admin temporarily:
Don't update `.env` yet. The seed script will create the new admin alongside the old one. You can then manually delete the old one later via the admin portal or SQL.
