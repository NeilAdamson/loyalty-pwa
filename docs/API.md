# API Documentation

Base URL: `https://loyaltyladies.com/api` (Production) or `http://localhost:8000` (Local). All tenant and transaction endpoints are under `/api/v1` (e.g. `/api/v1/tx/stamp`). Note: The Tech Spec examples use `/api/v1/staff/stamp` and `/api/v1/staff/redeem`; the implementation uses `/api/v1/tx/stamp` and `/api/v1/tx/redeem` as the single source of truth.

## Health
**GET /health** (no auth)  
Returns: `{ "status": "ok", "timestamp": "...", "otp_provider": "smsflow", "otp_configured": true|false }`.  
OTP delivery uses SMSFlow only. Configure `SMSFLOW_CLIENT_ID`, `SMSFLOW_CLIENT_SECRET`, and optional `SMSFLOW_SENDER_ID`.  
If SMSFlow is not fully configured, OTP is logged only for local testing (check API container logs for the code).

## Error Handling
Standard Error Envelope:
```json
{
  "code": "ERROR_CODE",
  "message": "Human readable message",
  "details": {} // Optional validation details
}
```

### Common Error Codes
| Code | Status | Description |
| :--- | :--- | :--- |
| `VALIDATION_ERROR` | 400 | Invalid request body or params |
| `NOT_FOUND` | 404 | Resource not found |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |
| `VENDOR_SUSPENDED` | 403 | Vendor account is not active |
| `STAFF_DISABLED` | 403 | Staff account is disabled |
| `OTP_INVALID` | 400 | Invalid or expired OTP |
| `OTP_RATE_LIMITED` | 429 | Too many OTP attempts |
| `STAFF_PIN_INVALID` | 401 | Invalid PIN |
| `TOKEN_REPLAYED` | 409 | Token has already been used |
| `CARD_ALREADY_ACTIVE` | 409 | Member already has an active card |
| `CARD_FULL` | 400 | Card is full, ready to redeem |
| `CARD_NOT_ELIGIBLE` | 400 | Card not eligible for action (e.g. not enough stamps) |
| `RATE_LIMITED` | 429 | Request rate limit exceeded (e.g. stamping too fast) |

## Authentication

### Authentication Methods
The API uses different authentication methods depending on the route:
- **Platform Admin routes** (`/api/v1/admin/*`): Use HttpOnly cookies (set via `POST /api/v1/admin/auth/login`)
- **Vendor Admin routes** (`/api/v1/v/:slug/admin/*`): Use Bearer tokens in `Authorization` header
- **Member/Staff routes**: Use Bearer tokens in `Authorization` header

**Important**: The frontend API client automatically injects Bearer tokens for all routes except platform admin routes. Vendor admin routes (`/v/:slug/admin/*`) require Bearer tokens, not cookies.

### Member Auth
**1. Request OTP**
`POST /v/:vendorSlug/auth/member/otp/request`
Body: `{ "phone": "+1234567890" }`

**2. Verify OTP**
`POST /v/:vendorSlug/auth/member/otp/verify`
Body: `{ "phone": "+1234567890", "code": "123456", "consent_marketing": false }`
Returns: `{ "token": "JWT", "member": { ... } }`
If `consent_marketing` is `true`, the member is opted in to manually triggered reward reminders/offers for that vendor.

### Staff Auth
**1. Staff Login**
`POST /v/:vendorSlug/auth/staff/login`
Body: `{ "username": "alice", "pin": "1234" }`
Returns: `{ "token": "JWT", "staff": { ... } }`
- `staff.role` is `STAMPER` for scanner-only access, or `ADMIN` for vendor-admin access.

### Vendor Admin Auth
Vendor owners/managers authenticate with email + password. Legacy staff users with `role: "ADMIN"` may still access vendor-admin endpoints after staff PIN login.

**Start self-service registration**
`POST /api/v1/vendor/register/start`
Body:
```json
{
  "email": "owner@example.com",
  "first_name": "Jane",
  "last_name": "Owner",
  "trading_name": "Demo Cafe",
  "legal_name": "Demo Cafe Pty Ltd",
  "contact_phone": "+27821234567"
}
```
Returns a `registration_id`; the API emails a 6-digit code.

**Verify registration code**
`POST /api/v1/vendor/register/verify`
Body: `{ "registration_id": "...", "code": "123456" }`

