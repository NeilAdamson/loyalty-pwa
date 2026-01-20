# PRD — Multi-tenant No‑App Digital Loyalty Stamp Cards (PWA)

## 0. Document control
- Product: Digital Loyalty Stamp Cards (PWA)
- Version: 1.0
- Date: 2026-01-20
- Audience: Antigravity AI (engineering + QA), Ops

## 1. Problem statement
Small businesses run simple paper loyalty stamp cards (e.g., “every 10th coffee free”). Paper cards are frequently forgotten or lost, causing low participation and poor repeat-visit reinforcement.

## 2. Product summary
A Progressive Web App (PWA) provides each vendor (tenant) with a branded digital stamp card program.
- Members join by scanning a vendor QR code and verifying their phone number via **WhatsApp OTP**.
- Staff issue stamps and redeem rewards using a **staff PIN-only** flow that is restricted to vendor staff and protected against replay/screenshot fraud.
- Redemption automatically closes the full card and creates a new empty card.

## 3. Goals
1. Replace paper stamp cards with a digital “no app install” workflow.
2. Provide strict tenant isolation: vendor data and programs are separated by `vendor_id`.
3. Provide fraud-resistant stamping/redeeming with full auditability.
4. Support multi-branch vendors from day 1.
5. Deploy on Afrihost Cloud/VPS with HTTPS (AutoSSL).

## 4. Non-goals (MVP)
- Cross-vendor customer identity or “aggregator” consumer account.
- POS integrations.
- Points, tiers, cashback, or multiple concurrent programs per vendor.
- Offline stamping and later reconciliation.
- Apple/Google Wallet passes.

## 5. Key decisions locked for MVP
- OTP channel: **WhatsApp**
- Staff login: **PIN-only** (PIN uniquely identifies staff within a vendor)
- Vendor onboarding: **platform-admin-only**
- Multi-branch: **required**
- Cooldown policy: **global default; vendor can increase but not decrease**
- Card expiry: **no expiry in MVP** (future option: global fixed expiry via configuration)
- Data retention: **purge/anonymize after 24 months inactivity**
- Support impersonation: **platform admin allowed; strict audit logs**
- Billing: **manual invoicing; suspend for non-payment**
- Hosting: **Afrihost Cloud/VPS (Node allowed)**

## 6. Glossary
- Vendor / Tenant: A business using the system.
- Branch: A physical location belonging to a vendor.
- Member: A customer enrolled in a vendor’s program.
- Program: The vendor’s loyalty rule set (e.g., 10 stamps → reward).
- Card: A member’s progress instance for a program version.
- Stamp: A transaction increasing progress by 1.
- Redemption: A transaction converting a full card to a reward.

## 7. Personas and roles
- Platform Admin: Creates vendors, configures billing status, supports vendors, reviews fraud, suspends vendors.
- Vendor Admin: Configures branding, program rules, branches, staff PINs.
- Staff (Stamper): Stamps and redeems at the point of service.
- Member: Joins, views card, presents rotating token for stamping/redeeming.

## 8. Success metrics (pilot)
- Scan→Join conversion ≥ 30% (varies by vendor type).
- Stamp compliance ≥ 80% (stamps recorded on return visits).
- Redemption rate ≥ 20% (cards reaching redemption / cards created).
- Fraud: flagged transactions < 0.5%.
- Stamp/redeem latency: adds ≤ 5 seconds at counter.

## 9. Functional requirements (numbered, testable)

### EPIC A — Platform admin (multi-tenant control)
**FR-A1 Vendor create (platform-admin-only)**
- Platform Admin can create a vendor with:
  - `legal_name`, `trading_name`, `vendor_slug` (unique), contact details
  - billing plan metadata and status
  - initial branches (≥ 1 branch required)
- System generates:
  - `vendor_id` (UUID)
  - `public_signup_url` and QR code

**FR-A2 Vendor suspend / reactivate**
- Suspending vendor MUST:
  - block: staff login, stamp, redeem
  - allow: member card view (read-only)
- Reactivation restores normal operation.

**FR-A3 Support impersonation**
- Platform Admin may impersonate Vendor Admin.
- MUST record an immutable audit record containing:
  - platform_admin_id, vendor_id, start_time, end_time, reason
- All actions during impersonation MUST be tagged as “impersonated”.

**FR-A4 Audit export**
- Export CSV for a vendor across a date range including:
  - stamps, redemptions, staff logins, program changes, staff changes

### EPIC B — Vendor admin portal (tenant-scoped)
**FR-B1 Branding**
- Vendor Admin can set logo, colors, card imagery.
- Member landing and card UI MUST reflect changes within 60 seconds.

**FR-B2 Branch management (required)**
- Vendor Admin can:
  - create/edit/disable branches
  - view branch list
- Constraint: Vendor MUST have at least one ACTIVE branch.

**FR-B3 Program definition (one active program)**
- Vendor Admin configures:
  - `stamps_required` (2..30)
  - reward title/description
  - terms text
- Only one active program at a time.
- Updating the program creates a **new version**; existing active cards remain tied to their program version.

**FR-B4 Staff management**
- Vendor Admin can create staff:
  - name, branch_id (required), role (ADMIN|STAMPER), status
  - 6-digit PIN (required)
- PIN uniqueness constraint: within a vendor, PIN MUST be unique across enabled staff accounts.
- Disabling staff takes effect immediately.

