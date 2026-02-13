# Implementation Plan - Milestone 5: Admin Portal

## Goal Description
Create a secure, functional "Backoffice" for Platform Admins to manage Vendors, Members, and Staff without direct DB access. Features detailed searching, suspension, and billing data management.

## Confirmed Decisions
*   **Auth**: Platform Admins use Email/Password + HttpOnly Cookie. (Separated from header-based Member/Staff auth).
*   **Structure**: `/admin` routes within the existing `apps/web` PWA.
*   **Styling**: Vanilla CSS (consistent with M4).
*   **Role**: Simple `role` string on `AdminUser` ('SUPER_ADMIN', 'ADMIN', 'READ_ONLY').

## Proposed Changes

### Database (`schema.prisma`)
#### [MODIFY] [apps/api/prisma/schema.prisma](file:///d:/loyalty-pwa/apps/api/prisma/schema.prisma)
- Add `AdminUser` model:
    - `admin_id` (UUID)
    - `email` (Unique)
    - `password_hash`
    - `role` (String)
    - `name` (String)
    - `created_at`
- Add billing fields to `Vendor` (if missing or needing expansion):
    - `billing_email`, `billing_address`, `tax_id`, `company_reg_no`.
    - `contact_name`, `contact_phone`, `contact_role`.

### Backend (`apps/api`)
#### [NEW] Dependencies
- `fastify-cookie`: For secure admin sessions.

#### [NEW] Admin Auth Module
- `POST /admin/auth/login`: Validate email/pass -> Set HttpOnly Cookie (JWT).
- `POST /admin/auth/logout`: Clear cookie.
- `GET /admin/auth/me`: Validate cookie -> Return Admin Info.

#### [NEW] Admin Routes (`/admin/api`)
- `GET /admin/api/vendors`: List with filters (search, status).
- `POST /admin/api/vendors`: Create Vendor (Manual Onboarding).
- `GET /admin/api/vendors/:id`: Get full details (including stats).
- `PATCH /admin/api/vendors/:id`: Update details or Suspend/Activate.
- `GET /admin/api/members`: Global Search (by phone).
- `PATCH /admin/api/members/:id`: Suspend/Activate.
- `GET /admin/api/audit`: View logs (if time permits).

### Frontend (`apps/web`)
#### [NEW] Admin Context
- `AdminAuthContext`: Manages Admin User state (separate from Member/Staff `AuthContext` to avoid pollution).

#### [NEW] Layout & Pages
- `AdminLayout`: Sidebar (Vendors, Members, Settings) + Header.
- `AdminLoginPage`: Email/Password form.
- `AdminVendorList`: Table with search/filter.
- `AdminVendorDetail`: Tabs (Overview, Branding, Staff, etc.).
- `AdminMemberList`: Search + Actions.
#### [MODIFY] [AdminVendorCreate.tsx](file:///d:/loyalty-pwa/apps/web/src/pages/admin/AdminVendorCreate.tsx)
- Add inputs for City and Region.

## Verification Plan
### Automated
- `verify:admin-auth`: Test login/logout and cookie behavior.
- `verify:admin-vendor`: Test Create/Suspend vendor.

### Manual
- Login as `admin@punchcard.co.za`.
- Create a new Vendor "Test Cafe".
- Verify "Test Cafe" exists in DB.
- Suspend a Member. Use Member App to try login -> Should Fail (or 403).
### Automated Tests
- N/A (Manual test)

### Manual Verification
- Create new vendor, verify branch has city/region.
- Check existing vendors (run backfill script).
- Verify "Test Cafe" exists in DB.
- Suspend a Member. Use Member App to try login -> Should Fail (or 403).
