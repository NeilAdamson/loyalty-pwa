#!/usr/bin/env bash
set -euo pipefail

# Navigate to project directory (using $HOME for flexibility)
cd "$HOME/loyalty-pwa"

# Pull latest code
git pull origin main

# Build and start services (detached)
# The --build flag ensures we rebuild images with new code
docker compose up -d --build --remove-orphans

# Apply pending migrations (idempotent; safe when no schema changes)
# Uses run --rm so migrations work even if api is crash-looping (e.g. first deploy).
docker compose run --rm api pnpm db:deploy

# Clean up unused images (optional, saves space)
docker image prune -f
