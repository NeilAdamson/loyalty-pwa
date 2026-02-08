#!/usr/bin/env bash
# Creates the loyalty_app PostgreSQL role with full permissions on the loyalty database.
# Use when the DB was initialized with a different user (e.g. postgres) but the app expects loyalty_app.
#
# Run from project root: ./scripts/init-loyalty-app-user.sh
# Or with custom password: LOYALTY_APP_PASSWORD=mysecret ./scripts/init-loyalty-app-user.sh
#
# Requires: Docker Compose, db container running

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Password for loyalty_app (must match DATABASE_URL in .env)
# Default matches docker-compose.yml default
LOYALTY_APP_PASSWORD="${LOYALTY_APP_PASSWORD:-e74a89c3120d4f5b9e8c2a3b}"

# Try to load from .env if exists
if [[ -f .env ]]; then
  # Extract POSTGRES_PASSWORD for connecting as postgres (optional)
  # Extract from DATABASE_URL if present: postgresql://loyalty_app:PASSWORD@...
  if grep -q DATABASE_URL .env; then
    env_password=$(grep DATABASE_URL .env | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p' | head -1)
    if [[ -n "$env_password" ]]; then
      LOYALTY_APP_PASSWORD="$env_password"
    fi
  fi
fi

echo "Creating loyalty_app role (password from env/DATABASE_URL or default)..."

# Escape single quotes for SQL
PG_ESCAPED="${LOYALTY_APP_PASSWORD//\'/\'\'}"

# Create temp SQL with actual password
TMP_SQL=$(mktemp)
trap "rm -f $TMP_SQL" EXIT

cat > "$TMP_SQL" << EOF
-- Create loyalty_app role
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'loyalty_app') THEN
    CREATE ROLE loyalty_app WITH LOGIN PASSWORD '$PG_ESCAPED';
    RAISE NOTICE 'Created role loyalty_app';
  ELSE
    ALTER ROLE loyalty_app WITH PASSWORD '$PG_ESCAPED';
    RAISE NOTICE 'Updated password for loyalty_app';
  END IF;
END
\$\$;

GRANT CONNECT ON DATABASE loyalty TO loyalty_app;
GRANT USAGE ON SCHEMA public TO loyalty_app;
GRANT CREATE ON SCHEMA public TO loyalty_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO loyalty_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO loyalty_app;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO loyalty_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO loyalty_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO loyalty_app;
EOF

# Connect as postgres (superuser - exists when DB was init'd with POSTGRES_USER=postgres)
# Use docker compose exec -T for non-interactive
docker compose exec -T db psql -U postgres -d loyalty -f - < "$TMP_SQL"

echo "Done. Restart the API container if it was failing: docker compose restart api"
