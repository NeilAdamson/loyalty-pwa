# Walkthrough - Milestone 5 + 6: Admin Portal & Public UI

**Goal**: Verify the new Backoffice features and the updated Member/Staff authentication flows.

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
5. **Dashboard Stats**: Verify "Active Vendors" and "Total Members" show numbers > 0 (if data exists).

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
8. (Note: Valid Slug characters are alphanumeric and hyphens).

## 3. Member Management

1. Click **Members** in sidebar.
2. Verify list of members.
3. Verify table columns: Name, Phone, Vendor, Status, Joined Date.
4. Verify empty state if no members are found.

## 4. Public Authentication Flows (Milestone 6)

### Member Login
1. Navigate to `http://localhost:5173/v/new-cafe` (or any existing vendor slug).
2. It should redirect to `/v/new-cafe/login`.
3. Verify the **AuthShell** UI (Dark theme, centered card).
4. Enter phone number -> Request OTP -> Enter OTP -> Login.

### Staff Login
1. Navigate to `http://localhost:5173/v/new-cafe/staff`.
2. Verify the **Staff Login** UI (same theme as Member).
3. Enter Username (e.g. `alice`) and PIN (e.g. `1234`) -> Login.

## 5. Security & Troubleshooting

### Security Check (Cookie)
1. Open DevTools -> Application -> Cookies.
2. Verify `admin_token` exists and is `HttpOnly`.
3. Click **Logout**.
4. Verify cookie is removed.

### Troubleshooting
- **Blank Screen / 404**: Check Docker logs `docker compose logs -f api`.
- **CORS Errors**: Ensure you are accessing via `localhost:5173` not `127.0.0.1` if cookies are failing, or vice versa depending on config.
