# Docker-First Runtime And Validation

This repository is Docker-only for local development, runtime, and validation unless the user explicitly requests otherwise.

## Runtime Rules

- Do not run or recommend app services, PostgreSQL, Redis, Caddy, Node, Vite, workers, queues, or middleware directly on the host when a Docker path exists.
- Do not run `pnpm install`, `pnpm dev`, `pnpm build`, tests, Prisma, migrations, or seeds on the host as the default workflow.
- Translate host-local commands into Docker or Docker Compose equivalents.
- Prefer `.\dev.ps1` on Windows when it wraps the compose workflow.
- Keep development and production behavior clearly separated.
- Externalize runtime configuration through environment variables or env files.
- Keep ports, health checks, service names, volumes, networks, and dependencies coherent when changing runtime behavior.

## Standard Local Commands

- Start dev stack: `.\dev.ps1 up -d --build`
- Compose equivalent: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build`
- Run API commands: `.\dev.ps1 exec api pnpm <script>`
- Run one-off web commands: `.\dev.ps1 run --rm web pnpm <script>`
- Deploy migrations: `.\dev.ps1 exec api pnpm db:deploy`
- Seed data: `.\dev.ps1 exec api pnpm db:seed`

## Validation Rules

- Inspect `README.md`, compose files, Dockerfiles, package manifests, and CI before choosing validation commands.
- Run the narrowest relevant validation first, then broaden only when needed.
- Use containerized commands such as `docker compose exec`, `docker compose run`, or `.\dev.ps1`.
- If a containerized validation command cannot run, report the blocker precisely instead of switching silently to host-local execution.
