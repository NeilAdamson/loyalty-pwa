# API Documentation

Base URL: 	`https://loyaltyladies.com/api` (Production) or `http://localhost:8000` (Local)

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
Body: `{ "staff_id": "uuid", "pin": "1234" }`
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

### Stamp Card
**POST /tx/stamp**
Headers: `Authorization: Bearer <StaffToken>`
Body: `{ "token": "ROTATING_JWT_TOKEN" }`
Returns: `{ "success": true, "new_count": 1 }`

### Redeem Card
**POST /tx/redeem**
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
**Delete Vendor**
`DELETE /api/v1/admin/vendors/:id`
