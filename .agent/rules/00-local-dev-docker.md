# 00-local-dev-docker.md — Mandatory Local Development Policy (Docker-Only)

## Purpose
This repository MUST be developed locally using Docker Compose. The goal is zero host-machine dependency drift (no local DB installs, no local web server installs, no “works on my machine”).

These rules apply to ALL contributors and ALL agent-driven changes (Antigravity, copilots, scripts, etc.).

## Hard Rules (Non-Negotiable)
1. **Docker-only local runtime**
   - All local development MUST run via `docker compose`.
   - Developers MUST NOT install or run Postgres/MySQL/Redis/Nginx locally for this project.
   - Developers MUST NOT rely on host-installed Node.js to run the app (except for optional tooling that does not execute the app, e.g., editing files).

2. **Single command boot**
   - A clean machine with Docker Desktop installed must be able to run:
     - `docker compose up --build`
   - This MUST start all required services for the MVP (API, Web, DB, migrations/seed if required).

3. **All tests run in containers**
   - Unit tests, integration tests, linting, and typechecks MUST be runnable via containers.
   - Provide compose targets or npm/pnpm scripts that execute inside containers.

4. **No undocumented services**
   - Any new dependency (e.g., Redis, queue worker) MUST be added to `infra/docker-compose.yml` (or root `docker-compose.yml` if that is the chosen layout) and documented in `/docs`.
   - Do not require developers to install any new service on the host.

5. **Environment management**
   - The repo MUST contain `.env.example` (and if split, `apps/api/.env.example`, `apps/web/.env.example`).
   - Docker Compose MUST load env vars from `.env` (developer local) without committing secrets.
   - Secrets MUST NOT be committed.

## Required Repository Structure (Minimum)
- `infra/docker-compose.yml` (preferred) or `docker-compose.yml` at repo root.
- Containers:
  - `api` (Node + TypeScript backend)
  - `web` (PWA frontend, served via dev server or lightweight static server)
  - `db` (PostgreSQL)
  - Optional (Phase 2+): `redis`, `worker`
- `/docs` contains PRD/Architecture/Tech Spec and any changes to runtime assumptions.

## Developer Experience Requirements
1. **Hot reload**
   - API and Web should auto-reload on code changes using bind mounts (`volumes:`).
2. **Deterministic dependencies**
   - Container builds MUST use lockfiles (`package-lock.json`, `pnpm-lock.yaml`, etc.).
3. **Database migrations**
   - Migrations MUST be runnable from within containers (e.g., `docker compose exec api pnpm prisma migrate dev`).
4. **Ports**
   - Standard local port mapping MUST be documented (e.g., Web: 5173 or 3000; API: 8080; DB: 5432).
5. **Windows 11 compatibility**
   - Assume Docker Desktop + WSL2.
   - Avoid filesystem patterns known to be slow on Windows where possible (prefer WSL2 filesystem paths for the repo when feasible).

## Antigravity Execution Policy
When generating plans, code, scripts, or instructions:
- ALWAYS assume Docker Compose is the execution environment.
- NEVER propose installing Postgres/MySQL/Redis/Nginx locally.
- NEVER require global Node installs to run the app locally.
- Any command examples MUST be Docker-based (e.g., `docker compose exec ...`).

## If You Must Deviate
Deviation from these rules requires an explicit change request:
- Update this rule file.
- Update `/docs/ARCHITECTURE.md` and `/docs/TECH-SPEC.md`.
- Add a rationale and migration plan.

