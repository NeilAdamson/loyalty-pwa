# Creates the loyalty_app PostgreSQL role. Use when DB was initialized with a different user.
# Run from project root: .\scripts\init-loyalty-app-user.ps1
# Requires: Docker Compose, db container running

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
Set-Location $projectRoot

# Default password (matches docker-compose)
$password = "e74a89c3120d4f5b9e8c2a3b"
if (Test-Path .env) {
    $line = Get-Content .env | Where-Object { $_ -match "^DATABASE_URL=" } | Select-Object -First 1
    if ($line -match "://[^:]*:([^@]*)@") {
        $password = $Matches[1]
    }
}

# Write SQL to temp file to avoid PowerShell $ escaping issues
$escapedPassword = $password -replace "'", "''"
$tempSql = [System.IO.Path]::GetTempFileName()
@"
DO `$`$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'loyalty_app') THEN
    CREATE ROLE loyalty_app WITH LOGIN PASSWORD '$escapedPassword';
    RAISE NOTICE 'Created role loyalty_app';
  ELSE
    ALTER ROLE loyalty_app WITH PASSWORD '$escapedPassword';
    RAISE NOTICE 'Updated password for loyalty_app';
  END IF;
END
`$`$;
GRANT CONNECT ON DATABASE loyalty TO loyalty_app;
GRANT USAGE ON SCHEMA public TO loyalty_app;
GRANT CREATE ON SCHEMA public TO loyalty_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO loyalty_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO loyalty_app;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO loyalty_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO loyalty_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO loyalty_app;
"@ | Set-Content -Path $tempSql -Encoding UTF8
try {
    Write-Host "Creating loyalty_app role..."
    Get-Content $tempSql -Raw | docker compose exec -T db psql -U postgres -d loyalty -f -
} finally {
    Remove-Item $tempSql -ErrorAction SilentlyContinue
}
Write-Host "Done. Restart API: docker compose restart api"
