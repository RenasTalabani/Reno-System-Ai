# =============================================================================
# Reno System API — Production Dockerfile
# Multi-stage build: install → build → prune → run
# =============================================================================

# Stage 1: base with pnpm
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app

# Stage 2: install all dependencies
FROM base AS installer
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/logger/package.json ./packages/logger/
COPY packages/core/package.json ./packages/core/
COPY packages/auth/package.json ./packages/auth/
RUN pnpm install --frozen-lockfile

# Stage 3: build
FROM installer AS builder
COPY . .
# Generate Prisma client
RUN pnpm --filter @reno/database exec prisma generate
# Build API
RUN pnpm --filter @reno/api build

# Stage 4: prune to production deps only
FROM installer AS pruner
RUN pnpm --filter @reno/api --prod deploy /app-prod

# Stage 5: production runtime (minimal image)
FROM node:22-alpine AS runner
RUN addgroup --system --gid 1001 reno && \
    adduser --system --uid 1001 --ingroup reno reno
WORKDIR /app

# Copy pruned deps + built output
COPY --from=pruner --chown=reno:reno /app-prod/node_modules ./node_modules
COPY --from=builder --chown=reno:reno /app/apps/api/dist ./dist
COPY --from=builder --chown=reno:reno /app/packages/database/src/generated/prisma ./node_modules/.prisma/client

# Non-root user
USER reno

EXPOSE 4000

# Health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

CMD ["node", "dist/server.js"]
