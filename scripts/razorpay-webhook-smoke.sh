#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

get_dotenv_value() {
  local key="$1"
  if [[ ! -f .env ]]; then
    return 1
  fi

  local line
  line="$(grep -m1 "^${key}=" .env || true)"
  if [[ -z "$line" ]]; then
    return 1
  fi

  echo "${line#*=}"
}

BACKEND_PORT="$(get_dotenv_value BACKEND_PORT || true)"
if [[ -z "$BACKEND_PORT" ]]; then
  BACKEND_PORT="8000"
fi

BASE_URL="${1:-http://localhost:${BACKEND_PORT}}"

ENABLED_RAW="$(get_dotenv_value ENABLE_RAZORPAY_WEBHOOK || true)"
ENABLED_RAW="${ENABLED_RAW,,}"
if [[ "$ENABLED_RAW" != "true" ]]; then
  echo "[SecureSync] ENABLE_RAZORPAY_WEBHOOK must be true in .env to validate signature verification"
  exit 1
fi

SECRET="${RAZORPAY_WEBHOOK_SECRET:-}"
if [[ -z "$SECRET" ]]; then
  SECRET="$(get_dotenv_value RAZORPAY_WEBHOOK_SECRET || true)"
fi
if [[ -z "$SECRET" ]]; then
  echo "[SecureSync] RAZORPAY_WEBHOOK_SECRET is required (set env var or .env value)"
  exit 1
fi

PYTHON_BIN="python3"
if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  PYTHON_BIN="python"
fi
if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "[SecureSync] Python is required to compute webhook HMAC"
  exit 1
fi

PAYLOAD='{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_smoke_local","notes":{"payout_id":"999999"}}}}}'
SIGNATURE="$(SMOKE_SECRET="$SECRET" SMOKE_PAYLOAD="$PAYLOAD" "$PYTHON_BIN" - <<'PY'
import hashlib
import hmac
import os

secret = os.environ["SMOKE_SECRET"]
body = os.environ["SMOKE_PAYLOAD"]
print(hmac.new(secret.encode("utf-8"), body.encode("utf-8"), hashlib.sha256).hexdigest())
PY
)"
WEBHOOK_URL="${BASE_URL}/api/v1/payments/razorpay/webhook"

VALID_BODY_FILE="$(mktemp)"
INVALID_BODY_FILE="$(mktemp)"
trap 'rm -f "$VALID_BODY_FILE" "$INVALID_BODY_FILE"' EXIT

echo "[SecureSync] Sending signed webhook to $WEBHOOK_URL"
VALID_STATUS="$(curl -sS -o "$VALID_BODY_FILE" -w "%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: $SIGNATURE" \
  --data "$PAYLOAD")"

echo "[SecureSync] Valid signature response: $VALID_STATUS $(cat "$VALID_BODY_FILE")"

INVALID_STATUS="$(curl -sS -o "$INVALID_BODY_FILE" -w "%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: invalid-$SIGNATURE" \
  --data "$PAYLOAD")"

echo "[SecureSync] Invalid signature response: $INVALID_STATUS $(cat "$INVALID_BODY_FILE")"

if [[ "$VALID_STATUS" == "401" ]]; then
  echo "[SecureSync] Valid signature was rejected (401). Check secret alignment between script and backend container"
  exit 1
fi

if [[ "$INVALID_STATUS" != "401" ]]; then
  echo "[SecureSync] Invalid signature did not return 401. Signature verification path may not be active"
  exit 1
fi

echo "[SecureSync] Razorpay webhook signature smoke passed"
