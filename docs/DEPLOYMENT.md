# Production Deployment Guide (VPS)

This guide details how to deploy the Loyalty PWA to a Linux VPS using Docker Compose and Caddy.

## 1. Prerequisites

- **VPS**: Ubuntu 22.04 LTS (or similar) with at least 2GB RAM.
- **Domain**: A domain name pointed to your VPS IP (e.g., `punchcard.co.za`).
- **Software**: Docker Engine and Docker Compose installed on the VPS.

## 2. Infrastructure Overview

The production stack consists of:
- **Caddy**: Reverse proxy, SSL termination (Auto HTTPS), and static file server.
- **App (Web)**: Nginx container serving the built React/Vite assets (internal only).
- **API**: Node.js Fastify API (internal only). Branding uploads are stored on the `api_uploads` Docker volume at `/app/uploads`.
- **Postgres**: Database (internal, persisted to volume).
- **Redis**: Rate limiting and throttles for OTP, staff PIN login, and transaction velocity (internal only; default URL `redis://redis:6379` on the Compose network).

Traffic flow:
`Internet -> Caddy (443) -> /api/* -> Node API:8000`
`Internet -> Caddy (443) -> /uploads/* -> Node API:8000` (branding images)
`Internet -> Caddy (443) -> /* -> Web Container:80`

## 3. Server Setup

### 3.1 Directory Structure
Create a directory for the app (e.g., `/opt/loyalty-pwa` or `~/loyalty-pwa`).

```bash
mkdir -p ~/loyalty-pwa
cd ~/loyalty-pwa
```

### 3.2 Environment Variables (.env)
Create a `.env` file in the root of your deployment directory. **Do not commit this to Git.**

```ini
# Database
POSTGRES_USER=loyalty_app
POSTGRES_PASSWORD=YOUR_STRONG_RANDOM_PASSWORD
POSTGRES_DB=loyalty
# HOST set to service name 'db' for internal docker networking
DB_HOST=db
# Use hardcoded values to ensure reliability
DATABASE_URL=postgresql://loyalty_app:YOUR_STRONG_RANDOM_PASSWORD@db:5432/loyalty?schema=public

# API Configuration
NODE_ENV=production
PORT=8000
API_HOST=0.0.0.0
# Redis (must match your Compose service name or managed endpoint)
REDIS_URL=redis://redis:6379

# Optional — rate limit tuning (defaults match docs/TECH-SPEC.md §5.2)
# RATE_LIMIT_OTP_PER_PHONE_HOUR=5
# RATE_LIMIT_OTP_PER_IP_HOUR=20
# RATE_LIMIT_STAFF_LOGIN_PER_MINUTE=10
# RATE_LIMIT_STAFF_LOGIN_LOCKOUT_SECONDS=300
# RATE_LIMIT_STAMP_PER_STAFF_HOUR=60
# RATE_LIMIT_REDEEM_PER_STAFF_HOUR=20
# The domain where the app is hosted
CORS_ALLOWED_ORIGIN=https://punchcard.co.za
# Public site origin for branding upload URLs (scheme + host, no trailing slash, no /api path)
PUBLIC_ORIGIN=https://punchcard.co.za

# WebAuthn / passkeys (required for member passkey registration and sign-in)
# RP ID must be the public hostname only (no scheme, path, or port). Origins must match
# every URL users use to open the PWA (include www separately if you serve both).
WEBAUTHN_RP_ID=punchcard.co.za
WEBAUTHN_RP_NAME=Punchcard
WEBAUTHN_ORIGIN=https://punchcard.co.za

# Security Secrets (Generate new random strings)
JWT_SECRET=long_random_string_here
COOKIE_SECRET=cookie_signing_random_string_here
TOKEN_SIGNING_SECRET=another_long_random_string
OTP_PEPPER=random_pepper_string

# Admin Setup (For seeding)
ADMIN_EMAIL=admin@punchcard.co.za
ADMIN_PASSWORD=secure_admin_password

# OTP delivery: SMSFlow only. If SMSFlow is not configured, OTP is logged only for local testing.
# SMSFlow uses the Portal Integration flow:
#   GET  /api/integration/authentication with Basic Auth (ClientID/ClientSecret)
#   POST /api/integration/BulkMessages with the returned bearer token
SMSFLOW_CLIENT_ID=your_client_id_from_portal
SMSFLOW_CLIENT_SECRET=your_client_secret_from_portal
# SMSFLOW_SENDER_ID=Loyalty   (optional; branding may require pre-approval)
```

**Verifying OTP:** Call `GET /health`. The response includes `otp_provider: "smsflow"` and `otp_configured: true|false`. If `false`, set the SMSFlow env vars and restart the API. Check API logs for `[SMSFlowService] SMSFlow ENABLED` or `DISABLED`.

**Verifying Redis:** The same `GET /health` response includes `redis_ok: true` when the API can reach Redis. A **503** indicates Redis is unreachable (rate limits cannot be enforced); ensure the `redis` service is running and `REDIS_URL` is correct.



### 3.3 Database Initialization (First Run)
When setting up the server for the first time, you need to create the tables and the admin user.

