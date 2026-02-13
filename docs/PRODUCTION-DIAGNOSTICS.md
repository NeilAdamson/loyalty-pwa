# Running Diagnostics in Production

## Running Diagnostic Scripts

All diagnostic and verification scripts are included in the container at build time, so you can run them directly without copying files.

### Method 1: Run JavaScript Scripts (Recommended - No TypeScript compilation needed)

**Available scripts:**
- `diagnose-admin.js` - Check admin user status and password verification
- `verify-admin.ts` - Verify admin authentication
- `verify-auth.ts` - Verify authentication flows
- `verify-constraints.ts` - Verify database constraints
- `verify-error-mapping.ts` - Verify error handling
- `verify-member-card.ts` - Verify member card functionality
- `verify-modules.ts` - Verify API modules
- `verify-tx.ts` - Verify transactions
- `test_api_create.ts` - Test API creation

**Run diagnostic scripts:**

1. **SSH into your VPS:**
   ```bash
   ssh user@your-vps-ip
   ```

2. **Navigate to the deployment directory:**
   ```bash
   cd ~/loyalty-pwa
   ```

3. **Run the JavaScript diagnostic (scripts are already in container):**
   ```bash
   docker compose exec api node diagnose-admin.js
   ```

**Run TypeScript scripts:**

For TypeScript scripts, you'll need `tsx` (already available in dev, install temporarily in prod):

```bash
# Install tsx temporarily (one-time)
docker compose exec api pnpm add -D tsx

# Run TypeScript scripts
docker compose exec api pnpm tsx verify-admin.ts
docker compose exec api pnpm tsx verify-auth.ts
# ... etc
```

**Note:** After rebuilding the container, all scripts will be available. No need to copy files manually!

### Method 2: Use Prisma Studio (Interactive)

1. **SSH into VPS and navigate to deployment directory:**
   ```bash
   ssh user@your-vps-ip
   cd ~/loyalty-pwa
   ```

2. **Run Prisma Studio (exposes on port 5555):**
   ```bash
   docker compose exec -p 5555:5555 api pnpm db:studio
   ```

3. **Access from your local machine:**
   - Forward port 5555 via SSH: `ssh -L 5555:localhost:5555 user@your-vps-ip`
   - Open browser: `http://localhost:5555`
   - Navigate to `AdminUser` table to inspect admin users

### Method 3: Direct Database Query (Quick Check)

1. **SSH into VPS:**
   ```bash
   ssh user@your-vps-ip
   cd ~/loyalty-pwa
   ```

2. **Run a direct Prisma query via Node:**
   ```bash
   docker compose exec api node -e "
   const { PrismaClient } = require('@prisma/client');
   const prisma = new PrismaClient();
   (async () => {
     const admins = await prisma.adminUser.findMany({
       select: { email: true, status: true, role: true, created_at: true }
     });
     console.log('Admin Users:', JSON.stringify(admins, null, 2));
     await prisma.\$disconnect();
   })();
   "
   ```

### Method 4: Scripts Are Already Included

All diagnostic scripts are automatically included in the container build. The Dockerfile copies:
- `diagnose-admin.js` and `diagnose-admin.ts`
- All `verify-*.ts` scripts
- `test_api_create.ts`

After rebuilding the container, scripts are immediately available:
```bash
docker compose build api
docker compose up -d api

# Then run directly:
docker compose exec api node diagnose-admin.js
```

## Other Useful Production Commands

### Check API Logs
```bash
docker compose logs -f api
```

### Check Admin Login Attempts
```bash
docker compose logs api | grep -i "AdminAuth\|AdminService\|login"
```

### Run Database Seed (if needed)
```bash
docker compose exec api pnpm db:seed
```

### Run Migrations
```bash
docker compose exec api pnpm db:deploy
```

### Quick Diagnostic Commands

All scripts are available in the container:

```bash
# Admin diagnostics
docker compose exec api node diagnose-admin.js

# Verify admin auth
docker compose exec api pnpm tsx verify-admin.ts

# Verify all modules
docker compose exec api pnpm tsx verify-modules.ts

# Test API creation
docker compose exec api pnpm tsx test_api_create.ts
```

### Access Database Directly (via pgAdmin or psql)
```bash
# Using psql from db container
docker compose exec db psql -U loyalty_app -d loyalty

# Then run SQL queries:
# SELECT email, status, role, created_at FROM admin_users;
```