**Complete registration**
`POST /api/v1/vendor/register/complete`
Body:
```json
{
  "registration_id": "...",
  "vendor_slug": "demo-cafe",
  "password": "minimum8chars"
}
```
Creates the vendor, owner admin account, default branch, default branding, and default loyalty program. Returns `{ token, vendor_admin, vendor }`.

**Vendor admin login**
`POST /api/v1/vendor/auth/login`
Body: `{ "email": "owner@example.com", "password": "..." }`
Returns `{ token, vendor_admin, vendor }`.

**Vendor admin password reset**
- `POST /api/v1/vendor/auth/forgot-password` — Body: `{ "email": "owner@example.com" }`
- `POST /api/v1/vendor/auth/reset-password` — Body: `{ "token": "...", "password": "minimum8chars" }`

**Current vendor admin session**
`GET /api/v1/vendor-admin/me`
Returns the active vendor admin or legacy staff-admin identity.

**Note**: Vendor admin routes are under `/api/v1/v/:slug/admin/*` and require Bearer token authentication (not cookies).

## Member Experience (Protected: Member)

### Get Active Card
**GET /me/card**
Headers: `Authorization: Bearer <MemberToken>`
Returns:
```json
{
  "card": { "card_id": "...", "stamps_count": 0, "status": "ACTIVE", ... },
  "token": "ROTATING_JWT_TOKEN",
  "expires_in_seconds": 30,
  "vendor": {
      "trading_name": "...",
      "branding": { ... }
  }
}
```

## Transactions (Protected: Staff)

All transaction endpoints use the path prefix **`/api/v1/tx/`** (not `/api/v1/staff/`).

### Stamp Card
**POST /api/v1/tx/stamp**
Headers: `Authorization: Bearer <StaffToken>`
Body: `{ "token": "ROTATING_JWT_TOKEN" }`
Returns:
```json
{
  "success": true,
  "new_count": 1,
  "stamps_required": 10,
  "is_full": false
}
```
- `stamps_required`: from the card’s program (for UX: “X / Y stamps”).
- `is_full`: `true` when card is ready to redeem.

### Redeem Card
**POST /api/v1/tx/redeem**
Headers: `Authorization: Bearer <StaffToken>`
Body: `{ "token": "ROTATING_JWT_TOKEN" }`
Returns:
```json
{
  "success": true,
  "redeemed_card_id": "...",
  "new_card": { "card_id": "...", "status": "ACTIVE", "stamps_count": 0 }
}
```

## Resources

### Vendors
**Get My Profile** (Protected: Vendor Admin)
`GET /vendors/me`

**Get Public Profile** (Public)
`GET /v/:vendorSlug/public`

### Programs
**Create Draft** (Protected: Vendor Admin)
`POST /programs`
Headers: `Authorization: Bearer <VendorAdminToken>`

**Activate Program** (Protected: Vendor Admin)
`PUT /programs/:id/activate`
Headers: `Authorization: Bearer <VendorAdminToken>`

**Get Active Program** (Public)
`GET /v/:vendorSlug/programs/active`

### Vendor Program (Protected: Vendor Admin)
All vendor program endpoints are under `/api/v1/v/:slug/admin/program` and require Bearer token authentication.

**Get Program**
`GET /api/v1/v/:slug/admin/program`

Returns:
```json
{
  "active_program": {
    "program_id": "...",
    "version": 2,
    "is_active": true,
    "stamps_required": 10,
    "reward_title": "Free Coffee",
    "reward_description": "Get a free black coffee.",
    "terms_text": "One redemption per full card.",
    "created_at": "...",
    "cards_count": 12
  },
  "history": []
}
```

**Publish New Program Version**
`PUT /api/v1/v/:slug/admin/program`

Body:
```json
{
  "stamps_required": 10,
  "reward_title": "Free Coffee",
  "reward_description": "Get a free black coffee.",
  "terms_text": "One redemption per full card."
}
```

Rules:
- `stamps_required` must be a whole number from 2 to 30.
- Program text fields are required.
- Saving changed values creates a new active program version.
- Existing active cards remain tied to their original program version.
- A `PROGRAM_VERSION_CREATE` audit record is written when a new version is created.

### Vendor Branding (Protected: Vendor Admin)
All branding endpoints are under `/api/v1/v/:slug/admin/branding` and require Bearer token authentication.

