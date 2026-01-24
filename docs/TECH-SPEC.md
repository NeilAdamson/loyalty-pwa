# Tech Spec — Multi-tenant Loyalty PWA (Node, Postgres, WhatsApp OTP)

## 0. Document control
- Version: 1.1
- Date: 2026-01-20
- Purpose: Provide unambiguous interfaces and implementation rules for development.

---

## 1. Technology baseline
- Runtime: Node.js LTS
- Language: TypeScript
- API framework: Fastify (preferred) or NestJS (acceptable)
- DB: PostgreSQL
- Cache/rate-limit: Redis (recommended)
- Reverse proxy: Nginx
- Frontend: PWA static bundle (React/Vite or lightweight equivalent)

---



### 1.1 Local development (mandatory: Docker Compose)
The supported local development path MUST run the full stack in Docker containers (no host installs of DB/web servers/middleware).
- Host prerequisites: Docker Desktop (WSL2 engine), Git, Antigravity IDE.
- Local stack MUST be started with a single command: `docker compose up --build`.
- Hot reload MUST work for both:
  - `apps/api` (Node dev server with watch)
  - `apps/web` (Vite dev server)

**Required services (docker-compose)**
- `api`: Node (TypeScript), mounts repo, runs dev command (watch mode)
- `web`: Vite PWA dev server, mounts repo, serves on `http://localhost:5173`
- `db`: PostgreSQL 16 (or pinned version), data persisted in a named volume
- `redis`: optional (recommended for rate limiting / token replay store in phase 2; for MVP replay protection can be DB-backed)

**Required ports (host mappings)**
- `web`: 5173:5173
- `api`: 8000:8000
- `db`: 5432:5432 (optional; only if you want external DB tooling on host)
- `redis`: 6379:6379 (optional)

**Minimum docker-compose requirements**
- Compose file path: `infra/docker-compose.yml`
- Uses a dedicated network (default compose network acceptable)
- Uses named volumes for DB persistence
- Uses bind mounts for source code to enable hot reload

Example (illustrative only; implementation may vary):
```yaml
services:
  api:
    build: ./apps/api
    ports: ["8000:8000"]
    volumes:
      - ./:/workspace
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/loyalty
    depends_on: [db]
  web:
    build: ./apps/web
    ports: ["5173:5173"]
    volumes:
      - ./:/workspace
    environment:
      - VITE_API_BASE_URL=http://localhost:8000/api/v1
  db:
    image: postgres:16
    environment:
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=loyalty
    volumes:
      - dbdata:/var/lib/postgresql/data
volumes:
  dbdata:
```

**Antigravity rule**
All run/test instructions in this repo MUST assume Docker Compose (no “install Postgres locally”, no “run node on host” as the supported path).

## 2. URL structure (tenant routing)
- Public vendor landing: `/v/{vendor_slug}`
- Member card: `/v/{vendor_slug}/card`
- Staff: `/v/{vendor_slug}/staff`
- Vendor admin: `/v/{vendor_slug}/admin`
- Platform admin: `/platform-admin`

API base: `/api/v1`
- Tenant-scoped endpoints either:
  - include `vendor_slug` in path, or
  - derive vendor_id from authenticated token claim.

---

## 3. Data model (schema)

### 3.1 vendors
- vendor_id UUID PK
- vendor_slug TEXT UNIQUE NOT NULL
- legal_name TEXT NOT NULL
- trading_name TEXT NOT NULL
- status TEXT CHECK IN ('TRIAL','ACTIVE','SUSPENDED') NOT NULL
- billing_plan_id TEXT NOT NULL
- billing_status TEXT CHECK IN ('TRIAL','PAID','OVERDUE','SUSPENDED') NOT NULL
- created_at TIMESTAMPTZ NOT NULL
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL

### 3.13 admin_users (platform)
- admin_id UUID PK
- email TEXT UNIQUE NOT NULL
- password_hash TEXT NOT NULL
- name TEXT NOT NULL
- role TEXT CHECK IN ('SUPER_ADMIN','ADMIN','READ_ONLY') NOT NULL
- status TEXT CHECK IN ('ACTIVE','DISABLED') NOT NULL DEFAULT 'ACTIVE'
- last_login_at TIMESTAMPTZ NULL
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL

