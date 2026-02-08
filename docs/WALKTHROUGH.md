# Walkthrough - Milestone 5 + 6: Admin Portal & Public UI

**Goal**: Verify the new Backoffice features and the updated Member/Staff authentication flows.

## Prerequisites
- Services running: `.\dev.ps1 up -d --build` (or `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build`)
- Database initialized: `.\dev.ps1 exec api pnpm db:deploy` and `.\dev.ps1 exec api pnpm db:seed`
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
4. You should be redirected to `/v/new-cafe/staff/scan` (vendor-styled scan screen).

### Staff Scan (Vendor Staff Portal)
1. On `/v/:slug/staff/scan`, verify vendor branding (logo/wordmark, colours, background) matches the member screen for that vendor.
2. Verify two modes: **Add stamp** (default) and **Redeem reward** (toggle before scanning).
3. **Add stamp**: Scan a member’s rotating QR (e.g. from `/me/card`). Verify success message “Stamped! X / Y” and **Scan next** to continue.
4. If the card is full after a stamp: verify “Card is full — ready to redeem.” and the **Redeem reward** button; click it, then **Scan next**.
5. **Redeem reward**: Select “Redeem reward”, then scan a full card’s QR. Verify “Redeemed! New card created.” and **Scan next**.
6. Verify **Sign Out** in the header and that the scanner area is large and easy to use (not small/hard to navigate).

## 5. Security & Troubleshooting

### Security Check (Cookie)
1. Open DevTools -> Application -> Cookies.
2. Verify `admin_token` exists and is `HttpOnly`.
3. Click **Logout**.
4. Verify cookie is removed.

### Troubleshooting
- **Blank Screen / 404**: Check Docker logs: `.\dev.ps1 logs -f api` (or `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f api`).
- **CORS Errors**: Ensure you are accessing via `localhost:5173` not `127.0.0.1` if cookies are failing, or vice versa depending on config.