### Branding Image Uploads (Protected: Platform Admin or Vendor Admin)
**Upload branding image**
`POST /api/v1/uploads`

Auth:
- Platform admin HttpOnly cookie, or
- Vendor admin Bearer token with `role: "ADMIN"`

Accepts multipart form data with a single `file` field. Server-side limits:
- Maximum size: 5 MB
- Allowed types: JPEG, PNG, WebP, AVIF
- The stored filename is server-generated; the original filename is not trusted.

Returns:
```json
{ "url": "https://.../uploads/branding/{scope}/{file}" }
```

**Get Branding**
`GET /api/v1/v/:slug/admin/branding`
Headers: `Authorization: Bearer <VendorAdminToken>`
Returns: Branding object with colors, logo, wordmark, etc.

**Update Branding**
`PUT /api/v1/v/:slug/admin/branding`
Headers: `Authorization: Bearer <VendorAdminToken>`
Body:
```json
{
  "primary_color": "#000000",
  "secondary_color": "#ffffff",
  "accent_color": "#3B82F6",
  "background_color": "#18181b",
  "card_text_color": "#ffffff",
  "card_style": "SOLID",
  "logo_url": "https://...",
  "wordmark_url": "https://...",
  "welcome_text": "Welcome to..."
}
```

**Field Requirements:**
- `primary_color` and `secondary_color` are required (defaults provided: `#000000` and `#ffffff` if missing)
- `accent_color`, `card_text_color`, and `card_style` have defaults (`#3B82F6`, `#ffffff`, `SOLID`)
- All other fields are optional

**Error Responses:**
- `401 UNAUTHORIZED`: Missing or invalid Bearer token
- `403 FORBIDDEN`: User is not a vendor admin
- `500 INTERNAL_SERVER_ERROR`: Server error (check logs for details)

### Vendor Analytics & Business Settings (Protected: Vendor Admin)
All vendor analytics endpoints are under `/api/v1/v/:slug/admin/*` and require `Authorization: Bearer <VendorAdminToken>`.

**Get Business Settings**
`GET /api/v1/v/:slug/admin/business`

Returns vendor business profile including analytics config fields:
- `trading_name`
- `vendor_slug`
- `legal_name`
- contact and billing fields
- first branch details in `branches`
- `average_visit_value`
- `reward_cost`

**Update Business Settings**
`PUT /api/v1/v/:slug/admin/business`

Body:
```json
{
  "trading_name": "Demo Cafe",
  "legal_name": "Demo Cafe Pty Ltd",
  "contact_name": "Jane",
  "contact_surname": "Owner",
  "contact_phone": "+27821234567",
  "billing_email": "accounts@example.com",
  "billing_address": "1 Main Road",
  "tax_id": "optional",
  "company_reg_no": "optional",
  "branch_name": "Main Branch",
  "branch_address_text": "1 Main Road",
  "branch_city": "Cape Town",
  "branch_region": "Western Cape",
  "average_visit_value": 85.00,
  "reward_cost": 25.00
}
```

Rules:
- `average_visit_value` and `reward_cost` must be positive numbers when supplied.
- Values can be edited by vendor admin and apply to subsequent analytics reads.

**Onboarding**
- `GET /api/v1/v/:slug/admin/onboarding/status`
- `POST /api/v1/v/:slug/admin/onboarding/complete`

**Dashboard Metrics**
`GET /api/v1/v/:slug/admin/metrics`

Returns:
- Member metrics: `total_members`, `new_members_30d`, `active_members_30d`
- Stamp metrics: `total_stamps_current_month`, `total_stamps_previous_month`, `total_stamps_30d`
- Redemption metrics: `total_redemptions_current_month`, `total_redemptions_previous_month`
- Completion & timing: `card_completion_rate`, `average_time_to_reward_days`
- Estimated value: `estimated_revenue_current_month`, `total_reward_cost_current_month`, `estimated_roi_ratio`, `estimated_roi_label`
- Behavioral insights: `behavior_insights.stamps_by_day`, `behavior_insights.stamps_by_time_bucket`
- Customer insights: `customer_insights.top_customers_30d`, `customer_insights.at_risk_customers_30d`, `customer_insights.near_reward_customers`
- Staff insights: `staff_activity[]` with `stamps_issued` and `redemptions_processed`

**Behavior Insights**
`GET /api/v1/v/:slug/admin/insights/behavior`

