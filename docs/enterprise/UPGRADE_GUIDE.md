# Reno System — Upgrade Guide v1.0.0

---

## Before Upgrading

1. **Read the release notes** for the target version
2. **Back up the database** — non-negotiable before any upgrade
3. **Check known limitations** in `KNOWN_LIMITATIONS.md`
4. **Test in staging** before upgrading production
5. **Notify users** of the maintenance window

---

## Upgrade Path

Reno follows semantic versioning:

- **Patch** (1.0.x) — bug fixes, no schema changes; zero-downtime
- **Minor** (1.x.0) — new features, additive schema changes; rolling upgrade
- **Major** (x.0.0) — breaking changes; follow the major upgrade guide

---

## Standard Upgrade Procedure (Docker Compose)

### Step 1 — Backup
```bash
# Automated backup via CLI
reno backup --env production

# Or manual
pg_dump $DATABASE_URL > backup_pre_upgrade_$(date +%Y%m%d).sql
```

### Step 2 — Pull new image
```bash
docker compose -f docker-compose.prod.yml pull
```

### Step 3 — Run migrations
```bash
docker compose -f docker-compose.prod.yml run --rm api pnpm migrate:prod
```

### Step 4 — Rolling restart
```bash
docker compose -f docker-compose.prod.yml up -d --no-deps api web
```

### Step 5 — Verify
```bash
curl https://api.yourdomain.com/health
# Should return new version number
```

---

## Standard Upgrade Procedure (Kubernetes)

### Step 1 — Backup
```bash
kubectl exec -n reno deploy/reno-api -- pg_dump $DATABASE_URL > backup_pre_upgrade.sql
```

### Step 2 — Update Helm values
```bash
# Edit values-production.yaml to update image tags
helm upgrade reno infra/helm/reno \
  --values infra/helm/reno/values-production.yaml \
  --namespace reno \
  --set image.tag=1.1.0
```

### Step 3 — Run migrations
```bash
kubectl exec -n reno deploy/reno-api -- pnpm migrate:prod
```

### Step 4 — Verify rollout
```bash
kubectl rollout status deploy/reno-api -n reno
kubectl rollout status deploy/reno-web -n reno
```

---

## Zero-Downtime Upgrades

Reno supports zero-downtime deployments via:
1. **Database migrations run before new code** — all migrations are backward-compatible for at least one version
2. **Rolling restart** — Kubernetes `RollingUpdate` strategy; Docker Compose `--no-deps` per service
3. **Health checks** — load balancer only routes to healthy instances
4. **Graceful shutdown** — 30s SIGTERM grace period for in-flight requests

---

## Rollback

### If upgrade fails — rollback code
```bash
# Docker Compose
docker compose -f docker-compose.prod.yml pull --no-parallel
git checkout <previous-tag>
docker compose -f docker-compose.prod.yml up -d

# Kubernetes
helm rollback reno -n reno
```

### If migration fails — rollback database
```bash
# Restore from backup
psql $DATABASE_URL < backup_pre_upgrade_YYYYMMDD.sql
```

### Via Reno DR system
```bash
reno rollback --env production --version <snapshot-id>
```

---

## Phase-by-Phase Migration Notes

This section documents the migration history for reference when upgrading across multiple phases.

| Phase | Migration File | Description |
|---|---|---|
| Phase 0 | 00000000000000_initial | Core schema (tenants, users, sessions) |
| Phase 1 | 20260601... | HR models |
| Phase 2 | 20260602... | CRM models |
| Phase 3 | 20260603... | Sales/Finance models |
| Phase 4 | 20260604... | Inventory models |
| Phase 5 | 20260605... | Project management models |
| Phase 6 | 20260606... | Procurement models |
| Phase 7 | 20260607... | Manufacturing/Quality models |
| Phase 8 | 20260608... | Analytics/BI models |
| Phase 9 | 20260609... | Marketplace/E-commerce models |
| Phase 10 | 20260610... | Automation/Workflow models |
| Phase 11 | 20260611... | Knowledge Base models |
| Phase 12 | 20260612... | Helpdesk/SLA models |
| Phase 13 | 20260613... | Communications models |
| Phase 14 | 20260614... | Document management models |
| Phase 15 | 20260615... | Portal models |
| Phase 16 | 20260616... | Mobile + Scanner models |
| Phase 17 | 20260617... | Observability models |
| Phase 18 | 20260618... | Backup management models |
| Phase 19 | 20260619... | Disaster recovery models |
| Phase 20 | 20260620... | CI/CD + deploy models |
| Phase 21 | 20260621... | AI Executive models |
| Phase 22 | 20260622... | AI SRE models |
| Phase 23 | 20260623... | Plugin system models |
| Phase 24 | 20260624... | Developer platform models |
| Phase 25 | 20260625... | Accessibility/i18n models |
| Phase 26 | 20260626... | Advanced Brain models |
| Phase 27 | 20260627 | Phase 29 AI Evolution models |

---

## Data Migration Utilities

For major version upgrades requiring data transformation:
```bash
# Run custom migration scripts (in packages/database/src/migrations/)
node packages/database/src/migrations/migrate-v1-to-v2.js
```

---

## Post-Upgrade Checklist

- [ ] Health check endpoint returns new version
- [ ] Database migration status shows all applied
- [ ] No errors in API logs
- [ ] Random functional smoke test (login, create record, view dashboard)
- [ ] Brain AI responds correctly
- [ ] Backups are still running
- [ ] Notify users that maintenance is complete
