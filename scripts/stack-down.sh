#!/usr/bin/env bash
set -euo pipefail

DELETE_VOLUMES="false"
if [[ "${1:-}" == "--volumes" ]]; then
  DELETE_VOLUMES="true"
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [[ "$DELETE_VOLUMES" == "true" ]]; then
  echo "[SecureSync] Stopping stack and removing volumes..."
  docker compose down --volumes
else
  echo "[SecureSync] Stopping stack..."
  docker compose down
fi
