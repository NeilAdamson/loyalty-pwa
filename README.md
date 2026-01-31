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
    docker compose up -d
    ```
    *Wait a few moments for the database to become healthy.*

3.  **Initialize the Database (Crucial for first run)**
    On a fresh clone, the database is empty. You must push the schema and seed default data.
    
    a. **Push Schema (Migrations)**
    ```bash
    docker compose run --rm api pnpm db:deploy
    ```
    
    b. **Seed Data (Create Admin User & Defaults)**
    ```bash
    docker compose run --rm api sh -c "npx prisma generate && pnpm db:seed"
    ```

4.  **Access the App**
    *   **Web App**: [http://localhost:5173](http://localhost:5173)
    *   **Admin Portal**: [http://localhost:5173/admin/login](http://localhost:5173/admin/login)
    *   **API Health**: [http://localhost:8000/health](http://localhost:8000/health)
    *   **pgAdmin**: [http://localhost:5050](http://localhost:5050) (Email: `admin@admin.com`, Pass: `root`)

## Default Credentials

### Platform Admin
*   **URL**: `/admin/login`
*   **Email**: `admin@loyalty.com`
*   **Password**: `password123`

### Demo Vendor
*   **Vendor Slug**: `demo-cafe` (Access at `/v/demo-cafe`)
*   **Staff PIN**: `1234`

## Troubleshooting

### "Table does not exist" or "Admin User not found"
If you see errors related to missing tables or invalid credentials immediately after `docker compose up`, it means you skipped **Step 3**. The database volume is empty by default. Run the migration and seed commands above to fix it.

### Docker-Only Rule
Do not try to run `pnpm install` or `pnpm dev` on your host machine.
Always use `docker compose run --rm api ...` for backend commands.
