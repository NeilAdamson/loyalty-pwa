# Task Workflows

Use these workflows to keep AI-assisted changes predictable.

## Feature Work

- Clarify the goal, users, non-goals, and acceptance expectations from the request and `docs/PRD.md`.
- Inspect existing implementation, folder structure, APIs, schemas, and tests before changing patterns.
- Implement the minimum viable set of changes using existing architecture and naming.
- Keep runtime and setup changes Docker-first.
- Update docs when behavior, setup, architecture, API contracts, schema, or environment variables change.
- Validate the touched area through Docker.

## Refactoring

- Read architecture context before reshaping modules.
- Preserve public interfaces unless the change explicitly requires otherwise.
- Keep refactors incremental and reversible.
- Do not mix refactoring with unrelated feature work.
- Add abstractions only when they remove real complexity or match a local pattern.
- Re-run relevant validation after refactoring.

## Fixing Quality Issues

- Identify the failing check and scope first.
- Reproduce with Docker or Docker Compose where possible.
- Fix the root cause rather than suppressing the check.
- Keep the fix targeted and consistent with surrounding code.
- Re-run the relevant validation and report what remains if anything cannot be resolved.

## Documentation

- Keep documentation concise and consistent with the actual implementation.
- Do not document host-local app workflows as the default path.
- Update setup and deployment docs when changing Docker, compose, env vars, ports, services, migrations, or operational behavior.
