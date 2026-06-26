/**
 * Backup Scheduler — Phase 25
 *
 * Polls BkpSchedule records every minute and triggers backup jobs when due.
 * Supports cron-like expressions via simple interval matching.
 */

import { prisma } from '@reno/database'
import { logger } from '@reno/logger'
import { runBackupJob, getLastBackupAge } from './backup.service.js'
import { lastBackupAgeSeconds } from '../observability/backup-metrics.js'

let schedulerTimer: ReturnType<typeof setInterval> | null = null

async function tick(): Promise<void> {
  try {
    const now = new Date()

    // Update last backup age gauge
    const ageSec = await getLastBackupAge()
    if (isFinite(ageSec)) lastBackupAgeSeconds.set(ageSec)

    // Find schedules due to run
    const dueSchedules = await prisma.bkpSchedule.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        nextRunAt: { lte: now },
      },
      take: 5,
    })

    for (const schedule of dueSchedules) {
      logger.info({ scheduleId: schedule.id, name: schedule.name, jobType: schedule.jobType }, 'Triggering scheduled backup')

      const regions = Array.isArray(schedule.replicationRegions)
        ? (schedule.replicationRegions as string[])
        : []

      runBackupJob({
        jobType: schedule.jobType as 'full' | 'incremental' | 'config' | 'tenant',
        tenantId: schedule.tenantId ?? undefined,
        label: schedule.name,
        enableReplication: schedule.enableReplication && regions.length > 0,
        replicationRegions: regions,
        rpoTargetMins: schedule.rpoTargetMins,
      }).catch(err => logger.error({ err, scheduleId: schedule.id }, 'Scheduled backup failed'))

      // Advance nextRunAt by the schedule interval (parse cron-like interval)
      const intervalMs = parseCronToMs(schedule.cronExpression)
      await prisma.bkpSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: now,
          nextRunAt: new Date(now.getTime() + intervalMs),
        },
      })
    }
  } catch (err) {
    logger.warn({ err }, 'Backup scheduler tick error')
  }
}

function parseCronToMs(cron: string): number {
  // Simplified: support @hourly, @daily, @weekly, or interval in minutes like "*/30"
  if (cron === '@hourly' || cron === '0 * * * *') return 3600_000
  if (cron === '@daily' || cron === '0 0 * * *') return 86400_000
  if (cron === '@weekly' || cron === '0 0 * * 0') return 604800_000
  const minuteMatch = cron.match(/^\*\/(\d+)/)
  if (minuteMatch) return parseInt(minuteMatch[1]!) * 60_000
  // Default: 24h
  return 86400_000
}

export async function initDefaultSchedules(): Promise<void> {
  const existing = await prisma.bkpSchedule.count({ where: { deletedAt: null } })
  if (existing > 0) return

  const now = new Date()
  const defaults = [
    { name: 'Daily Full Backup', jobType: 'full', cronExpression: '@daily', rpoTargetMins: 1440, rtoTargetMins: 240, retentionDays: 30, nextRunAt: new Date(now.getTime() + 86400_000) },
    { name: 'Hourly Incremental Backup', jobType: 'incremental', cronExpression: '@hourly', rpoTargetMins: 60, rtoTargetMins: 120, retentionDays: 7, nextRunAt: new Date(now.getTime() + 3600_000) },
    { name: 'Daily Config Backup', jobType: 'config', cronExpression: '@daily', rpoTargetMins: 1440, rtoTargetMins: 60, retentionDays: 90, nextRunAt: new Date(now.getTime() + 86400_000) },
  ]

  await prisma.bkpSchedule.createMany({ data: defaults })
  logger.info('Default backup schedules initialized')
}

export function startBackupScheduler(): void {
  initDefaultSchedules().catch(err => logger.warn({ err }, 'Failed to init default backup schedules'))
  schedulerTimer = setInterval(tick, 60_000)
  logger.info('Backup scheduler started (1 minute poll interval)')
}

export function stopBackupScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer)
    schedulerTimer = null
  }
}
