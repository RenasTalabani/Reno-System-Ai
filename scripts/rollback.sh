#!/usr/bin/env bash
# Roll back to a previous image tag.
# Usage: ./scripts/rollback.sh <environment> <previous_image_tag> <reason>
set -euo pipefail

ENV="${1:-}"
PREV_TAG="${2:-}"
REASON="${3:-manual rollback}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [ -z "$ENV" ] || [ -z "$PREV_TAG" ]; then
  echo "Usage: $0 <environment> <previous_image_tag> [reason]"
  exit 1
fi

COMPOSE_FILE="${ROOT_DIR}/docker-compose.${ENV}.yml"

echo ""
echo "============================================================"
echo "  Reno ROLLBACK"
echo "  Environment : ${ENV}"
echo "  Target tag  : ${PREV_TAG}"
echo "  Reason      : ${REASON}"
echo "============================================================"
echo ""
read -rp "Confirm rollback? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Rollback cancelled."
  exit 0
fi

echo ""
echo ">>> Pulling previous images (${PREV_TAG})..."
IMAGE_TAG="${PREV_TAG}" docker compose -f "${COMPOSE_FILE}" pull

echo ""
echo ">>> Switching traffic to ${PREV_TAG}..."
IMAGE_TAG="${PREV_TAG}" docker compose -f "${COMPOSE_FILE}" up -d --no-build

echo ""
echo ">>> Verifying rollback health..."
API_PORT="${API_PORT:-4000}"
bash "${SCRIPT_DIR}/health-check.sh" "http://localhost:${API_PORT}" 24 5

echo ""
echo "============================================================"
echo "  Rollback complete: ${ENV} is now running ${PREV_TAG}"
echo "============================================================"
