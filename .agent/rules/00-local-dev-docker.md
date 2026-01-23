# Rule: Docker-Only Local Development

**Crucial**: All local development for this project MUST run inside Docker containers.

1.  **No Host Installs**: Do not act as if Node.js, PostgreSQL, or other runtime dependencies are installed on the host machine.
2.  **Use Docker Compose**:
    *   To run the app: `docker compose up`
    *   To run scripts: `docker compose run --rm api pnpm lint` or `docker compose run --rm web pnpm test`
3.  **File System**:
    *   Source code is bind-mounted via `docker-compose.yml`.
    *   Changes on the host constitute "Development".
    *   `node_modules` are container-managed (anonymous volumes).

**Verification**:
If a command implies `npm install` or `node server.js` running directly on the host, it is a VIOLATION.
