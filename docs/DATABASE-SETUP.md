# Database Setup: Definitive Guide

This document is the authoritative reference for database setup, migration, seeding, and safe schema changes for the Loyalty PWA. **All database operations run inside Docker containers**—never against a locally installed Postgres.

---

## 1. Database User Model

### PostgreSQL Users

| User | Purpose | Where Created | Password Location |
|------|---------|---------------|-------------------|
| `loyalty_app` | Application runtime user (API connects as this) | **Auto-created by Postgres container** on first run from `POSTGRES_USER` env | `POSTGRES_PASSWORD` in `.env` or docker-compose defaults |

**There is no separate `neil` database user.** The name `neil` refers to the **VPS SSH/system user** (from `loyalty_ladies_vps_build_deployment_summary.md`), not a database role.

### How `loyalty_app` Is Created

The official PostgreSQL Docker image creates the user and database automatically when the container **first initializes** an empty data directory:

1. Reads `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` from the environment.
2. Creates that user with superuser privileges.
3. Creates the database and sets it as the default for that user.

**No init SQL or manual `CREATE USER` is required.** If you change `POSTGRES_USER` after the volume already has data, the new user will *not* be created—Postgres only runs init on an empty `/var/lib/postgresql/data`.

---

## 2. Where Credentials Are Stored

### Development

| Item | Location | Value |
|------|----------|-------|
| DB user | `docker-compose.yml` / `.env` | `POSTGRES_USER` (default: `loyalty_app`) |
| DB password | `docker-compose.yml` / `.env` | `POSTGRES_PASSWORD` (default: `e74a89c3120d4f5b9e8c2a3b`) |
| `DATABASE_URL` | `.env` or compose default | Must match user/password above |
| Admin login | Seeded via `db:seed` | `admin@punchcard.co.za` / `password1234` (default); override with `ADMIN_EMAIL` / `ADMIN_PASSWORD` |

If you do **not** create a `.env`, the compose defaults apply:
- `loyalty_app` / `e74a89c3120d4f5b9e8c2a3b` / `loyalty`

### Production

| Item | Location | Value |
|------|----------|-------|
| DB user | `.env` on VPS | `POSTGRES_USER` (e.g. `loyalty_app`) |
| DB password | `.env` on VPS | Strong random value |
| `DATABASE_URL` | `.env` on VPS | `postgresql://loyalty_app:PASSWORD@db:5432/loyalty?schema=public` |
| Admin login | Seeded via `db:seed` | From `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` (defaults to `admin@punchcard.co.za` / `password1234` if unset) |

**Important:** `POSTGRES_*` and `DATABASE_URL` must be consistent. The API connects using `DATABASE_URL`; the DB container creates the user from `POSTGRES_*`.

---

## 3. Order of Operations (Critical)

### First-Time Setup (New Machine / Fresh DB)

| Step | Command | When |
|------|---------|------|
| 1 | Start containers | DB volume is created, Postgres initializes and creates `loyalty_app` + DB |
| 2 | Wait for DB healthy | `depends_on: db: condition: service_healthy` handles this |
| 3 | Run migrations | Create/update tables |
| 4 | Seed data | Admin user + demo vendor |

**Do not skip step 3 or 4** on first run. The API will fail with "relation does not exist" or "Admin User not found" until migrations and seed have run.

### Subsequent Deploys (DB Already Exists)

| Step | Command | When |
|------|---------|------|
| 1 | Pull code | `git pull` |
| 2 | Deploy | `./deploy.sh` (builds, starts, runs migrations) |
| 3 | (Optional) Re-seed | Only if seed script is updated; usually not needed |

---

## 4. Scripts and Docker Config by Environment

### Development (Windows with dev.ps1)

| Action | Command |
|--------|---------|
| Start stack | `.\dev.ps1 up -d --build` |
| Migrate (first run or schema changes) | `.\dev.ps1 exec api pnpm db:deploy` |
| Seed (first run) | `.\dev.ps1 exec api pnpm db:seed` |
| Create new migration (after schema edits) | `.\dev.ps1 exec api pnpm db:migrate:dev --name your_migration_name` |
| Generate Prisma client | `.\dev.ps1 exec api pnpm db:generate` |
| pgAdmin | http://localhost:5050 — connect to host `db`, user `loyalty_app`, password from `POSTGRES_PASSWORD` |

**Equivalent without dev.ps1:**
```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec api pnpm db:deploy
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec api pnpm db:seed
```

### Production (VPS)

| Action | Command |
|--------|---------|
| Deploy (build + start + migrations) | `./deploy.sh` |
| Seed (first run only) | `docker compose exec api pnpm db:seed` |

**Note:** `deploy.sh` runs `db:deploy` automatically, so migrations are applied on every deploy.

---

## 5. Applying Schema Changes Safely (No DB Drop)

### Rule: Never Drop the Database in Production

Use Prisma migrations only. Never run `prisma migrate reset` or `DROP DATABASE` against production.

