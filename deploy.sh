#!/usr/bin/env bash
set -euo pipefail

# Simple deploy helper for the loyalty-pwa stack.
# Usage:
#   ./deploy.sh                 # same as "./deploy.sh full"
#   ./deploy.sh full            # git pull + build/up + migrate + verify + image prune
#   ./deploy.sh up              # docker compose up -d (no pull, no build; verifies migrations)
#   ./deploy.sh rebuild         # docker compose up -d --build --remove-orphans (no migrate; verifies)
#   ./deploy.sh down            # docker compose down
#   ./deploy.sh restart         # docker compose down && docker compose up -d (verifies migrations)
#   ./deploy.sh migrate         # run api migrations + verify only

CMD="${1:-full}"

# Navigate to the repository directory containing this script.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

require_env_file_keys() {
  if [ ! -f .env ]; then
    echo "[deploy] ERROR: .env file not found in $(pwd)"
    exit 1
  fi

  local missing=0
  for key in JWT_SECRET COOKIE_SECRET TOKEN_SIGNING_SECRET OTP_PEPPER SMSFLOW_CLIENT_ID SMSFLOW_CLIENT_SECRET; do
    if ! grep -Eq "^${key}=.+" .env; then
      echo "[deploy] ERROR: Missing required .env value: ${key}"
      missing=1
    fi
  done

  if [ "$missing" -ne 0 ]; then
    echo "[deploy] Add the missing values to .env before deploying."
    exit 1
  fi
}

# Run a one-off command in the api container (migrations, prisma status, etc.).
api_compose_run() {
  docker compose run --rm \
    -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    api "$@"
}

run_db_deploy() {
  echo "[deploy] Running database migrations (api pnpm db:deploy)..."
  api_compose_run pnpm db:deploy
}

# Exit non-zero when pending or failed migrations remain. /health does not check schema.
verify_migration_status() {
  echo "[deploy] Verifying database migration status..."
  local output=""
  local prisma_status=0

  if ! output="$(api_compose_run pnpm prisma migrate status 2>&1)"; then
    prisma_status=1
  fi

  echo "$output"

  if [ "$prisma_status" -ne 0 ] || ! echo "$output" | grep -q "Database schema is up to date!"; then
    echo ""
    echo "[deploy] *** DATABASE MIGRATION CHECK FAILED ***"
    echo "[deploy] Pending or failed migrations detected. The API may be healthy while the"
    echo "[deploy] database is behind schema.prisma — endpoints using newer columns can fail."
    echo "[deploy]"
    echo "[deploy] Next steps:"
    echo "[deploy]   1. Inspect: docker compose run --rm api pnpm prisma migrate status"
    echo "[deploy]   2. Apply:  ./deploy.sh migrate"
    echo "[deploy]   3. If a migration failed (P3018/P3009), see docs/DATABASE-SETUP.md and db_migration_fix.md"
    return 1
  fi

  echo "[deploy] Database migrations: OK (schema up to date)"
}

case "$CMD" in
  full)
    require_env_file_keys

    echo "[deploy] Pulling latest code from main..."
    git pull origin main

    echo "[deploy] Building and starting services (detached, with --build)..."
    docker compose up -d --build --remove-orphans

    run_db_deploy
    verify_migration_status

    echo "[deploy] Pruning unused Docker images..."
    docker image prune -f
    ;;

  up)
    require_env_file_keys

    echo "[deploy] docker compose up -d"
    docker compose up -d
    verify_migration_status
    ;;

  rebuild)
    require_env_file_keys

    echo "[deploy] docker compose up -d --build --remove-orphans"
    echo "[deploy] NOTE: rebuild does not run migrations — use './deploy.sh full' or './deploy.sh migrate' after schema changes."
    docker compose up -d --build --remove-orphans
    verify_migration_status
    ;;

  down)
    echo "[deploy] docker compose down"
    docker compose down
    ;;

  restart)
    require_env_file_keys

    echo "[deploy] docker compose down && docker compose up -d"
    echo "[deploy] NOTE: restart does not run migrations — use './deploy.sh migrate' if schema changed."
    docker compose down
    docker compose up -d
    verify_migration_status
    ;;

  migrate)
    require_env_file_keys

    run_db_deploy
    verify_migration_status
    ;;

  *)
    echo "Usage: $0 [full|up|rebuild|down|restart|migrate]"
    exit 1
    ;;
esac