1.  **Deploy first**: Run `./deploy.sh` (or let GitHub Actions do it). This starts containers and **runs migrations automatically**.
2.  **Seed Data (Create Admin User)** — first run only:
    ```bash
    docker compose exec api pnpm db:seed
    ```
    *This creates the admin user. If `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set in `.env`, those are used; otherwise defaults to `admin@punchcard.co.za` / `password1234`. The seed script will automatically migrate any existing admin user from `admin@loyalty.com` to the new email if present.*

For full database details (users, credentials, safe schema changes), see [docs/DATABASE-SETUP.md](DATABASE-SETUP.md).

### 3.4 Deployment Script
The repository includes a `deploy.sh` script. Ensure it is executable on the server:

```bash
chmod +x deploy.sh
```

### 3.5 Branding uploads persistence

Vendor branding images (logos, wordmarks, card backgrounds) are written to `/app/uploads` inside the API container and persisted via the **`api_uploads`** named Docker volume (`docker-compose.yml`). This volume survives container rebuilds and `./deploy.sh full` image rebuilds.

- **Backup**: Include the `api_uploads` volume in your VPS backup strategy alongside `db_data`.
- **URL shape**: Upload responses return `https://{PUBLIC_ORIGIN}/uploads/branding/...` (no `/api` prefix). Caddy proxies `/uploads/*` to the API.
- **Existing bad URLs**: Migration `20260619130000_fix_branding_upload_urls` rewrites stored `/api/uploads/` URLs to `/uploads/`. Files that were lost before this volume existed must be re-uploaded by affected vendors.

## 4. Automated Deployment (GitHub Actions)

The repository is configured to deploy automatically on push to `main` via `.github/workflows/deploy.yml`.

### 4.1 GitHub Secrets
Go to **Settings > Secrets and variables > Actions** in your GitHub repository and add:

- `VPS_HOST`: The IP address or hostname of your VPS.
- `VPS_USER`: The SSH username (e.g., `root` or `ubuntu`).
- `VPS_SSH_KEY`: The private SSH key (PEM format) to access the VPS.

### 4.2 Workflow
1. GitHub Action connects to `VPS_HOST` via SSH.
2. Navigates to the deployment directory (`~/loyalty-pwa`).
3. Pulls the latest code using `git pull`.
4. Executes `./deploy.sh`.
5. `deploy.sh` builds Docker images, starts containers, runs `db:deploy` (migrations), **verifies migration status** (fails deploy if pending/failed migrations remain), and prunes unused images.

## 5. Manual Deployment

If you need to deploy manually without GitHub Actions:

1. SSH into your server.
2. Navigate to the folder: `cd ~/loyalty-pwa`.
3. Pull changes: `git pull origin main`.
4. Run the script: `./deploy.sh`.

## 6. Local Development

To run the production setup locally (for testing exactly what is on the server):
```bash
docker compose up -d --build
```

To run the **development** setup (with hot-reloading):
```bash
# Start Dev Containers (use dev.ps1 on Windows: .\dev.ps1 up -d --build)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build

# Rebuild specific service (e.g. api) after dependencies change
docker compose -f docker-compose.yml -f docker-compose.dev.yml build api
docker compose -f docker-compose.yml -f docker-compose.dev.yml restart api
```
See [development-Docker-startup.txt](development-Docker-startup.txt) and [DATABASE-SETUP.md](DATABASE-SETUP.md).

## 7. Verification

After deployment:
1. Visit `https://punchcard.co.za`. The PWA should load.
2. Check `https://punchcard.co.za/api/health`. Should return `{"status":"ok"}`.
   - **Note:** `/health` checks Redis and OTP config only — it does **not** confirm the database schema matches `schema.prisma`. `deploy.sh` runs `prisma migrate status` after migrations and **exits with an error** if migrations are pending or failed.
3. Check logs if needed: `docker compose logs -f api`.
4. Manual migration check: `docker compose run --rm api pnpm prisma migrate status` (expect `Database schema is up to date!`).

## 8. Troubleshooting

- **502 Bad Gateway**: Usually means the API container is crashing or starting up. Check logs: `docker compose logs api`.
  - After the security hardening update, confirm `.env` contains non-empty values for `JWT_SECRET`, `COOKIE_SECRET`, `TOKEN_SIGNING_SECRET`, `OTP_PEPPER`, `SMSFLOW_CLIENT_ID`, and `SMSFLOW_CLIENT_SECRET`. Missing required secrets cause the API to fail startup.
- **CORS Errors**: Ensure `CORS_ALLOWED_ORIGIN` in `.env` matches your browser URL exactly (no trailing slash).
- **Passkeys / “not configured on this server”**: Set `WEBAUTHN_RP_ID`, `WEBAUTHN_RP_NAME`, and `WEBAUTHN_ORIGIN` on the API service (see above), then restart the API. If users open the site at both apex and `www`, list both origins comma-separated in `WEBAUTHN_ORIGIN`.
- **Database Connection**: Ensure `DB_HOST=db` in `.env`.
- **API healthy but features fail / missing columns**: `GET /health` can pass while migrations are behind. Run `docker compose run --rm api pnpm prisma migrate status`. If pending or failed migrations are listed, run `./deploy.sh migrate`. For stuck failed migrations (P3018/P3009), see [DATABASE-SETUP.md](DATABASE-SETUP.md) and [db_migration_fix.md](../db_migration_fix.md).
- **`rebuild` / `restart` without migrations**: `./deploy.sh rebuild` and `./deploy.sh restart` update containers but do **not** run `db:deploy`. The script still verifies migration status at the end and fails with a clear message if the schema is not up to date.
- **Broken branding images after deploy**: Confirm `PUBLIC_ORIGIN` matches your public hostname (no `/api` suffix). Check Caddy routes `/uploads/*` to the API. Verify the `api_uploads` volume is mounted: `docker compose exec api ls /app/uploads`. If URLs in the DB were fixed by migration but files are missing, re-upload branding in the vendor admin UI.
