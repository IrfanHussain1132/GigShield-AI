#!/usr/bin/env bash
set -euo pipefail

SKIP_MIGRATE="false"
SKIP_POSTGIS="false"

for arg in "$@"; do
  case "$arg" in
    --skip-migrate) SKIP_MIGRATE="true" ;;
    --skip-postgis-check) SKIP_POSTGIS="true" ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [[ ! -f .env && -f .env.example ]]; then
  cp .env.example .env
  echo "[SecureSync] Created .env from .env.example"
fi

echo "[SecureSync] Starting infrastructure and app containers..."
docker compose up -d

POSTGRES_RUNNING="$(docker inspect -f '{{.State.Running}}' securesync-postgres 2>/dev/null || true)"
if [[ "$POSTGRES_RUNNING" != "true" ]]; then
  echo "[SecureSync] ERROR: Postgres container is not running"
  exit 1
fi

BACKEND_RUNNING="$(docker inspect -f '{{.State.Running}}' securesync-backend 2>/dev/null || true)"
if [[ "$BACKEND_RUNNING" != "true" ]]; then
  echo "[SecureSync] ERROR: Backend container is not running. Check port conflicts and docker compose logs backend"
  exit 1
fi

echo "[SecureSync] Current container status:"
docker compose ps

if [[ "$SKIP_MIGRATE" != "true" ]]; then
  echo "[SecureSync] Applying Alembic migrations..."
  docker compose exec -T backend alembic upgrade head
fi

if [[ "$SKIP_POSTGIS" != "true" ]]; then
  echo "[SecureSync] Verifying PostGIS extension availability..."
  docker exec -i securesync-postgres psql -U securesync -d securesync -c "SELECT PostGIS_Version();"
fi

echo "[SecureSync] Stack is ready."
