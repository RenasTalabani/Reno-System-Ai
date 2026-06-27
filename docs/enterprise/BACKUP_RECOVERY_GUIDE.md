# Reno System — Backup & Recovery Guide v1.0.0

---

## Overview

Reno System includes a built-in Backup Management System (Phase 22) supporting:
- Scheduled automated backups (full + incremental)
- Manual on-demand backups
- Integrity verification with SHA-256 checksums
- Encrypted remote storage (S3 / local)
- Point-in-time restore
- Disaster recovery playbooks (Phase 23)

---

## Backup Strategy

### Recommended Schedule
| Backup Type | Frequency | Retention |
|---|---|---|
| Full | Daily at 02:00 UTC | 30 days |
| Full | Weekly (Sunday 01:00) | 90 days |
| Full | Monthly (1st, 01:00) | 365 days |
| Transaction logs | Continuous (if WAL archiving enabled) | 7 days |

### Storage
- **Primary** — local disk (fast restore)
- **Remote** — AWS S3 / compatible (disaster recovery)
- **Encryption** — AES-256 using ENCRYPTION_KEY

---

## Automated Backups

Configure in `.env.production`:
```bash
BACKUP_RETENTION_DAYS=30
BACKUP_SCHEDULE_FULL="0 2 * * *"       # Daily at 02:00
BACKUP_SCHEDULE_WEEKLY="0 1 * * 0"     # Weekly Sunday
BACKUP_S3_BUCKET=reno-backups
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
```

Or configure through the admin UI: **Settings → Backup → Configure Schedule**

### Monitoring
- **API** — `GET /api/v1/backup/status` returns last backup status and next scheduled time
- **Admin UI** — **Settings → Backup → History** shows all backup jobs with size, duration, status, and checksum

---

## Manual Backup

### Via CLI
```bash
# Full backup
reno backup --env production

# Backup with custom label
reno backup --env production --label "pre-upgrade-2026-07-01"
```

### Via API
```bash
curl -X POST https://api.yourdomain.com/api/v1/backup/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "full", "immediate": true, "label": "manual-backup"}'
```

### Via Admin UI
1. **Settings → Backup → Manual Backup**
2. Select backup type (full / schema-only / data-only)
3. Click **Start Backup**
4. Monitor progress in the job list

---

## Backup Verification

Every backup is verified automatically:
1. SHA-256 checksum generated on creation
2. Integrity test on completion (restore to temp DB and validate)
3. Checksum re-verified on every manual or scheduled verification run

### Manual Verification
```bash
reno backup verify --snapshot-id <id>

# Via API
POST /api/v1/backup/jobs/<id>/verify
```

---

## Restore Procedures

### Method 1 — CLI (Recommended)
```bash
# List available snapshots
reno backup list --env production

# Restore specific snapshot
reno rollback --env production --version <snapshot-id>
```

### Method 2 — API
```bash
curl -X POST https://api.yourdomain.com/api/v1/backup/restore \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"snapshotId": "snap_20260627_020000", "targetEnvironment": "production"}'
```

### Method 3 — Admin UI
1. **Settings → Backup → History**
2. Click **Restore** next to the desired snapshot
3. Confirm the restore target
4. Monitor progress

### Method 4 — Manual pg_restore
```bash
# For full PostgreSQL restore from dump file
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql

# Or from compressed format
pg_restore -d $DATABASE_URL -Fc backup_YYYYMMDD.dump
```

---

## Disaster Recovery

Reno includes a full DR Management System (Phase 23):
- DR playbooks per scenario (DB failure, full site loss, data corruption, ransomware)
- RTO/RPO tracking per playbook
- DR readiness scoring
- Automated DR testing via `/api/v1/dr/test`

### DR Health Check
```bash
curl https://api.yourdomain.com/api/v1/dr/readiness
# Returns: score (0-100), rto, rpo, lastTested
```

### DR Playbook Execution
```bash
# List available playbooks
GET /api/v1/dr/playbooks

# Execute a playbook
POST /api/v1/dr/playbooks/{id}/execute
```

---

## Recovery Time Objectives

| Scenario | RTO Target | RPO Target |
|---|---|---|
| Single service restart | < 2 minutes | 0 |
| Full server rebuild | < 30 minutes | < 24 hours |
| Database restore from local backup | < 15 minutes | < 24 hours |
| Database restore from S3 backup | < 45 minutes | < 24 hours |
| Complete DR failover | < 1 hour | < 24 hours |

---

## Backup Checklist

- [ ] Automated daily backup is configured and running
- [ ] Backup storage bucket exists and is accessible
- [ ] Encryption key is stored separately from backups
- [ ] At least one restore test performed in last 30 days
- [ ] Backup notifications configured (email/Slack on failure)
- [ ] Backup retention policy set per compliance requirements
- [ ] DR playbooks reviewed and up to date
- [ ] Off-site backup copy confirmed (S3 replication or secondary region)