### Process for Adding/Changing Fields, Tables, Indexes

1. **Edit schema** in `apps/api/prisma/schema.prisma`.

2. **Create migration (development only):**
   ```bash
   .\dev.ps1 exec api pnpm db:migrate:dev --name add_my_field
   ```
   This generates SQL in `prisma/migrations/` and applies it locally.

3. **Commit** the migration folder and `schema.prisma`.

4. **Deploy** code to production (`./deploy.sh` or CI/CD).

5. **Apply migration in production:**
   ```bash
   docker compose exec api pnpm db:deploy
   ```

### Handling Existing Data (e.g. Adding NOT NULL Columns)

If a new column is `NOT NULL` and the table has rows, the migration will fail unless you provide defaults or backfill.

**Pattern used in this project** (see `20260205072850_add_contact_fields_final`):

```sql
-- 1. Add column with DEFAULT first
ALTER TABLE "vendors" ADD COLUMN "contact_surname" TEXT NOT NULL DEFAULT '';

-- 2. Backfill NULLs in other columns before making them NOT NULL
DO $$
BEGIN
  UPDATE "vendors" SET "contact_name" = '' WHERE "contact_name" IS NULL;
  UPDATE "vendors" SET "contact_phone" = '' WHERE "contact_phone" IS NULL;
END $$;

-- 3. Now safe to set NOT NULL
ALTER TABLE "vendors" ALTER COLUMN "contact_name" SET NOT NULL;
```

### If a Migration Fails Mid-Run

1. **Mark it as rolled back:**
   ```bash
   docker compose exec api pnpm prisma migrate resolve --rolled-back "20260205072850_add_contact_fields_final"
   ```

2. **Fix the migration SQL** (e.g. add backfill, adjust constraints).

3. **Re-run deploy:**
   ```bash
   docker compose exec api pnpm db:deploy
   ```

---

## 6. New Development Machine Setup

1. **Prerequisites:** Docker Desktop, Git.

2. **Clone and configure:**
   ```bash
   git clone <repo-url>
   cd loyalty-pwa
   cp .env.example .env
   ```
   Edit `.env` if needed. For dev, the defaults in `docker-compose.yml` work; ensure `DATABASE_URL` matches `POSTGRES_USER` and `POSTGRES_PASSWORD` (see §7).

3. **Start stack:**
   ```bash
   .\dev.ps1 up -d --build
   ```

4. **Initialize DB:**
   ```bash
   .\dev.ps1 exec api pnpm db:deploy
   .\dev.ps1 exec api pnpm db:seed
   ```

5. **Verify:** http://localhost:5173/admin/login — `admin@punchcard.co.za` / `password1234`.

---

## 7. Known Inconsistencies and Fixes

### .env.example vs docker-compose.yml

**Issue:** `.env.example` historically used `postgres:postgres`, while `docker-compose.yml` creates `loyalty_app` by default. Copying `.env.example` to `.env` without changes would cause a connection mismatch.

**Fix:** `.env.example` should use `loyalty_app` and the same password as the compose default so that a plain `cp .env.example .env` works.

### deploy.sh and Migrations

**Fixed:** `deploy.sh` now runs `docker compose run --rm api pnpm db:deploy` after `docker compose up`, so migrations are applied automatically on every deploy.

---

## 8. Prisma Commands Reference

| Command | Use Case |
|---------|----------|
| `pnpm db:deploy` | Apply pending migrations (prod-safe, no prompt) |
| `pnpm db:migrate:dev` | Create new migration + apply (interactive, dev only) |
| `pnpm db:generate` | Regenerate Prisma Client from schema |
| `pnpm db:seed` | Run seed script (admin + demo data) |
| `pnpm db:studio` | Open Prisma Studio (optional) |

**Always run these inside the API container**, e.g.:
```bash
docker compose exec api pnpm db:deploy
```
or with dev.ps1:
```bash
.\dev.ps1 exec api pnpm db:deploy
```

---

## 9. pgAdmin (Development)

- **URL:** http://localhost:5050  
- **Login:** `admin@admin.com` / `root`  
- **Add server:** Host `db`, port 5432, user `loyalty_app`, password from `POSTGRES_PASSWORD` (default: `e74a89c3120d4f5b9e8c2a3b`).

---

## 10. Summary Checklist

### First-Time Dev Setup
- [ ] `.\dev.ps1 up -d --build`
- [ ] `.\dev.ps1 exec api pnpm db:deploy`
- [ ] `.\dev.ps1 exec api pnpm db:seed`

### First-Time Production Setup
- [ ] Create `.env` with `POSTGRES_*` and `DATABASE_URL`
- [ ] `./deploy.sh` (runs migrations automatically)
- [ ] `docker compose exec api pnpm db:seed` (first run only)

### After Schema Changes (Production)
- [ ] Commit migration files
- [ ] Deploy (`./deploy.sh` or CI) — migrations run automatically
