# Security And Tenant Isolation

Security is a core requirement for this product, not a follow-up task.

## Baseline

- Never hardcode or expose secrets, credentials, tokens, certificate material, OTP peppers, signing secrets, database URLs, or API keys.
- Validate external input at trust boundaries.
- Use safe ORM patterns or parameterized queries.
- Avoid SQL injection, shell injection, path traversal, unsafe deserialization, insecure file handling, and unsafe redirect patterns.
- Do not leak secrets, stack traces, internal hosts, or sensitive implementation details to clients or logs.
- Redact sensitive values from logs.
- Preserve secure defaults, authentication, authorization, validation, rate limits, and audit logging.

## Tenant Isolation

- Every tenant-scoped table and query must preserve `vendor_id` isolation.
- Vendor admin routes under `/api/v1/v/:slug/admin/*` must ensure the authenticated vendor matches the path slug.
- Member, staff, vendor admin, and platform admin sessions have different trust boundaries; do not mix their auth behavior.
- Members cannot access staff or admin endpoints.
- Staff can only stamp or redeem for their own vendor and authorized branch context.
- WebAuthn credentials must remain bound to the same `vendor_id` resolved from the vendor slug.

## Fraud And Abuse Controls

- Preserve rotating-token signature validation, expiry checks, replay protection, cooldowns, and per-staff/per-card rate limits.
- Preserve Redis-backed throttles where implemented.
- Keep stamp and redeem operations transactional.
- Record fraud and audit-relevant events where existing patterns require them.

## Security-Sensitive Changes

When changing auth, passkeys, sessions, cookies, JWTs, CORS, CSP, uploads, file access, SMSFlow, Redis, secrets, logging, or external integrations:

- Read `docs/SECURITY.md`.
- Read the relevant API and architecture docs.
- Prefer the safer implementation when equivalent options exist.
- Add or update tests for authorization, tenant isolation, validation, and abuse controls where practical.