**FR-B5 QR management**
- Vendor Admin can download/print:
  - vendor public signup QR
  - branch-specific signup QR (for analytics)
- Vendor Admin can rotate signup QR secret (invalidates old QR tokens; URL can remain stable).

### EPIC C — Member PWA (tenant-scoped)
**FR-C1 Vendor landing**
- Shows branding + program summary + “Join” call-to-action.

**FR-C2 Member signup/login (WhatsApp OTP)**
- Member enters: name, phone (E.164)
- System sends OTP via WhatsApp message.
- Member verifies OTP.
- Member identity uniqueness: (vendor_id, phone).

**FR-C3 Card display**
- Member can view:
  - progress (stamps_count / stamps_required)
  - reward details + terms
  - last 20 transactions summary (stamp/redeem timestamps)

**FR-C4 Rotating member token (anti-screenshot)**
- Member card screen MUST display a rotating QR/token:
  - validity: 30 seconds
  - server-signed
  - single-use for stamp/redeem (replay protected)

### EPIC D — Staff stamping and redemption
**FR-D1 Staff login (PIN-only)**
- Staff portal is vendor-scoped (via vendor_slug).
- Staff enters PIN only.
- System resolves staff account by (vendor_id, pin) where staff status=ENABLED.
- If PIN invalid: error and rate limit.

**FR-D2 Stamp**
- Staff scans member rotating token.
- Server validations:
  1) vendor active
  2) staff enabled and authorized
  3) token signature valid + not expired
  4) token not previously used
  5) card ACTIVE and not full
  6) cooldown satisfied
- On success: increment stamps_count by 1 and record append-only stamp transaction.
- Idempotency: token_jti MUST be idempotent (same jti cannot double-stamp).

**FR-D3 Redeem**
- Staff scans member rotating token.
- Validations:
  - card ACTIVE and stamps_count == stamps_required
- On success:
  - mark card REDEEMED
  - record redemption transaction
  - create a new empty ACTIVE card on latest program version

**FR-D4 Cooldown rules**
- Global cooldown default: **30 minutes** between stamps per card.
- Vendor may increase cooldown (e.g., 60 minutes) but cannot decrease.

**FR-D5 Fraud throttles**
- Rate limits (defaults):
  - staff PIN attempts: 10/min per IP, lockout 5 minutes on repeated failure
  - stamp: 60/hour per staff
  - redeem: 20/hour per staff
  - per card: max 3 stamps/day (vendor may increase)
- Fraud flags recorded when thresholds exceeded.

### EPIC E — Analytics (MVP)
**FR-E1 Vendor dashboard**
- Per vendor and per branch:
  - total members
  - active members (last 30d)
  - stamps (last 30d)
  - redemptions (last 30d)
  - staff activity (stamps per staff)

## 10. Required screens

### Platform admin
- Vendors list
- Vendor detail + billing/suspension
- Audit export
- Impersonation session control

### Vendor admin
- Branding editor + preview
- Branch management
- Program editor + version history
- Staff management (create, disable, PIN reset)
- QR downloads

### Staff
- PIN login
- Stamp (scan + confirm)
- Redeem (scan + confirm)

### Member
- Vendor landing
- Join + WhatsApp OTP verify
- Card view (progress + rotating QR)
- History (simple list)



## 10A. PWA install / Add to Home Screen (MVP)
**FR-X1 Install guidance banner**
- The PWA MUST show a lightweight, dismissible guidance banner suggesting “Add to Home Screen” after the member has successfully joined OR after the 2nd card view (whichever comes first).
- Platform behavior:
  - Android Chrome/Edge: if `beforeinstallprompt` is available, show a CTA that triggers the browser install prompt.
  - iOS Safari: show an in-app instruction sheet (cannot programmatically trigger the native Add-to-Home-Screen prompt).
- Acceptance:
  - Banner is shown at most once per device per vendor per 30 days (use local storage).
  - Banner can be dismissed.

## 11. Edge cases
- Program updated while members have active cards: existing cards remain on old program version.
- Vendor suspended: member can view card but cannot be stamped/redeemed.
- Screenshot reuse: rotating token + replay protection MUST block.
- Stamp attempt when card full: return error `CARD_FULL`.
- Redeem attempt when not full: return error `CARD_NOT_ELIGIBLE`.

## 12. Non-functional requirements
- Security: HTTPS only; strict tenant authorization.
- Performance: stamp/redeem API p95 ≤ 500ms under pilot load.
- Availability: target 99.5% (MVP best-effort).
- Logging: append-only transactions + immutable admin audit.
- Privacy: minimal PII, explicit consent fields.

## 13. Privacy and retention
- Store minimal PII: name + phone + consent flags.
- Inactivity definition: no member activity (no login, stamp, redeem) for 24 months.
- Retention action after 24 months inactivity:
  - anonymize member name and phone (or delete member row) while keeping aggregated transaction counts.

## 14. Acceptance test checklist (summary)
- Vendor created with ≥ 1 branch.
- Member joins via WhatsApp OTP.
- Staff PIN login works.
- Stamp increments once; repeated token fails.
- Cooldown enforced.
- Redeem closes card and creates new empty card.
- Program versioning works.
- Suspension blocks staff actions.
- Audit exports include all actions.
