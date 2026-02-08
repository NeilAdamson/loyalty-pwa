-- Create loyalty_app role and grant permissions
-- Run as postgres superuser when the DB was initialized with a different user
-- Usage: docker compose exec -T db psql -U postgres -d loyalty -f - < scripts/init-loyalty-app-user.sql
-- Or:    docker compose exec db psql -U postgres -d loyalty -v password="'YOUR_PASSWORD'" -f scripts/init-loyalty-app-user.sql

-- Create role if it doesn't exist (avoids error on re-run)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'loyalty_app') THEN
    CREATE ROLE loyalty_app WITH LOGIN PASSWORD 'e74a89c3120d4f5b9e8c2a3b';
  ELSE
    ALTER ROLE loyalty_app WITH PASSWORD 'e74a89c3120d4f5b9e8c2a3b';
  END IF;
END
$$;

-- Grant connect on database
GRANT CONNECT ON DATABASE loyalty TO loyalty_app;

-- Schema permissions (run with: psql -U postgres -d loyalty -f ...)
GRANT USAGE ON SCHEMA public TO loyalty_app;
GRANT CREATE ON SCHEMA public TO loyalty_app;

-- Existing objects
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO loyalty_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO loyalty_app;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO loyalty_app;

-- Default for future objects (Prisma migrations)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO loyalty_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO loyalty_app;