### 3.2 vendor_branding
- vendor_id UUID PK/FK
- logo_url TEXT NULL
- wordmark_url TEXT NULL
- primary_color TEXT NOT NULL
- secondary_color TEXT NOT NULL
- accent_color TEXT NOT NULL DEFAULT '#3B82F6'
- background_color TEXT NULL
- card_text_color TEXT NOT NULL DEFAULT '#ffffff'
- card_style TEXT NOT NULL DEFAULT 'SOLID'
- welcome_text TEXT NULL
- card_title TEXT NULL
- card_bg_url TEXT NULL
- card_bg_image_url TEXT NULL
- updated_at TIMESTAMPTZ NOT NULL

### 3.3 branches (required)
- branch_id UUID PK
- vendor_id UUID FK NOT NULL
- name TEXT NOT NULL
- address_text TEXT NULL
- is_active BOOLEAN NOT NULL DEFAULT true

Constraint: each vendor MUST have ≥ 1 active branch.

### 3.4 staff_users
- staff_id UUID PK
- vendor_id UUID FK NOT NULL
- branch_id UUID FK NOT NULL
- name TEXT NOT NULL
- role TEXT CHECK IN ('ADMIN','STAMPER') NOT NULL
- status TEXT CHECK IN ('ENABLED','DISABLED') NOT NULL
- pin_hash TEXT NOT NULL
- pin_last_changed_at TIMESTAMPTZ NOT NULL
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL

Constraint: PIN uniqueness within vendor for enabled staff:
- unique(vendor_id, pin_hash) is NOT possible (hash).
- Implement uniqueness by storing an additional `pin_fingerprint = HMAC(vendor_id, pin)` and unique(vendor_id, pin_fingerprint) WHERE status='ENABLED'.

### 3.5 members
- member_id UUID PK
- vendor_id UUID FK NOT NULL
- branch_joined_id UUID FK NULL (optional analytics)
- name TEXT NOT NULL
- phone_e164 TEXT NOT NULL
- consent_service BOOLEAN NOT NULL DEFAULT true
- consent_marketing BOOLEAN NOT NULL DEFAULT false
- last_active_at TIMESTAMPTZ NOT NULL
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL

Unique: (vendor_id, phone_e164)

### 3.6 programs
- program_id UUID PK
- vendor_id UUID FK NOT NULL
- version INT NOT NULL
- is_active BOOLEAN NOT NULL
- stamps_required INT NOT NULL CHECK (stamps_required BETWEEN 2 AND 30)
- reward_title TEXT NOT NULL
- reward_description TEXT NOT NULL
- terms_text TEXT NOT NULL
- created_at TIMESTAMPTZ NOT NULL

Constraint: only one active program per vendor.

### 3.7 card_instances
- card_id UUID PK
- vendor_id UUID FK NOT NULL
- member_id UUID FK NOT NULL
- program_id UUID FK NOT NULL
- status TEXT CHECK IN ('ACTIVE','REDEEMED','EXPIRED') NOT NULL
- stamps_count INT NOT NULL DEFAULT 0
- created_at TIMESTAMPTZ NOT NULL
- redeemed_at TIMESTAMPTZ NULL

Constraint: one active card per (vendor_id, member_id).

### 3.8 stamp_transactions (append-only)
- stamp_tx_id UUID PK
- vendor_id UUID FK NOT NULL
- card_id UUID FK NOT NULL
- staff_id UUID FK NOT NULL
- branch_id UUID FK NOT NULL
- token_jti TEXT NOT NULL
- stamped_at TIMESTAMPTZ NOT NULL
- ip_address TEXT NULL
- device_fingerprint TEXT NULL
- flags JSONB NULL

Index: (vendor_id, stamped_at), (card_id, stamped_at)

### 3.9 redemption_transactions (append-only)
- redeem_tx_id UUID PK
- vendor_id UUID FK NOT NULL
- card_id UUID FK NOT NULL
- staff_id UUID FK NOT NULL
- branch_id UUID FK NOT NULL
- token_jti TEXT NOT NULL
- redeemed_at TIMESTAMPTZ NOT NULL
- ip_address TEXT NULL
- device_fingerprint TEXT NULL
- flags JSONB NULL

### 3.10 token_use (replay protection)
- vendor_id UUID NOT NULL
- token_jti TEXT NOT NULL
- used_at TIMESTAMPTZ NOT NULL

Primary key: (vendor_id, token_jti)

### 3.11 otp_requests (WhatsApp OTP)
- otp_id UUID PK
- vendor_id UUID NOT NULL
- phone_e164 TEXT NOT NULL
- purpose TEXT CHECK IN ('MEMBER_LOGIN') NOT NULL
- otp_hash TEXT NOT NULL
- expires_at TIMESTAMPTZ NOT NULL
- attempts INT NOT NULL DEFAULT 0
- created_at TIMESTAMPTZ NOT NULL
- consumed_at TIMESTAMPTZ NULL

