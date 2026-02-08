#!/bin/bash
# PostgreSQL init script: ensures loyalty_app role exists on first DB initialization.
# Runs only when the data directory is empty (first-ever container start).
# If POSTGRES_USER is already loyalty_app, the main init created it; otherwise we create it here.
set -e

if [ "$POSTGRES_USER" = "loyalty_app" ]; then
  echo "loyalty_app is the primary user; no need to create."
  exit 0
fi

echo "Creating loyalty_app role (primary user is $POSTGRES_USER)..."
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<-EOSQL
  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'loyalty_app') THEN
      CREATE ROLE loyalty_app WITH LOGIN PASSWORD '${POSTGRES_PASSWORD}';
      RAISE NOTICE 'Created role loyalty_app';
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
EOSQL
echo "loyalty_app role ready."
