# Running Diagnostics in Production

## Running the Admin Diagnostic Script

The `diagnose-admin.ts` script can be run in production to check admin user status and password verification.

### Method 1: Copy JavaScript Script and Run (Recommended - No TypeScript needed)

1. **SSH into your VPS:**
   ```bash
   ssh user@your-vps-ip
   ```

2. **Navigate to the deployment directory:**
   ```bash
   cd ~/loyalty-pwa
   ```

3. **Copy the JavaScript diagnostic script into the API container:**
   ```bash
   docker compose cp apps/api/diagnose-admin.js api:/app/diagnose-admin.js
   ```

4. **Run the diagnostic (no compilation needed):**
   ```bash
   docker compose exec api node diagnose-admin.js
   ```

**Alternative: If you prefer TypeScript version:**

3. **Copy the TypeScript script:**
   ```bash
   docker compose cp apps/api/diagnose-admin.ts api:/app/diagnose-admin.ts
   ```

4. **Install tsx temporarily:**
   ```bash
   docker compose exec api pnpm add -D tsx
   ```

5. **Run:**
   ```bash
   docker compose exec api pnpm tsx diagnose-admin.ts
   ```

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

### Method 4: Add Script to Container Build (Permanent)

If you want the script always available, modify `apps/api/Dockerfile`:

```dockerfile
FROM base AS prod
WORKDIR /app
COPY package.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY diagnose-admin.ts ./diagnose-admin.ts  # Add this line

ENV NODE_ENV=production
CMD ["node", "dist/server.js"]
```

Then rebuild:
```bash
docker compose build api
docker compose up -d api
```

Then run:
```bash
docker compose exec api pnpm tsx diagnose-admin.ts
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

### Access Database Directly (via pgAdmin or psql)
```bash
# Using psql from db container
docker compose exec db psql -U loyalty_app -d loyalty

# Then run SQL queries:
# SELECT email, status, role, created_at FROM admin_users;
```
