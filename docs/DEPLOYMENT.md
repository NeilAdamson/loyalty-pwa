# Production Deployment Guide (VPS)

This guide details how to deploy the Loyalty PWA to a Linux VPS using Docker Compose and Caddy.

## 1. Prerequisites

- **VPS**: Ubuntu 22.04 LTS (or similar) with at least 2GB RAM.
- **Domain**: A domain name pointed to your VPS IP (e.g., `loyaltyladies.com`).
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
CORS_ALLOWED_ORIGIN=https://loyaltyladies.com

# Security Secrets (Generate new random strings)
JWT_SECRET=long_random_string_here
TOKEN_SIGNING_SECRET=another_long_random_string
OTP_PEPPER=random_pepper_string

# Admin Setup (For seeding)
ADMIN_EMAIL=admin@loyaltyladies.com
ADMIN_PASSWORD=secure_admin_password

# Third Party (If used)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
```



### 3.3 Database Initialization (First Run)
When setting up the server for the first time, you need to create the tables and the admin user.

1.  **Deploy first**: Run `./deploy.sh` (or let GitHub Actions do it) to get the containers running.
2.  **Run Migrations**:
    ```bash
    docker compose exec api pnpm db:deploy
    ```
3.  **Seed Data (Create Admin User)**:
    ```bash
    docker compose exec api pnpm db:seed
    ```
    *This creates the default admin user using `ADMIN_EMAIL` and `ADMIN_PASSWORD` from your `.env`.*

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
5. `deploy.sh` builds the Docker images, generates Prisma client, runs migrations, and restarts containers.

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
# Start Dev Containers
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Rebuild specific service (e.g. api) after dependencies change
docker compose -f docker-compose.yml -f docker-compose.dev.yml build api
docker compose -f docker-compose.yml -f docker-compose.dev.yml restart api
```

## 7. Verification

After deployment:
1. Visit `https://loyaltyladies.com`. The PWA should load.
2. Check `https://loyaltyladies.com/api/health`. Should return `{"status":"ok"}`.
3. Check logs if needed: `docker compose logs -f api`.

## 8. Troubleshooting

- **502 Bad Gateway**: Usually means the API container is crashing or starting up. Check logs: `docker compose logs api`.
- **CORS Errors**: Ensure `CORS_ALLOWED_ORIGIN` in `.env` matches your browser URL exactly (no trailing slash).
- **Database Connection**: Ensure `DB_HOST=db` in `.env`.
