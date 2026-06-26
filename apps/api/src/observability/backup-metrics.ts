import { Counter, Gauge, Histogram } from 'prom-client'
import { registry } from './metrics.js'

export const backupJobsTotal = new Counter({
  name: 'reno_backup_jobs_total',
  help: 'Total backup jobs executed',
  labelNames: ['job_type', 'status'],
  registers: [registry],
})

export const backupSizeBytes = new Histogram({
  name: 'reno_backup_size_bytes',
  help: 'Size of backup payloads in bytes',
  buckets: [1024, 102400, 1048576, 10485760, 104857600, 1073741824],
  registers: [registry],
})

export const backupDurationMs = new Histogram({
  name: 'reno_backup_duration_ms',
  help: 'Backup job execution time in milliseconds',
  buckets: [500, 1000, 5000, 15000, 30000, 60000, 300000],
  registers: [registry],
})

export const lastBackupAgeSeconds = new Gauge({
  name: 'reno_backup_last_age_seconds',
  help: 'Seconds since the last successful backup completed',
  registers: [registry],
})

export const backupVerificationsPassed = new Counter({
  name: 'reno_backup_verifications_passed_total',
  help: 'Total backup integrity verifications that passed',
  registers: [registry],
})

export const backupVerificationsFailed = new Counter({
  name: 'reno_backup_verifications_failed_total',
  help: 'Total backup integrity verifications that failed',
  registers: [registry],
})

export const drReadinessScore = new Gauge({
  name: 'reno_dr_readiness_score',
  help: 'Current DR readiness score (0-100)',
  registers: [registry],
})

export const rpoCurrentMins = new Gauge({
  name: 'reno_rpo_current_minutes',
  help: 'Current Recovery Point Objective in minutes (time since last backup)',
  registers: [registry],
})

export const rtoTargetMins = new Gauge({
  name: 'reno_rto_target_minutes',
  help: 'Configured Recovery Time Objective target in minutes',
  registers: [registry],
})

export const restoreTestsTotal = new Counter({
  name: 'reno_restore_tests_total',
  help: 'Total automated restore tests run',
  labelNames: ['test_type', 'status'],
  registers: [registry],
})
