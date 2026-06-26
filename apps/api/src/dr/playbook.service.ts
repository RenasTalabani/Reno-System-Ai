/**
 * DR Playbook Service — Phase 25
 *
 * Manages disaster recovery playbooks and their execution tracking.
 * Self-healing actions are BLOCKED from automatic execution — human approval
 * is required before any remediation steps are taken.
 */

import { prisma } from '@reno/database'
import { logger } from '@reno/logger'

export interface PlaybookStep {
  order: number
  title: string
  description: string
  command?: string          // For reference only — never auto-executed
  estimatedMins: number
  requiresHumanApproval: boolean
  rollbackStep?: string
}

export async function seedDefaultPlaybooks(): Promise<void> {
  const existing = await prisma.drPlaybook.count({ where: { deletedAt: null } })
  if (existing > 0) return

  const playbooks: Array<{
    name: string
    description: string
    category: string
    severity: string
    rtoTargetMins: number
    rpoTargetMins: number
    steps: PlaybookStep[]
  }> = [
    {
      name: 'Database Complete Failure Recovery',
      description: 'Full recovery procedure when the primary database becomes completely unavailable.',
      category: 'database',
      severity: 'critical',
      rtoTargetMins: 120,
      rpoTargetMins: 60,
      steps: [
        { order: 1, title: 'Assess Failure', description: 'Determine scope: primary DB down, replica issue, or network partition', estimatedMins: 5, requiresHumanApproval: false },
        { order: 2, title: 'Alert On-call Team', description: 'Page SRE team and notify stakeholders of database outage', estimatedMins: 2, requiresHumanApproval: false },
        { order: 3, title: 'Identify Latest Backup', description: 'Find most recent verified backup in BkpJob table', estimatedMins: 3, requiresHumanApproval: false },
        { order: 4, title: 'Provision Recovery DB', description: 'Spin up new PostgreSQL instance in isolated environment: docker run -e POSTGRES_* postgres:16', estimatedMins: 10, requiresHumanApproval: true, command: 'docker run -d --name reno_recovery -e POSTGRES_PASSWORD=... postgres:16' },
        { order: 5, title: 'Restore from Backup', description: 'Decrypt backup and restore: GET /v1/backup/restore/simulate', estimatedMins: 30, requiresHumanApproval: true },
        { order: 6, title: 'Verify Data Integrity', description: 'Run integrity checks on restored database', estimatedMins: 15, requiresHumanApproval: true },
        { order: 7, title: 'Update Connection Strings', description: 'Update DATABASE_URL in .env to point to recovery DB', estimatedMins: 5, requiresHumanApproval: true },
        { order: 8, title: 'Restart API Server', description: 'Restart API with new connection string; verify /health/db returns ok', estimatedMins: 5, requiresHumanApproval: true },
        { order: 9, title: 'Validate & Monitor', description: 'Monitor Grafana for 30 minutes; confirm all modules operational', estimatedMins: 30, requiresHumanApproval: false },
        { order: 10, title: 'Post-Incident Report', description: 'Document timeline, root cause, and preventive measures', estimatedMins: 60, requiresHumanApproval: false },
      ],
    },
    {
      name: 'API Server Complete Failure',
      description: 'Recovery procedure when the Reno API becomes completely unavailable.',
      category: 'application',
      severity: 'critical',
      rtoTargetMins: 30,
      rpoTargetMins: 0,
      steps: [
        { order: 1, title: 'Confirm Failure', description: 'Confirm via health check: curl http://api:4000/health', estimatedMins: 2, requiresHumanApproval: false },
        { order: 2, title: 'Check Process Status', description: 'Verify node process state and last error logs', estimatedMins: 3, requiresHumanApproval: false },
        { order: 3, title: 'Check Dependencies', description: 'Verify Postgres, Redis connectivity: GET /v1/monitoring/health/dependencies', estimatedMins: 5, requiresHumanApproval: false },
        { order: 4, title: 'Restart API', description: 'Restart API process: pm2 restart reno-api OR docker restart reno_api', estimatedMins: 2, requiresHumanApproval: true, command: 'pm2 restart reno-api' },
        { order: 5, title: 'Verify Recovery', description: 'Confirm /health returns 200, /metrics returns Prometheus data', estimatedMins: 5, requiresHumanApproval: false },
        { order: 6, title: 'Drain & Replay Job Queue', description: 'Check sysJob for failed jobs, reset for retry if needed', estimatedMins: 10, requiresHumanApproval: true },
      ],
    },
    {
      name: 'Data Corruption — Single Tenant',
      description: 'Recover a specific tenant from backup when data corruption is detected.',
      category: 'database',
      severity: 'high',
      rtoTargetMins: 60,
      rpoTargetMins: 60,
      steps: [
        { order: 1, title: 'Identify Affected Tenant', description: 'Get tenant ID from incident report or monitoring alert', estimatedMins: 5, requiresHumanApproval: false },
        { order: 2, title: 'Scope the Corruption', description: 'Determine which tables/records are corrupted using audit logs', estimatedMins: 15, requiresHumanApproval: false },
        { order: 3, title: 'Find Last Good Snapshot', description: 'Query BkpSnapshot: GET /v1/backup/snapshots?tenantId=...', estimatedMins: 5, requiresHumanApproval: false },
        { order: 4, title: 'Run Restore Simulation', description: 'Validate restore without writing: POST /v1/backup/restore/simulate', estimatedMins: 10, requiresHumanApproval: true },
        { order: 5, title: 'Execute Restore', description: 'With explicit human approval, restore tenant data from snapshot', estimatedMins: 20, requiresHumanApproval: true, rollbackStep: 'Re-apply corruption if restore introduces new issues' },
        { order: 6, title: 'Notify Tenant', description: 'Inform tenant of data restored, estimated data loss window', estimatedMins: 10, requiresHumanApproval: true },
      ],
    },
    {
      name: 'Total Infrastructure Loss (Disaster Recovery)',
      description: 'Full disaster recovery when all primary infrastructure is destroyed or inaccessible.',
      category: 'total',
      severity: 'critical',
      rtoTargetMins: 240,
      rpoTargetMins: 60,
      steps: [
        { order: 1, title: 'Declare Disaster', description: 'Formally declare disaster scenario; assemble DR team', estimatedMins: 10, requiresHumanApproval: true },
        { order: 2, title: 'Assess Backup Availability', description: 'Confirm cross-region backups accessible: check BkpReplication records', estimatedMins: 15, requiresHumanApproval: false },
        { order: 3, title: 'Provision Recovery Infrastructure', description: 'Stand up: PostgreSQL 16, Redis 7, MinIO in recovery region', estimatedMins: 30, requiresHumanApproval: true },
        { order: 4, title: 'Restore Configuration', description: 'Restore config backup first: GET /v1/backup/config/latest → apply', estimatedMins: 20, requiresHumanApproval: true },
        { order: 5, title: 'Restore Database', description: 'Restore most recent verified full backup', estimatedMins: 60, requiresHumanApproval: true },
        { order: 6, title: 'Apply Incremental Backups', description: 'Layer incremental backups on top to minimize RPO', estimatedMins: 30, requiresHumanApproval: true },
        { order: 7, title: 'Deploy API Server', description: 'Deploy Reno API to recovery infrastructure', estimatedMins: 15, requiresHumanApproval: true },
        { order: 8, title: 'Deploy Web Frontend', description: 'Deploy Next.js frontend to recovery infrastructure', estimatedMins: 10, requiresHumanApproval: true },
        { order: 9, title: 'DNS Failover', description: 'Update DNS to point to recovery infrastructure', estimatedMins: 5, requiresHumanApproval: true },
        { order: 10, title: 'Full System Validation', description: 'Validate all modules: auth, HR, CRM, Finance, AI, monitoring', estimatedMins: 30, requiresHumanApproval: true },
        { order: 11, title: 'Notify All Stakeholders', description: 'Communicate recovery status, RTO achieved, data loss window', estimatedMins: 15, requiresHumanApproval: false },
      ],
    },
  ]

  for (const pb of playbooks) {
    await prisma.drPlaybook.create({ data: { ...pb, steps: pb.steps as object } })
  }

  logger.info(`Seeded ${playbooks.length} default DR playbooks`)
}

export async function executePlaybookStep(
  executionId: string,
  stepIndex: number,
  outcome: 'success' | 'failed' | 'skipped',
  notes?: string,
): Promise<void> {
  const execution = await prisma.drPlaybookExecution.findFirst({ where: { id: executionId } })
  if (!execution) throw new Error('Execution not found')

  const existingResults = Array.isArray(execution.stepResults) ? execution.stepResults as Array<unknown> : []

  const updatedResults = [
    ...existingResults,
    { stepIndex, outcome, notes, completedAt: new Date().toISOString() },
  ]

  const playbook = await prisma.drPlaybook.findFirst({ where: { id: execution.playbookId } })
  const steps = Array.isArray(playbook?.steps) ? (playbook.steps as unknown as PlaybookStep[]) : []
  const isLastStep = stepIndex >= steps.length - 1

  await prisma.drPlaybookExecution.update({
    where: { id: executionId },
    data: {
      currentStep: stepIndex + 1,
      stepResults: updatedResults as object,
      status: isLastStep && outcome === 'success' ? 'completed' : outcome === 'failed' ? 'failed' : 'running',
      completedAt: isLastStep ? new Date() : null,
    },
  })
}
