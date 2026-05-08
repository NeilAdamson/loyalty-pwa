# Agent Instructions

Before making substantial implementation, refactoring, database, deployment, or architecture changes, inspect the project context.

Read these files when present:
- README.md
- docs/PRD.md
- docs/architecture.md
- docs/security.md
- docs/deployment.md
- docs/tech-spec.md

Also read these rule files when present:
- .agents/rules/AI-DEV-RULES.md
- .agents/rules/20-security.mdc
- .agents/rules/60-typescript-node.mdc
- .agents/rules/61-nextjs-react.mdc
- .agents/rules/70-postgres-db.mdc
- .cursor/rules/*.mdc

Core rules:
- Use Docker-first workflows. Do not assume local Node/Postgres/Redis execution unless explicitly requested.
- Do not make architecture changes without checking existing docs.
- Prefer small, reviewable changes.
- Run validation commands inside containers.
- Preserve existing business rules unless explicitly asked to change them.
- For database changes, update Prisma schema, migrations, seed data, and relevant tests.
- For frontend changes, keep UI simple, responsive, and accessible.
- For security-sensitive work, check authentication, authorization, tenant isolation, input validation, secrets handling, and audit logging.