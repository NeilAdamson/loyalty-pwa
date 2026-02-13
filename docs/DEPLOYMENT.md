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
- **API**: Node.js Fastify API (internal only).
- **Postgres**: Database (internal, persisted to volume).

Traffic flow:
`Internet -> Caddy (443) -> /api/* -> Node API:8000`
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
# The domain where the app is hosted
CORS_ALLOWED_ORIGIN=https://punchcard.co.za

# Security Secrets (Generate new random strings)
JWT_SECRET=long_random_string_here
TOKEN_SIGNING_SECRET=another_long_random_string
OTP_PEPPER=random_pepper_string

# Admin Setup (For seeding)
ADMIN_EMAIL=admin@punchcard.co.za
ADMIN_PASSWORD=secure_admin_password

# OTP delivery: default is smsflow. Set OTP_PROVIDER=twilio to use Twilio. If provider not configured, OTP is logged only.
# OTP_PROVIDER=smsflow   (default)
# OTP_PROVIDER=twilio

# --- Twilio (when OTP_PROVIDER=twilio) ---
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=14155238886
# TWILIO_OTP_CHANNEL=sms   use "sms" with trial "My Twilio phone number" (verified numbers only); use "whatsapp" with WhatsApp sandbox/approved From
# TWILIO_API_KEY=
# TWILIO_API_SECRET=

# --- SMSFlow (when OTP_PROVIDER=smsflow) ---
# POST https://api.smsflow.co.za/v1/messages — Bearer token = Client Secret (not Client ID). Phones: international without + (e.g. 27821234567).
# SMSFLOW_API_KEY=your_client_secret
# SMSFLOW_SENDER_ID=Loyalty   (optional; branding may require pre-approval)
```

**Verifying OTP:** Call `GET /health`. The response includes `otp_provider` (`twilio` \| `smsflow`) and `otp_configured: true|false`. If `false`, set the chosen provider’s env vars (Twilio or SMSFlow) and restart the API. Check API logs for `[WhatsAppService] Twilio ENABLED`, `[SMSFlowService] SMSFlow ENABLED`, or `DISABLED`.



### 3.3 Database Initialization (First Run)
When setting up the server for the first time, you need to create the tables and the admin user.

1.  **Deploy first**: Run `./deploy.sh` (or let GitHub Actions do it). This starts containers and **runs migrations automatically**.
2.  **Seed Data (Create Admin User)** — first run only:
    ```bash
    docker compose exec api pnpm db:seed
    ```
    *This creates the admin user. If `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set in `.env`, those are used; otherwise defaults to `admin@loyalty.com` / `password123`.*

For full database details (users, credentials, safe schema changes), see [docs/DATABASE-SETUP.md](DATABASE-SETUP.md).

### 3.4 Deployment Script
The repository includes a `deploy.sh` script. Ensure it is executable on the server:

```bash
chmod +x deploy.sh
```

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
5. `deploy.sh` builds Docker images, starts containers, runs `db:deploy` (migrations), and prunes unused images.

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
3. Check logs if needed: `docker compose logs -f api`.

## 8. Troubleshooting

- **502 Bad Gateway**: Usually means the API container is crashing or starting up. Check logs: `docker compose logs api`.
- **CORS Errors**: Ensure `CORS_ALLOWED_ORIGIN` in `.env` matches your browser URL exactly (no trailing slash).
- **Database Connection**: Ensure `DB_HOST=db` in `.env`.
