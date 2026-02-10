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

# Navigate to project directory (using $HOME for flexibility)
cd "$HOME/loyalty-pwa"

case "$CMD" in
  full)
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
    echo "[deploy] docker compose up -d"
    docker compose up -d
    ;;

  rebuild)
    echo "[deploy] docker compose up -d --build --remove-orphans"
    docker compose up -d --build --remove-orphans
    ;;

  down)
    echo "[deploy] docker compose down"
    docker compose down
    ;;

  restart)
    echo "[deploy] docker compose down && docker compose up -d"
    docker compose down
    docker compose up -d
    ;;

  migrate)
    echo "[deploy] Running database migrations (api pnpm db:deploy)..."
    docker compose run --rm api pnpm db:deploy
    ;;

  *)
    echo "Usage: $0 [full|up|rebuild|down|restart|migrate]"
    exit 1
    ;;
esac

