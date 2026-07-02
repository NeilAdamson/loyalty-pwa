# Database And Prisma

Treat schema and data changes as high impact.

## Schema Rules

- Preserve `vendor_id` tenant isolation on tenant-scoped tables.
- Preserve append-only transaction and audit-log behavior.
- Prefer additive, reversible, migration-friendly schema changes.
- Avoid destructive schema or data changes unless explicitly required.
- Consider rollout impact, defaults, nullability, indexes, constraints, backfills, and backward compatibility.
- Keep table, column, index, constraint, enum, and migration naming consistent with the existing schema.

## Prisma And Migrations

- For database changes, update all relevant pieces together:
  - Prisma schema
  - migrations
  - seed data
  - affected services/repositories
  - relevant tests
  - docs if operational or schema assumptions changed
- Run migration, seed, and tests through Docker using repo-standard commands.
- Do not bypass migrations by editing a live database manually.
- Do not make the application depend on local host PostgreSQL.

## Data Integrity

- Stamp and redeem operations must stay transactional.
- Replay protection must preserve uniqueness of `vendor_id + token_jti`.
- Program updates create new versions; existing active cards remain tied to their original program version.
- Vendor deletion, suspension, impersonation, billing, staff status, and branch status changes must preserve existing business rules and auditability.
