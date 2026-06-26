#!/usr/bin/env bash
# Validates that all required environment variables are set.
# Usage: ./scripts/env-validate.sh [staging|production]
set -euo pipefail

ENV=${1:-production}
ERRORS=0

check() {
  local VAR="$1"
  local VAL="${!VAR:-}"
  if [ -z "$VAL" ]; then
    echo "  MISSING: $VAR"
    ERRORS=$((ERRORS + 1))
  else
    echo "  OK:      $VAR"
  fi
}

check_min_len() {
  local VAR="$1"
  local MIN="$2"
  local VAL="${!VAR:-}"
  if [ -z "$VAL" ]; then
    echo "  MISSING: $VAR"
    ERRORS=$((ERRORS + 1))
  elif [ "${#VAL}" -lt "$MIN" ]; then
    echo "  TOO_SHORT: $VAR (min ${MIN} chars, got ${#VAL})"
    ERRORS=$((ERRORS + 1))
  else
    echo "  OK:      $VAR"
  fi
}

echo ""
echo "============================================================"
echo "  Reno Environment Validation — ${ENV}"
echo "============================================================"

echo ""
echo "Database:"
check DATABASE_URL

echo ""
echo "Redis:"
check REDIS_URL

echo ""
echo "Secrets:"
check_min_len JWT_SECRET 64
check_min_len JWT_REFRESH_SECRET 64
check_min_len ENCRYPTION_KEY 32
check_min_len BACKUP_ENCRYPTION_KEY 32
check RESTORE_APPROVAL_TOKEN

echo ""
echo "AI:"
check OPENAI_API_KEY

if [ "$ENV" = "production" ]; then
  echo ""
  echo "Production-only:"
  check GRAFANA_ADMIN_PASSWORD
fi

echo ""
echo "============================================================"
if [ "$ERRORS" -gt 0 ]; then
  echo "  FAILED: ${ERRORS} variable(s) missing or invalid."
  echo "  Copy .env.${ENV}.example and fill in all values."
  echo "============================================================"
  exit 1
else
  echo "  PASSED: All required environment variables are set."
  echo "============================================================"
fi
