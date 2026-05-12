# Loyalty PWA Monorepo

A multi-tenant digital loyalty stamp card system built with Node.js, Prisma, PostgreSQL, and React (Vite).

## Prerequisites

*   **Docker Desktop**: Running with WSL2 engine (Windows) or standard (Mac/Linux).
*   **Git**: To clone the repository.
*   **No Host Installs Needed**: You do NOT need Node.js or PostgreSQL installed on your host machine. All development happens inside Docker.

## Quick Start (Fresh Install)

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd loyalty-pwa
    ```

2.  **Start the environment**
    Start all services (API, Web, Database, Redis, pgAdmin) in the background:
    ```bash
    docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
    ```
    *Wait a few moments for the database to become healthy.*

3.  **Initialize the Database (Crucial for first run)**
    On a fresh clone, the database is empty. You must run migrations and seed.
    
    ```bash
    .\dev.ps1 exec api pnpm db:deploy
    .\dev.ps1 exec api pnpm db:seed
    ```
    Or without dev.ps1: `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec api pnpm db:deploy` (then same for seed).

4.  **Access the App**
    *   **Web App**: [http://localhost:5173](http://localhost:5173)
    *   **Admin Portal**: [http://localhost:5173/admin/login](http://localhost:5173/admin/login)
    *   **API Health**: [http://localhost:8000/health](http://localhost:8000/health)
    *   **pgAdmin**: [http://localhost:5050](http://localhost:5050) (Email: `admin@admin.com`, Pass: `root`)

## Default Credentials

### Platform Admin
*   **URL**: `/admin/login`
*   **Email**: `admin@punchcard.co.za`
*   **Password**: `password1234` (change after first login)

### Demo Vendor
*   **Vendor Slug**: `demo-cafe` (Access at `/v/demo-cafe`)
*   **Vendor Owner Email**: `owner@demo-cafe.test`
*   **Vendor Owner Password**: `password1234`
*   **Staff Username**: `alice`
*   **Staff PIN**: `1234`

### Vendor & staff portal (tenant)

- **Vendor self-service registration**: [`/vendor/register`](http://localhost:5173/vendor/register) — creates a vendor owner account with email verification, then opens the setup wizard.
- **Vendor admin login**: [`/vendor/admin/login`](http://localhost:5173/vendor/admin/login) — owners/managers use email + password for admin tasks.
- **Staff portal entry**: [`/vendor/login`](http://localhost:5173/vendor/login) — enter the **store slug** (Store ID), then sign in with staff **username + PIN** at `/v/{slug}/staff`.
- **Direct staff login (bookmark-friendly)**: `/v/{slug}/staff` — skips the slug picker; ideal for fixed tablets at the counter.
- **Roles** (staff accounts):
  - **`ADMIN`** — legacy staff-manager login: after PIN login, opens `/v/{slug}/admin/*`. Owner/manager email accounts should use `/vendor/admin/login`.
  - **`STAMPER`** — counter role only: after login, opens `/v/{slug}/staff/scan` (stamp / redeem scanner).
- **Onboarding wizard**: self-service vendors land on `/v/{slug}/admin/onboarding` to complete business details, branch, program, branding, staff, and billing setup.
- **Slug validation**: `/vendor/login` checks `GET /api/v1/v/{slug}/portal/status` before redirect (vendor must exist and not be suspended; matches staff-login eligibility including trial vendors).
- **Recent slug**: The browser remembers the last successful slug on this device for quicker return visits.

## Troubleshooting

### "Table does not exist" or "Admin User not found"
If you see errors related to missing tables or invalid credentials immediately after `docker compose up`, it means you skipped **Step 3**. The database volume is empty by default. Run the migration and seed commands above to fix it.

### Staff login diagnostics
If a staff/stamper login fails on `/v/{vendorSlug}/staff`, the UI now shows a compact diagnostic line with the backend HTTP status, error code, and message (for example `HTTP 401 | STAFF_PIN_INVALID | Invalid credentials`).  
Use this together with API logs to quickly distinguish credential issues from route/vendor mismatches.

### Passkeys (WebAuthn)

- **Passkey routes** require **`WEBAUTHN_RP_ID`**, **`WEBAUTHN_RP_NAME`**, and **`WEBAUTHN_ORIGIN`** on the API (see `.env.example` and `docker-compose.dev.yml`). If these are missing or invalid, those endpoints respond with **503** and code `PASSKEY_NOT_SUPPORTED`; the rest of the API (admin cookie login, vendor admin JWT, member OTP, staff PIN, and so on) still starts normally.
- Local dev: use **`WEBAUTHN_RP_ID=localhost`** with origins `http://localhost:5173` (and optionally `http://127.0.0.1:5173`). Production: set RP ID to your real public hostname (see `docs/SECURITY.md`).
- Members can add a passkey after SMS login; staff can add one after PIN login. SMS / PIN remain available for recovery.

### OTP / SMS not sending

- Check `http://localhost:8000/health` and confirm:
  - `"otp_provider": "smsflow"` and
  - `"otp_configured": true`.
- Configure `SMSFLOW_CLIENT_ID`, `SMSFLOW_CLIENT_SECRET`, and optional `SMSFLOW_SENDER_ID`.
- The API uses the Portal Integration flow: it first calls `/api/integration/authentication` with Basic Auth (ClientID/ClientSecret), then sends OTPs via `/api/integration/BulkMessages`.
- If SMSFlow is misconfigured, OTPs are not sent externally but the API logs the OTP code to assist local testing.

### Docker-Only Rule
Do not try to run `pnpm install` or `pnpm dev` on your host machine.
Always use `.\dev.ps1 exec api ...` (or `docker compose ... exec api ...`) for backend commands.

### Building the web app in Docker
To type-check and build the frontend inside Docker (e.g. to verify the build), use the **dev** stack so the web container has Node:  
`.\dev.ps1 run --rm web pnpm run build`  
Using only the default compose (`docker compose run --rm web ...`) uses the production image, which has no Node and will not run `pnpm` or `tsc`.

### Slow first page load in local dev
If the first visit to `http://localhost:5173` or `http://localhost:5173/admin/login` feels slow, the bottleneck is usually Vite transforming bind-mounted source files inside Docker on Windows. The web app now prebundles common dependencies and warms the main/admin entry modules at dev-server startup so the delay happens up front instead of on the first browser navigation.

### Database Setup
For migrations, seeding, safe schema changes, and credentials, see [docs/DATABASE-SETUP.md](docs/DATABASE-SETUP.md).

## Production Deployment

For detailed instructions on deploying to a VPS (including Caddy, SSL, and CI/CD), see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