### 3.12 admin_audit_log (append-only)
- audit_id UUID PK
- actor_type TEXT CHECK IN ('PLATFORM_ADMIN','VENDOR_ADMIN') NOT NULL
- actor_id UUID NOT NULL
- vendor_id UUID NULL
- action TEXT NOT NULL
- payload JSONB NOT NULL
- created_at TIMESTAMPTZ NOT NULL

---

## 4. Security and authorization (must implement)
1. HTTPS-only; reject plain HTTP.
2. Tenant boundary enforced in every query by `vendor_id`.
3. Members cannot access staff/admin endpoints.
4. Staff can only stamp/redeem for their own vendor.
5. Staff sessions must include staff_id + vendor_id + branch_id.
6. Rotating tokens are server-signed and single-use.
7. All stamp/redeem operations are DB-transactional.
8. Admin impersonation is time-bounded and fully audited.

---

## 5. Cooldown and fraud rules

### 5.1 Cooldown
- Global default: `COOLDOWN_MINUTES_DEFAULT = 30`.
- Vendor can set `vendor_cooldown_minutes` where:
  - `vendor_cooldown_minutes >= COOLDOWN_MINUTES_DEFAULT`.
- Cooldown enforcement:
  - For a card_id, deny stamping if last stamp_at is within cooldown window.

### 5.2 Rate limits (defaults)
- Staff PIN login attempts:
  - max 10/min per IP; on exceed, 429 for 5 minutes.
- WhatsApp OTP requests:
  - max 5/hour per phone; max 20/hour per IP.
- Stamp:
  - max 60/hour per staff_id.
  - max 3/day per card_id (vendor may increase).
- Redeem:
  - max 20/hour per staff_id.

### 5.3 Fraud flags
Record fraud flags in transaction `flags` JSON when:
- stamps/hour per staff exceed threshold.
- repeated denied cooldown attempts.
- excessive member login attempts.

---

## 6. Rotating token specification

### 6.1 Payload
```json
{
  "vendor_id": "uuid",
  "card_id": "uuid",
  "member_id": "uuid",
  "jti": "uuid",
  "exp": 1760000000
}
```

### 6.2 Encoding
- `payload_b64 = base64url(JSON(payload))`
- `sig = HMAC_SHA256(TOKEN_SIGNING_SECRET, payload_b64)`
- `token = payload_b64 + "." + base64url(sig)`

### 6.3 Validation rules
- signature valid
- exp > now
- token_use insert (vendor_id, jti) must succeed; if duplicate => `TOKEN_REPLAYED`

---

## 7. WhatsApp OTP specification

### 7.1 OTP generation
- Generate 6-digit numeric code.
- Store only `otp_hash = bcrypt(code + OTP_PEPPER)`.
- TTL: 5 minutes.

### 7.2 WhatsApp delivery
- Send WhatsApp message to `phone_e164` containing OTP.
- Message template (exact text):
  - `Your {VENDOR_TRADING_NAME} verification code is: {OTP}. It expires in 5 minutes.`

### 7.3 Verify
- Compare bcrypt against (submitted_code + pepper)
- Max attempts: 5 per otp_id; then invalidate.

Failure modes:
- If WhatsApp delivery fails, return error `OTP_DELIVERY_FAILED`.

---

## 8. API specification (REST, JSON)

### 8.1 Public vendor info
**GET** `/api/v1/vendors/{vendor_slug}/public`
Response:
```json
{
  "vendor_slug": "acme-carwash",
  "trading_name": "ACME Car Wash",
  "status": "ACTIVE",
  "branding": {
    "logo_url": "...",
    "primary_color": "#...",
    "secondary_color": "#...",
    "card_bg_url": "..."
  },
  "program": {
    "stamps_required": 10,
    "reward_title": "Free Wash",
    "reward_description": "...",
    "terms_text": "..."
  }
}
```

### 8.2 Member OTP request
**POST** `/api/v1/vendors/{vendor_slug}/members/otp/request`
Body:
```json
{ "phone_e164": "+2782...", "name": "Neil" }
```
Response:
```json
{ "otp_id": "uuid", "expires_in_seconds": 300 }
```

