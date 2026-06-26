/**
 * RTO/RPO Monitor — Phase 25
 *
 * Tracks Recovery Time Objective and Recovery Point Objective compliance.
 * RPO = time since last successful backup (how much data could be lost)
 * RTO = time to restore from last backup (how long recovery takes)
 */

import { prisma } from '@reno/database'
import { rpoCurrentMins, rtoTargetMins, drReadinessScore } from '../observability/backup-metrics.js'
import { logger } from '@reno/logger'

export interface RtoPtoStatus {
  rpoCurrentMins: number
  rpoTargetMins: number
  rpoCompliant: boolean
  rtoTargetMins: number
  lastRestoreTestMins: number | null
  rtoCompliant: boolean
  lastBackupAt: Date | null
  lastVerifiedAt: Date | null
}

export async function getRtoPtoStatus(): Promise<RtoPtoStatus> {
  const [lastBackup, lastRestoreTest, defaultSchedule] = await Promise.all([
    prisma.bkpJob.findFirst({
      where: { status: { in: ['completed', 'verified'] }, deletedAt: null },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true, rpoTargetMins: true, isVerified: true, updatedAt: true },
    }),
    prisma.bkpRestoreTest.findFirst({
      where: { status: 'passed' },
      orderBy: { completedAt: 'desc' },
      select: { rtoActualMins: true, rtoTargetMins: true, completedAt: true },
    }),
    prisma.bkpSchedule.findFirst({
      where: { isActive: true, jobType: 'full', deletedAt: null },
      select: { rpoTargetMins: true, rtoTargetMins: true },
    }),
  ])

  const rpoTarget = defaultSchedule?.rpoTargetMins ?? lastBackup?.rpoTargetMins ?? 60
  const rtoTarget = defaultSchedule?.rtoTargetMins ?? lastRestoreTest?.rtoTargetMins ?? 240

  const now = Date.now()
  const lastBackupTime = lastBackup?.completedAt?.getTime() ?? 0
  const rpoActual = lastBackupTime > 0 ? Math.round((now - lastBackupTime) / 60000) : 9999

  const lastRestoreActual = lastRestoreTest?.rtoActualMins ?? null
  const rtoCompliant = lastRestoreActual !== null ? lastRestoreActual <= rtoTarget : true

  // Update Prometheus gauges
  rpoCurrentMins.set(rpoActual)
  rtoTargetMins.set(rtoTarget)

  const result: RtoPtoStatus = {
    rpoCurrentMins: rpoActual,
    rpoTargetMins: rpoTarget,
    rpoCompliant: rpoActual <= rpoTarget,
    rtoTargetMins: rtoTarget,
    lastRestoreTestMins: lastRestoreActual,
    rtoCompliant,
    lastBackupAt: lastBackup?.completedAt ?? null,
    lastVerifiedAt: lastBackup?.isVerified ? (lastBackup.updatedAt ?? null) : null,
  }

  return result
}

export async function computeDrReadinessScore(): Promise<number> {
  const [
    recentJobs,
    verifiedJobs,
    failedJobs,
    passedTests,
    failedTests,
    activePlaybooks,
    recentReplications,
  ] = await Promise.all([
    prisma.bkpJob.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 86400000) }, deletedAt: null } }),
    prisma.bkpJob.count({ where: { isVerified: true, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
    prisma.bkpJob.count({ where: { status: 'failed', createdAt: { gte: new Date(Date.now() - 24 * 3600000) } } }),
    prisma.bkpRestoreTest.count({ where: { status: 'passed', testedAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
    prisma.bkpRestoreTest.count({ where: { status: 'failed', testedAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
    prisma.drPlaybook.count({ where: { isActive: true, deletedAt: null } }),
    prisma.bkpReplication.count({ where: { status: 'completed', createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
  ])

  // Score components (each 0-100, weighted)
  const backupScore = recentJobs > 0 ? Math.min(100, (recentJobs * 20)) : 0
  const verificationScore = recentJobs > 0 ? Math.round((verifiedJobs / recentJobs) * 100) : 50
  const failureScore = failedJobs === 0 ? 100 : Math.max(0, 100 - failedJobs * 25)
  const testScore = passedTests > 0 ? Math.min(100, (passedTests * 25)) : 10
  const testFailureScore = failedTests === 0 ? 100 : Math.max(0, 100 - failedTests * 20)
  const playbookScore = activePlaybooks > 0 ? Math.min(100, activePlaybooks * 25) : 20
  const replicationScore = recentReplications > 0 ? Math.min(100, recentReplications * 30) : 30

  const score = Math.round(
    backupScore * 0.20 +
    verificationScore * 0.20 +
    failureScore * 0.15 +
    testScore * 0.15 +
    testFailureScore * 0.10 +
    playbookScore * 0.10 +
    replicationScore * 0.10
  )

  drReadinessScore.set(score)

  await prisma.drReadinessScore.create({
    data: {
      score,
      rtoScore: Math.min(100, testScore),
      rpoScore: Math.min(100, backupScore),
      backupScore,
      replicationScore,
      testingScore: testScore,
      playbookScore,
      details: {
        recentJobs, verifiedJobs, failedJobs, passedTests, failedTests, activePlaybooks, recentReplications,
        backupScore, verificationScore, failureScore, testScore, testFailureScore, playbookScore, replicationScore,
      } as object,
    },
  }).catch(err => logger.warn({ err }, 'Failed to persist DR readiness score'))

  return score
}

export async function getDrReadinessHistory(days = 30): Promise<{ scoredAt: Date; score: number }[]> {
  const since = new Date(Date.now() - days * 86400000)
  return prisma.drReadinessScore.findMany({
    where: { scoredAt: { gte: since } },
    orderBy: { scoredAt: 'asc' },
    select: { scoredAt: true, score: true },
  })
}
