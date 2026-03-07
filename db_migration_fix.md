# Resolving the P3018 Database Migration Error

The error `P3018: could not create unique index "admin_users_username_key"` means your recent schema change added a `@unique` constraint to the `username` field on the `AdminUser` table. 

However, your production database already contains **multiple rows** where the `username` is exactly `admin`. Postgres cannot apply a unique constraint when duplicates already exist.

### How to Fix This in Production

To fix this, you will need to SSH into your VPS, connect directly to the Postgres database, and either rename or delete the duplicate `admin` users before re-running the migration.

1. **SSH into your VPS** and navigate to your project directory:
   ```bash
   cd ~/loyalty-pwa
   ```

2. **Connect to the database container** using `psql`. Based on your `docker-compose.yml`, the database is named `loyalty` and the default user is `loyalty_app`:
   ```bash
   docker compose exec db psql -U loyalty_app -d loyalty
   ```

3. **Check the duplicate users**:
   Because the migration failed, it completely rolled back, meaning the `username` column doesn't exist yet! We need to query based on the `email` prefix instead:
   ```sql
   SELECT admin_id, email, name, created_at FROM admin_users WHERE email LIKE 'admin@%';
   ```

4. **Resolve the duplicates**. You have two choices: 
   
   **Option A: Rename the older/duplicate ones** (Safer if you want to keep them):
   ```sql
   -- This renames the email prefixes so they don't generate duplicate usernames
   UPDATE admin_users 
   SET email = 'admin_' || substring(admin_id::text from 1 for 6) || substring(email from position('@' in email))
   WHERE email LIKE 'admin@%' 
   AND admin_id NOT IN (
       SELECT admin_id FROM admin_users WHERE email LIKE 'admin@%' ORDER BY created_at DESC LIMIT 1
   );
   ```

   **Option B: Delete the older/duplicate ones**:
   ```sql
   DELETE FROM admin_users 
   WHERE email LIKE 'admin@%' 
   AND admin_id NOT IN (
       SELECT admin_id FROM admin_users WHERE email LIKE 'admin@%' ORDER BY created_at DESC LIMIT 1
   );
   ```

5. **Exit psql**:
   ```sql
   \q
   ```

### Resolving the P3009 Migration Failed State
If you already attempted the migration and it failed, you will get a `P3009` error indicating the database is in a failed migration state. 

Because the migration we are fixing completely rolls back on failure, it is safe to tell Prisma that the migration was "rolled back", which allows it to try again cleanly.

1. **Run the Prisma resolve command via the API container:**
   ```bash
   docker compose run --rm api pnpm prisma migrate resolve --rolled-back 20260307_admin_user_schema_update
   ```

2. **Re-run the deployment script**, which will now successfully apply the migration:
   ```bash
   ./deploy.sh full
   ```
