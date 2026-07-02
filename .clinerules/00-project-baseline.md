# Project Baseline

These rules apply to all AI-assisted coding in this repository.

## Operating Standard

- Prefer small, targeted, reversible changes over broad rewrites.
- Reuse existing patterns, folder conventions, naming, helpers, services, and validation scripts before adding new abstractions.
- Preserve existing business rules unless the user explicitly asks to change them.
- Do not invent requirements, URLs, credentials, services, dependencies, or architecture.
- Do not add unnecessary dependencies.
- Do not hardcode secrets, credentials, tokens, certificates, connection strings, or environment-specific URLs.
- Keep all documentation created for this project inside this repository.
- If the same build, test, deploy, or migration attempt fails about five times, stop and report evidence: commands, expected result, actual result, logs, and top likely causes.

## Required Context Before Substantial Work

Before substantial implementation, refactoring, database, deployment, security, or architecture changes, inspect the relevant project context.

Read these files when present:

- `README.md`
- `docs/PRD.md`
- `docs/ARCHITECTURE.md`
- `docs/SECURITY.md`
- `docs/DEPLOYMENT.md`
- `docs/TECH-SPEC.md`

Also inspect nearby source files, package manifests, Docker files, compose files, CI config, and existing tests before changing patterns.

## Product And Architecture Constraints

- This is a multi-tenant digital loyalty PWA.
- Tenant isolation is mandatory: tenant-scoped data access must be filtered by `vendor_id`.
- Vendor-scoped URL paths use `/v/{vendor_slug}`.
- Stamp and redemption flows must remain fast, auditable, fraud-resistant, and replay-protected.
- Rotating member tokens are server-signed, short-lived, and single-use.
- Stamp and redemption transactions are append-only.
- Admin and support actions must preserve auditability.
- SMS OTP uses SMSFlow; do not replace or bypass that integration without an explicit requirement.
- WebAuthn/passkey behavior must follow `docs/SECURITY.md`.

## Completion Standard

- Leave the repository implementation-ready, not speculative.
- Do not leave introduced lint, type, build, migration, or test errors unresolved.
- Run the most relevant validation available for the touched area, preferably through Docker.
- If full validation is not practical, run the narrowest useful subset and state exactly what was and was not validated.
