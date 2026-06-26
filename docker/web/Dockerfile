# =============================================================================
# Reno System Web — Production Dockerfile (Next.js standalone)
# =============================================================================

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app

FROM base AS installer
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/core/package.json ./packages/core/
RUN pnpm install --frozen-lockfile

FROM installer AS builder
COPY . .
# Build args injected at build time (public vars only — no secrets)
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_APP_VERSION=0.1.0
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @reno/web build

FROM node:22-alpine AS runner
RUN addgroup --system --gid 1001 reno && \
    adduser --system --uid 1001 --ingroup reno reno
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Next.js standalone output
COPY --from=builder --chown=reno:reno /app/apps/web/.next/standalone ./
COPY --from=builder --chown=reno:reno /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=reno:reno /app/apps/web/public ./apps/web/public

USER reno

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health 2>/dev/null || wget -qO- http://localhost:3000 || exit 1

CMD ["node", "apps/web/server.js"]
