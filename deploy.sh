#!/usr/bin/env bash
set -euo pipefail

# Navigate to project directory
cd /home/neil/loyalty

# Pull latest code
git pull origin main

# Build and start services (detached)
# The --build flag ensures we rebuild images with new code
docker compose up -d --build --remove-orphans

# Clean up unused images (optional, saves space)
docker image prune -f
