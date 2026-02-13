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
    Start all services (API, Web, Database, pgAdmin) in the background:
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
*   **Staff Username**: `alice`
*   **Staff PIN**: `1234`

## Troubleshooting

### "Table does not exist" or "Admin User not found"
If you see errors related to missing tables or invalid credentials immediately after `docker compose up`, it means you skipped **Step 3**. The database volume is empty by default. Run the migration and seed commands above to fix it.

### OTP / SMS not sending

- Check `http://localhost:8000/health` and confirm:
  - `"otp_provider": "smsflow"` (or `"twilio"`) and
  - `"otp_configured": true`.
- For **SMSFlow** (default provider):
  - Set `OTP_PROVIDER=smsflow` in `.env`.
  - Configure `SMSFLOW_CLIENT_ID`, `SMSFLOW_CLIENT_SECRET`, and optional `SMSFLOW_SENDER_ID`.
  - The API uses the Portal Integration flow: it first calls `/api/integration/authentication` with Basic Auth (ClientID/ClientSecret), then sends OTPs via `/api/integration/BulkMessages`.
- For **Twilio**:
  - Set `OTP_PROVIDER=twilio` and configure `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` or API key/secret, and `TWILIO_FROM_NUMBER`.
- If a provider is misconfigured, OTPs are not sent externally but the API logs the OTP code to assist local testing.

### Docker-Only Rule
Do not try to run `pnpm install` or `pnpm dev` on your host machine.
Always use `.\dev.ps1 exec api ...` (or `docker compose ... exec api ...`) for backend commands.

### Database Setup
For migrations, seeding, safe schema changes, and credentials, see [docs/DATABASE-SETUP.md](docs/DATABASE-SETUP.md).

## Production Deployment

For detailed instructions on deploying to a VPS (including Caddy, SSL, and CI/CD), see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
