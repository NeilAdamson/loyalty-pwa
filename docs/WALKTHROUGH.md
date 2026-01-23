# Walkthrough - Milestone 5: Admin Portal

**Goal**: Verify the new Backoffice features for Platform Admins.

## Prerequisites
- Services running: `docker compose up -d`
- Admin User Seeded: `admin@loyalty.com` / `password123`

## 1. Accessing Admin Portal

1. Open http://localhost:5173/admin/login
2. Login with credentials:
   - **Email**: `admin@loyalty.com`
   - **Password**: `password123`
3. You should be redirected to `/admin` (Dashboard).
4. Verify "Welcome, Super Admin" or similar text.

## 2. Vendor Management

1. Click **Vendors** in sidebar.
2. Verify list of existing vendors (seeded in M1/M2).
3. Click **+ New Vendor**.
4. Fill form:
   - **Legal Name**: `New Test Corp`
   - **Trading Name**: `New Cafe`
   - **Slug**: `new-cafe`
   - **Email**: `billing@newcafe.com`
5. Click **Create**.
6. Verify redirect to Vendor List and `New Cafe` appears in the table.
7. Verify status is `ACTIVE`.

## 3. Member Management

1. Click **Members** in sidebar.
2. Verify list of members.
3. (Optional) Check Database to see `status` column on `members` table is present.

## 4. Security Check (Cookie)

1. Open DevTools -> Application -> Cookies.
2. Verify `admin_token` exists and is `HttpOnly` (if browser allows seeing it, or check Network tab request headers).
3. Click **Logout**.
4. Verify cookie is removed or you are redirected to login.

## 5. Database Management (pgAdmin)

1. Open http://localhost:5050
2. Login with:
   - **Email**: `admin@admin.com`
   - **Password**: `root`
3. Add New Server:
   - **Name**: `LoyaltyDB`
   - **Connection** -> **Host name/address**: `db`
   - **Port**: `5432`
   - **Username**: `postgres`
   - **Password**: `postgres`
   - **Save**.
4. You can now browse tables under `Databases -> loyalty -> Schemas -> public -> Tables`.