Returns stamp distributions for rolling 30 days:
- `stamps_by_day`
- `stamps_by_time_bucket` (`AM`, `PM`, `Evening`)

**Customer Insights**
`GET /api/v1/v/:slug/admin/insights/customers`

Returns:
- `top_customers_30d`
- `at_risk_customers_30d`
- `near_reward_customers`

**Staff Insights**
`GET /api/v1/v/:slug/admin/insights/staff`

Returns per-staff aggregates:
- `stamps_issued`
- `redemptions_processed`

**Manual Nudge Preview**
`GET /api/v1/v/:slug/admin/nudges/preview?audience=NEAR_REWARD`

Supported audiences:
- `NEAR_REWARD` — active cards 1-2 stamps from a reward
- `AT_RISK_30D` — active members with no activity in the last 30 days

Returns recipient counts, consent exclusions, invalid phone exclusions, a default message template, estimated SMS segments, and sample recipients. No messages are sent by this endpoint.

**Manual Nudge Send**
`POST /api/v1/v/:slug/admin/nudges/send`

Body:
```json
{
  "audience": "NEAR_REWARD",
  "message": "Hi {name}, you are only {stamps_remaining} stamp(s) away from your {reward} at {vendor}. Reply STOP to opt out.",
  "confirm": true,
  "expected_recipient_count": 12
}
```

Rules:
- Sends only after explicit `confirm: true`.
- Sends only to members with `consent_marketing = true`.
- Rejects if the current recipient count differs from `expected_recipient_count`.
- Manual sends are limited to 200 recipients per batch and 5 batches per vendor per UTC day.
- Every send attempt is written to `admin_audit_log`.

### Platform Admin
**Create Vendor**
`POST /api/v1/admin/vendors`
Body: `{ legal_name, trading_name, vendor_slug, contact_name, contact_surname, contact_phone, billing_email, monthly_billing_amount, billing_start_date, ... }`

Validation (400): Returns `{ code: "VALIDATION_ERROR", message, details: { field: "error message" } }` for missing/invalid fields.

**Delete Vendor**
`DELETE /api/v1/admin/vendors/:id`

### Admin Users (Platform)
Admin users have username-based email addresses restricted to the `@punchcard.co.za` domain.

- **List admins**: `GET /api/v1/admin/users` — Returns `{ admins: [{ admin_id, username, email, first_name, last_name, name, role, status, created_at, last_login_at }] }`
  - `name` is computed as `{first_name} {last_name}` for backward compatibility
- **Create admin**: `POST /api/v1/admin/users` — Body: `{ username, first_name, last_name, password, role? }`. Role: `SUPPORT` | `SUPER_ADMIN`.
  - Email is auto-generated as `{username}@punchcard.co.za`
  - Username must be alphanumeric with optional dots/hyphens (e.g., `judy`, `john.smith`)
- **Get admin (for edit)**: `GET /api/v1/admin/users/:id` — Returns `{ admin }` (no password). 404 if not found.
- **Update admin**: `PATCH /api/v1/admin/users/:id` — Body: `{ first_name?, last_name?, role?, status?, password? }`. 
  - `username` and `email` are immutable after creation
  - Leave `password` blank to keep current. Cannot disable own account (400).

### Admin Password Reset
- **Request reset**: `POST /api/v1/admin/auth/forgot-password` — Body: `{ email }`.
  - Sends password reset email to the admin's `@punchcard.co.za` address
  - Always returns success (to prevent email enumeration)
- **Reset password**: `POST /api/v1/admin/auth/reset-password` — Body: `{ token, password }`.
  - Token expires after 1 hour
  - Returns 400 if token is invalid or expired

### Vendor Staff (Platform Admin)
- **List staff**: `GET /api/v1/admin/vendors/:id/staff`
- **Create staff**: `POST /api/v1/admin/vendors/:id/staff` — Body: `{ name, username, pin, role?, branch_id? }`
- **Update staff**: `PATCH /api/v1/admin/vendors/:id/staff/:staffId` — Body: `{ name?, username?, pin?, role?, branch_id?, status? }`. Leave `pin` blank to keep current PIN.
- **Reset PIN**: `PATCH /api/v1/admin/vendors/:id/staff/:staffId/pin` — Body: `{ pin }`
- **Delete staff**: `DELETE /api/v1/admin/vendors/:id/staff/:staffId`
