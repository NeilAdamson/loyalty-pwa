#!/usr/bin/env bash
set -euo pipefail

# Simple deploy helper for the loyalty-pwa stack.
# Usage:
#   ./deploy.sh                 # same as "./deploy.sh full"
#   ./deploy.sh full            # git pull + build/up + migrate + image prune
#   ./deploy.sh up              # docker compose up -d (no pull, no build)
#   ./deploy.sh rebuild         # docker compose up -d --build --remove-orphans (no pull, no migrate)
#   ./deploy.sh down            # docker compose down
#   ./deploy.sh restart         # docker compose down && docker compose up -d
#   ./deploy.sh migrate         # run api migrations only

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

case "$CMD" in
  full)
    require_env_file_keys

    echo "[deploy] Pulling latest code from main..."
    git pull origin main

    echo "[deploy] Building and starting services (detached, with --build)..."
    docker compose up -d --build --remove-orphans

    echo "[deploy] Running database migrations (api pnpm db:deploy)..."
    docker compose run --rm api pnpm db:deploy

    echo "[deploy] Pruning unused Docker images..."
    docker image prune -f
    ;;

  up)
    require_env_file_keys

    echo "[deploy] docker compose up -d"
    docker compose up -d
    ;;

  rebuild)
    require_env_file_keys

    echo "[deploy] docker compose up -d --build --remove-orphans"
    docker compose up -d --build --remove-orphans
    ;;

  down)
    echo "[deploy] docker compose down"
    docker compose down
    ;;

  restart)
    require_env_file_keys

    echo "[deploy] docker compose down && docker compose up -d"
    docker compose down
    docker compose up -d
    ;;

  migrate)
    require_env_file_keys

    echo "[deploy] Running database migrations (api pnpm db:deploy)..."
    docker compose run --rm api pnpm db:deploy
    ;;

  *)
    echo "Usage: $0 [full|up|rebuild|down|restart|migrate]"
    exit 1
    ;;
esac

