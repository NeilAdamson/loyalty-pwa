# API Documentation

Base URL: `https://loyaltyladies.com/api` (Production) or `http://localhost:8000` (Local). All tenant and transaction endpoints are under `/api/v1` (e.g. `/api/v1/tx/stamp`). Note: The Tech Spec examples use `/api/v1/staff/stamp` and `/api/v1/staff/redeem`; the implementation uses `/api/v1/tx/stamp` and `/api/v1/tx/redeem` as the single source of truth.

## Health
**GET /health** (no auth)  
Returns: `{ "status": "ok", "timestamp": "...", "twilio_configured": true|false }`.  
Use `twilio_configured` to verify Twilio WhatsApp OTP is enabled. If `false`, OTP is logged only (no Twilio call); set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` in `.env` and restart the API.

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

### Member Auth
**1. Request OTP**
`POST /v/:vendorSlug/auth/member/otp/request`
Body: `{ "phone": "+1234567890" }`

**2. Verify OTP**
`POST /v/:vendorSlug/auth/member/otp/verify`
Body: `{ "phone": "+1234567890", "code": "123456" }`
Returns: `{ "token": "JWT", "member": { ... } }`

### Staff Auth
**1. Staff Login**
`POST /v/:vendorSlug/auth/staff/login`
Body: `{ "username": "alice", "pin": "1234" }`
Returns: `{ "token": "JWT", "staff": { ... } }`

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

**Activate Program** (Protected: Vendor Admin)
`PUT /programs/:id/activate`

**Get Active Program** (Public)
`GET /v/:vendorSlug/programs/active`

### Platform Admin
**Create Vendor**
`POST /api/v1/admin/vendors`
Body: `{ legal_name, trading_name, vendor_slug, contact_name, contact_surname, contact_phone, billing_email, monthly_billing_amount, billing_start_date, ... }`

Validation (400): Returns `{ code: "VALIDATION_ERROR", message, details: { field: "error message" } }` for missing/invalid fields.

**Delete Vendor**
`DELETE /api/v1/admin/vendors/:id`

### Admin Users (Platform)
- **List admins**: `GET /api/v1/admin/users` — Returns `{ admins: [{ admin_id, email, name, role, status, created_at, last_login_at }] }`
- **Create admin**: `POST /api/v1/admin/users` — Body: `{ name, email, password, role? }`. Role: `SUPPORT` \| `SUPER_ADMIN`.
- **Get admin (for edit)**: `GET /api/v1/admin/users/:id` — Returns `{ admin }` (no password). 404 if not found.
- **Update admin**: `PATCH /api/v1/admin/users/:id` — Body: `{ name?, email?, role?, status?, password? }`. Leave `password` blank to keep current. Cannot disable own account (400).

### Vendor Staff (Platform Admin)
- **List staff**: `GET /api/v1/admin/vendors/:id/staff`
- **Create staff**: `POST /api/v1/admin/vendors/:id/staff` — Body: `{ name, username, pin, role?, branch_id? }`
- **Update staff**: `PATCH /api/v1/admin/vendors/:id/staff/:staffId` — Body: `{ name?, username?, pin?, role?, branch_id?, status? }`. Leave `pin` blank to keep current PIN.
- **Reset PIN**: `PATCH /api/v1/admin/vendors/:id/staff/:staffId/pin` — Body: `{ pin }`
- **Delete staff**: `DELETE /api/v1/admin/vendors/:id/staff/:staffId`
