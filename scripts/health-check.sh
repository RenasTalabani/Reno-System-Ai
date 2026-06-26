#!/usr/bin/env bash
# Polls the API /health endpoint until it returns 200 or timeout.
# Usage: ./scripts/health-check.sh <api_url> [max_attempts] [interval_sec]
set -euo pipefail

API_URL="${1:-http://localhost:4000}"
MAX="${2:-24}"
INTERVAL="${3:-5}"

echo ""
echo "Health check: ${API_URL}/health"
echo "Max attempts: ${MAX}  Interval: ${INTERVAL}s"
echo ""

for i in $(seq 1 "$MAX"); do
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/health" 2>/dev/null || echo "000")
  TIMESTAMP=$(date '+%H:%M:%S')
  if [ "$HTTP_STATUS" = "200" ]; then
    echo "[${TIMESTAMP}] Attempt ${i}/${MAX}: HTTP ${HTTP_STATUS} — HEALTHY"
    exit 0
  else
    echo "[${TIMESTAMP}] Attempt ${i}/${MAX}: HTTP ${HTTP_STATUS} — waiting..."
    sleep "$INTERVAL"
  fi
done

echo ""
echo "Health check FAILED after $((MAX * INTERVAL))s"
exit 1
