# Security — WebAuthn, sessions, and operational baseline

This document complements `docs/ARCHITECTURE.md` and `docs/TECH-SPEC.md` with **security-specific** guidance. It is the canonical place for **passkey / WebAuthn** deployment rules.

## 1. HTTPS and transport

- All production traffic MUST be served over HTTPS with HSTS (see Architecture).
- WebAuthn **requires** a secure context in browsers (`https://` or `http://localhost` for local dev).

## 2. WebAuthn / passkeys

### 2.1 Roles

- **Members**: SMS OTP proves phone possession on first use (or new device). Passkeys are optional for faster repeat login.
- **Staff**: Username + PIN proves knowledge on first use (or new device). Passkeys are optional for faster repeat login.
- **Vendor admins** and **platform admins** do not use this passkey flow in the current implementation.

### 2.2 Relying Party (RP) configuration

Set these environment variables on the API (see `docs/TECH-SPEC.md` §12 and `.env.example`):

| Variable | Purpose |
|----------|---------|
| `WEBAUTHN_RP_ID` | RP ID = **public DNS hostname only**, no path, no port. Example: `punchcard.co.za`. Local dev: `localhost`. |
| `WEBAUTHN_RP_NAME` | Display name in the authenticator UI. |
| `WEBAUTHN_ORIGIN` | Comma-separated list of allowed **full origins** (scheme + host + port) for assertions/attestation. Must include every URL users use to open the PWA (e.g. `https://punchcard.co.za` and `https://www.punchcard.co.za` if both exist). |

If any of these variables are **unset or invalid**, the API process still boots and non-passkey authentication continues to work; passkey-only HTTP handlers respond with **503** and `PASSKEY_NOT_SUPPORTED` until configuration is fixed.

**Critical**: Changing `WEBAUTHN_RP_ID` or removing an origin from `WEBAUTHN_ORIGIN` after go-live will break existing passkeys. Plan RP ID with your **final** production hostname.

### 2.3 Multi-tenant binding (single RP, many vendors)

The product serves all tenants on one site with paths like `/v/{vendor_slug}`. All tenants therefore share one **RP ID** (the site hostname). To preserve tenant isolation:

- Each passkey credential row is stored with `vendor_id` and either `member_id` **or** `staff_id`.
- The WebAuthn **user handle** encodes `(kind, vendor_id, actor_id)` in a fixed binary layout (33 bytes).
- On every authentication, the API MUST verify that the asserted credential belongs to the **same `vendor_id` as resolved from `:vendorSlug`**, and that the decoded user handle matches the same vendor and actor. Cross-vendor assertions MUST fail with `PASSKEY_VENDOR_MISMATCH`.

### 2.4 Challenges and replay

- Registration/authentication **challenges** are stored in **Redis** with a short TTL (5 minutes) and consumed on verify (single-use).
- Authenticator **signature counters** are persisted per credential; the API rejects **counter regression** (cloned authenticator / replay indicator).

### 2.5 Rate limiting

Passkey **options** and **verify** endpoints are rate-limited per client IP via Redis (see `docs/TECH-SPEC.md` §5.2). Abuse returns `PASSKEY_RATE_LIMITED`.

### 2.6 Recovery

- Members always retain **SMS OTP** as recovery.
- Staff always retain **username + PIN** as recovery.
- Members may **revoke** passkeys from `GET/DELETE /api/v1/me/passkeys` (see `docs/API.md`).

## 3. Related documents

- `docs/API.md` — endpoint contracts and error codes (`PASSKEY_*`).
- `docs/DEPLOYMENT.md` — production hostname, TLS, and reverse proxy.
- `docs/PRD.md` — FR-C2b and FR-D1 passkey requirements.
