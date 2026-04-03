param(
    [switch]$SkipMigrate,
    [switch]$SkipPostgisCheck
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $repoRoot

try {
    if (!(Test-Path ".env") -and (Test-Path ".env.example")) {
        Copy-Item ".env.example" ".env"
        Write-Host "[SecureSync] Created .env from .env.example"
    }

    Write-Host "[SecureSync] Starting infrastructure and app containers..."
    docker compose up -d
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose up failed"
    }

    $postgresRunning = docker inspect -f "{{.State.Running}}" securesync-postgres 2>$null
    if ($LASTEXITCODE -ne 0 -or $postgresRunning.Trim() -ne "true") {
        throw "Postgres container is not running"
    }

    $backendRunning = docker inspect -f "{{.State.Running}}" securesync-backend 2>$null
    if ($LASTEXITCODE -ne 0 -or $backendRunning.Trim() -ne "true") {
        throw "Backend container is not running. Check port conflicts and docker compose logs backend"
    }

    Write-Host "[SecureSync] Current container status:"
    docker compose ps
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose ps failed"
    }

    if (-not $SkipMigrate) {
        Write-Host "[SecureSync] Applying Alembic migrations..."
        docker compose exec -T backend alembic upgrade head
        if ($LASTEXITCODE -ne 0) {
            throw "Alembic migration failed"
        }
    }

    if (-not $SkipPostgisCheck) {
        Write-Host "[SecureSync] Verifying PostGIS extension availability..."
        docker exec -i securesync-postgres psql -U securesync -d securesync -c "SELECT PostGIS_Version();"
        if ($LASTEXITCODE -ne 0) {
            throw "PostGIS verification failed"
        }
    }

    Write-Host "[SecureSync] Stack is ready."
}
finally {
    Pop-Location
}
