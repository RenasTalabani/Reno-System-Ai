#!/usr/bin/env bash
# Runs Prisma migrations safely.
# Usage: ./scripts/migrate.sh [--check-only]
set -euo pipefail

CHECK_ONLY="${1:-}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set."
  exit 1
fi

echo ""
echo "============================================================"
echo "  Reno DB Migration"
echo "============================================================"
echo "  DATABASE_URL: ${DATABASE_URL//:*@/:***@}"
echo ""

if [ "$CHECK_ONLY" = "--check-only" ]; then
  echo "  Mode: CHECK ONLY (no changes applied)"
  pnpm --filter @reno/database exec prisma migrate status
  EXIT_CODE=$?
  if [ $EXIT_CODE -ne 0 ]; then
    echo ""
    echo "  WARNING: Pending migrations detected."
    exit 1
  fi
  echo "  OK: No pending migrations."
  exit 0
fi

echo "  Applying migrations..."
pnpm --filter @reno/database exec prisma migrate deploy

echo ""
echo "  Migrations applied successfully."
echo "============================================================"
