# Rule: Docker-Only Local Development

**Crucial**: All local development for this project MUST run inside Docker containers.

1.  **No Host Installs**: Do not act as if Node.js, PostgreSQL, or other runtime dependencies are installed on the host machine.
2.  **Use Docker Compose** (development):
    *   Start: `.\dev.ps1 up -d --build` (or `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build`)
    *   Run backend commands: `.\dev.ps1 exec api pnpm <script>` (e.g. `pnpm db:deploy`, `pnpm lint`)
    *   Run web commands: `.\dev.ps1 exec web pnpm <script>`
3.  **File System**:
    *   Source code is bind-mounted via `docker-compose.yml` and `docker-compose.dev.yml`.
    *   Changes on the host constitute "Development".
    *   `node_modules` are container-managed (anonymous volumes).

**Verification**:
If a command implies `npm install` or `node server.js` running directly on the host, it is a VIOLATION.
