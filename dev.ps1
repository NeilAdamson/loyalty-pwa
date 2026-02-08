<#
.SYNOPSIS
A helper script to run Docker Compose commands with the Development configuration.
It automatically includes both the base 'docker-compose.yml' and the 'docker-compose.dev.yml' override.

.EXAMPLE
Start the dev environment:
.\dev.ps1 up -d

.EXAMPLE
Restart the API (as requested):
.\dev.ps1 restart api

.EXAMPLE
View logs:
.\dev.ps1 logs -f
#>

$devFiles = @("-f", "docker-compose.yml", "-f", "docker-compose.dev.yml")

if ($args.Count -eq 0) {
    Write-Host "Development Environment Helper" -ForegroundColor Green
    Write-Host "------------------------------"
    Write-Host "This script runs 'docker compose' with the dev configuration files."
    Write-Host ""
    Write-Host "Usage examples:"
    Write-Host "  .\dev.ps1 up -d --build     (Start everything)"
    Write-Host "  .\dev.ps1 down              (Stop everything)"
    Write-Host "  .\dev.ps1 restart api       (Restart backend only)"
    Write-Host "  .\dev.ps1 logs -f api       (Follow logs)"
    Write-Host "  .\dev.ps1 exec api pnpm db:deploy   (Run migrations)"
    Write-Host "  .\dev.ps1 exec api pnpm db:seed     (Seed admin + demo)"
    exit
}

# Run the command
& docker compose $devFiles @args
