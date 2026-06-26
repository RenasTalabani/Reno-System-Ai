#!/usr/bin/env bash
# Reno full deployment script (Docker Compose).
# Usage: ./scripts/deploy.sh <environment> <image_tag>
#   environment: staging | production
#   image_tag:   e.g. v26.0.0 or staging-abc1234
set -euo pipefail

ENV="${1:-}"
IMAGE_TAG="${2:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# ---- Validation ----
if [ -z "$ENV" ] || [ -z "$IMAGE_TAG" ]; then
  echo "Usage: $0 <environment> <image_tag>"
  exit 1
fi

if [ "$ENV" != "staging" ] && [ "$ENV" != "production" ]; then
  echo "ERROR: environment must be 'staging' or 'production'"
  exit 1
fi

COMPOSE_FILE="${ROOT_DIR}/docker-compose.${ENV}.yml"
if [ ! -f "$COMPOSE_FILE" ]; then
  echo "ERROR: ${COMPOSE_FILE} not found"
  exit 1
fi

# ---- Env validation ----
echo ""
echo ">>> Validating environment variables..."
bash "${SCRIPT_DIR}/env-validate.sh" "$ENV"

# ---- Migration check ----
echo ""
echo ">>> Checking pending migrations..."
bash "${SCRIPT_DIR}/migrate.sh" --check-only
echo ">>> Running migrations..."
bash "${SCRIPT_DIR}/migrate.sh"

# ---- Pull images ----
echo ""
echo ">>> Pulling images (tag: ${IMAGE_TAG})..."
IMAGE_TAG="${IMAGE_TAG}" docker compose -f "${COMPOSE_FILE}" pull

# ---- Deploy ----
echo ""
echo ">>> Deploying ${ENV} (tag: ${IMAGE_TAG})..."
IMAGE_TAG="${IMAGE_TAG}" docker compose -f "${COMPOSE_FILE}" up -d --no-build

# ---- Health check ----
echo ""
echo ">>> Running health check..."
API_PORT="${API_PORT:-4000}"
bash "${SCRIPT_DIR}/health-check.sh" "http://localhost:${API_PORT}" 24 5

echo ""
echo "============================================================"
echo "  Deployment complete: ${ENV} @ ${IMAGE_TAG}"
echo "============================================================"