### 8.3 Member OTP verify
**POST** `/api/v1/vendors/{vendor_slug}/members/otp/verify`
Body:
```json
{ "otp_id": "uuid", "otp_code": "123456" }
```
Behavior:
- Create or update member.
- Ensure there is exactly one ACTIVE card.
Response:
```json
{
  "member_token": "JWT...",
  "member": { "member_id": "uuid" },
  "card": {
    "card_id": "uuid",
    "status": "ACTIVE",
    "stamps_count": 0,
    "stamps_required": 10
  }
}
```

### 8.4 Member card view + rotating token
**GET** `/api/v1/me/card`
Auth: `Bearer member_token`
Response:
```json
{
  "card": {
    "card_id": "uuid",
    "status": "ACTIVE",
    "stamps_count": 3,
    "stamps_required": 10
  },
  "rotating_token": {
    "token": "...",
    "expires_in_seconds": 30
  },
  "history": [
    { "type": "STAMP", "at": "2026-01-20T10:00:00Z" }
  ]
}
```

### 8.5 Staff login (PIN-only)
**POST** `/api/v1/vendors/{vendor_slug}/staff/login`
Body:
```json
{ "pin": "123456" }
```
Response:
```json
{
  "staff_token": "JWT...",
  "staff": { "staff_id": "uuid", "role": "STAMPER", "branch_id": "uuid" }
}
```

### 8.6 Stamp
**POST** `/api/v1/staff/stamp`
Auth: `Bearer staff_token`
Body:
```json
{ "member_rotating_token": "...", "device_fingerprint": "optional" }
```
Response:
```json
{ "result": "STAMPED", "card": { "card_id": "uuid", "stamps_count": 4, "stamps_required": 10 } }
```

### 8.7 Redeem
**POST** `/api/v1/staff/redeem`
Auth: `Bearer staff_token`
Body:
```json
{ "member_rotating_token": "...", "device_fingerprint": "optional" }
```
Response:
```json
{
  "result": "REDEEMED",
  "redeemed_card": { "card_id": "uuid", "status": "REDEEMED" },
  "new_card": { "card_id": "uuid", "status": "ACTIVE", "stamps_count": 0 }
}
```

### 8.8 Error format (standard)
All errors MUST be returned as:
```json
{ "error": { "code": "SOME_CODE", "message": "Human readable" } }
```

Required error codes:
- `VENDOR_SUSPENDED`
- `UNAUTHENTICATED`
- `ROLE_FORBIDDEN`
- `STAFF_DISABLED`
- `TOKEN_INVALID`
- `TOKEN_EXPIRED`
- `TOKEN_REPLAYED`
- `COOLDOWN_ACTIVE`
- `CARD_FULL`
- `CARD_NOT_ELIGIBLE`
- `OTP_DELIVERY_FAILED`
- `OTP_INVALID`
- `RATE_LIMITED`

---

## 9. Admin APIs (summary)
Implement separately with admin auth:
- Platform admin:
  - create vendor / delete vendor
  - suspend/reactivate
  - set billing status
  - audit export
  - impersonation start/stop
- Vendor admin:
  - branding CRUD
  - branch CRUD
  - program create/activate new version
  - staff CRUD (including PIN reset)

All admin actions MUST write `admin_audit_log`.

---

## 10. PWA requirements
- Manifest:
  - name, short_name, icons, display=standalone, start_url
- Service worker:
  - cache static assets
  - network-first for API calls
- Offline behavior:
  - member UI shell loads; card data indicates “Offline”
  - staff actions disabled offline

---

## 11. Retention job
A scheduled job runs daily:
- Find members with `last_active_at < now - 24 months`.
- For each:
  - anonymize name and phone OR delete member (choose anonymize by default).
  - ensure referential integrity for transactions.
- Record retention actions in `admin_audit_log` as system actor.

---

## 12. Environment variables
- `DATABASE_URL`
- `JWT_SECRET`
- `TOKEN_SIGNING_SECRET`
- `OTP_PEPPER`
- `WHATSAPP_PROVIDER` (e.g., META_CLOUD | TWILIO)
- `WHATSAPP_API_BASE_URL`
- `WHATSAPP_API_TOKEN`
- `COOLDOWN_MINUTES_DEFAULT=30`
- `REDIS_URL` (recommended)
- `CORS_ALLOWED_ORIGIN`

---

## 13. Test plan (minimum)
- Unit: token signing/validation, cooldown checks, replay protection, program versioning.
- Integration: WhatsApp OTP request/verify, staff PIN login, stamp, redeem.
- E2E: member join → card → staff stamp → redeem → new card.
- Load: 10 stamps/sec sustained for 5 minutes against single vendor.
