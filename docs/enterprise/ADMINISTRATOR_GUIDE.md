# Reno System — Administrator Guide v1.0.0

---

## 1. System Architecture

Reno System uses a monorepo structure with three tiers:

```
apps/
  api/        — Fastify REST API (Node.js 22, TypeScript)
  web/        — Next.js 15 frontend (React, TypeScript)
  mobile/     — Flutter mobile app (iOS + Android)
packages/
  database/   — Prisma ORM + schema + migrations
  sdk/        — TypeScript SDK (@reno/sdk)
  plugin-sdk/ — Plugin SDK (@reno/plugin-sdk)
  cli/        — CLI tool (@reno/cli)
modules/      — Business module libraries
infra/
  k8s/        — Kubernetes manifests
  helm/       — Helm chart (reno/)
docker/       — Dockerfiles
.github/      — CI/CD workflows
```

---

## 2. Environment Variables

Copy `.env.production.example` and populate all values:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/reno_prod

# Authentication
JWT_SECRET=<openssl rand -hex 64>
JWT_REFRESH_SECRET=<openssl rand -hex 64>
ENCRYPTION_KEY=<openssl rand -hex 32>

# Redis
REDIS_URL=redis://host:6379

# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Storage
BACKUP_S3_BUCKET=reno-backups
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# Application
APP_URL=https://app.yourdomain.com
API_URL=https://api.yourdomain.com
NODE_ENV=production
```

---

## 3. First-Time Setup

### Docker Compose (Recommended for single-server)
```bash
# 1. Copy environment file
cp .env.production.example .env.production

# 2. Edit environment variables
nano .env.production

# 3. Run database migrations
docker compose -f docker-compose.prod.yml run --rm api pnpm migrate:prod

# 4. Seed initial data (optional)
docker compose -f docker-compose.prod.yml run --rm api pnpm seed

# 5. Start all services
docker compose -f docker-compose.prod.yml up -d
```

### Kubernetes / Helm
```bash
# Install with Helm
helm install reno infra/helm/reno \
  --set secrets.jwtSecret="$(openssl rand -hex 64)" \
  --set secrets.encryptionKey="$(openssl rand -hex 32)" \
  --set database.url="postgresql://..." \
  --namespace reno \
  --create-namespace

# Run migrations
kubectl exec -n reno deploy/reno-api -- pnpm migrate:prod
```

---

## 4. Tenant Management

Reno supports multiple tenants. Each tenant has:
- Isolated database rows (tenantId foreign key on all tables)
- Separate AI memory and learning data
- Isolated file storage paths
- Separate API keys and webhooks

### Create a new tenant
```bash
# Via API (requires SYSTEM_ADMIN role)
POST /api/v1/admin/tenants
{
  "name": "Acme Corp",
  "subdomain": "acme",
  "plan": "enterprise"
}
```

---

## 5. User Management

### Roles and Permissions
Reno uses RBAC with granular permissions. Default roles:
- `SUPER_ADMIN` — full platform access
- `TENANT_ADMIN` — full tenant access
- `MANAGER` — module management
- `USER` — standard user access
- `READ_ONLY` — view-only access

### Invite Users
```
Settings → Users → Invite User
```

---

## 6. Backup Management

### Automated Backups
Configure in `Settings → Backup`:
- Daily backups at 00:00 UTC
- Weekly full backups on Sunday
- Retention: 30 days (configurable)

### Manual Backup
```bash
# Via CLI
reno backup --env production

# Via API
POST /api/v1/backup/jobs
{"type": "full", "immediate": true}
```

### Restore
```bash
# Via CLI
reno rollback --env production --version <snapshot-id>

# Via API
POST /api/v1/backup/restore
{"snapshotId": "...", "targetEnvironment": "production"}
```

---

## 7. Health Monitoring

### Health Check Endpoints
- `GET /health` — API health
- `GET /health/db` — Database connectivity
- `GET /health/redis` — Redis connectivity
- `GET /health/detailed` — Full system health

### Observability Stack
- Prometheus metrics at `/metrics`
- Grafana dashboards at port 3001
- Alert rules in `infra/k8s/monitoring/`

---

## 8. Security Best Practices

1. **Rotate secrets** regularly using `openssl rand -hex 64`
2. **Enable 2FA** for all admin accounts
3. **Restrict API access** by IP if possible
4. **Audit logs** are available at `GET /api/v1/audit/logs`
5. **HTTPS only** — configure TLS via cert-manager or load balancer
6. **Never commit** `.env.production` to version control

---

## 9. Database Maintenance

```bash
# Run pending migrations
pnpm migrate:prod

# Check migration status
node packages/database/node_modules/prisma/build/index.js migrate status

# Database backup (manual)
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

---

## 10. Support & Escalation

- Documentation: `docs/enterprise/`
- API Reference: `https://api.yourdomain.com/docs`
- CLI Help: `reno --help`
