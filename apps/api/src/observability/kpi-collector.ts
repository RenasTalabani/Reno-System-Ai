/**
 * Reno Observability — Business KPI Collector
 * Phase 24: Observability & Monitoring Platform
 *
 * Periodically queries real module data to populate Prometheus KPI gauges.
 * All values come from live Prisma queries — no mocks.
 */

import { prisma } from '@reno/database'
import { logger } from '@reno/logger'
import {
  kpiTotalUsers,
  kpiTotalEmployees,
  kpiTotalContacts,
  kpiOpenTickets,
  activeSessionsTotal,
  jobsPendingTotal,
} from './metrics.js'

const KPI_INTERVAL_MS = 60_000 // collect every minute

let kpiTimer: ReturnType<typeof setTimeout> | null = null

async function collectKpis(): Promise<void> {
  try {
    const [users, employees, contacts, tickets, sessions, pendingJobs] = await Promise.all([
      prisma.coreUser.count({ where: { deletedAt: null, status: 'active' } }),
      prisma.hrEmployee.count({ where: { deletedAt: null } }),
      prisma.crmContact.count({ where: { deletedAt: null } }),
      prisma.sdTicket.count({ where: { deletedAt: null, status: { in: ['open', 'in_progress'] } } }).catch(() => 0),
      prisma.coreSession.count({ where: { isActive: true, revokedAt: null, expiresAt: { gt: new Date() } } }),
      prisma.sysJob.count({ where: { status: 'pending', deletedAt: null } }),
    ])

    kpiTotalUsers.set(users)
    kpiTotalEmployees.set(employees)
    kpiTotalContacts.set(contacts)
    kpiOpenTickets.set(tickets)
    activeSessionsTotal.set(sessions)
    jobsPendingTotal.set(pendingJobs)
  } catch (err) {
    logger.warn({ err }, 'KPI collection error')
  }
}

export function startKpiCollector(): void {
  logger.info(`KPI collector started (interval: ${KPI_INTERVAL_MS / 1000}s)`)

  const tick = async () => {
    await collectKpis()
    kpiTimer = setTimeout(tick, KPI_INTERVAL_MS)
  }

  // Collect immediately on start, then on interval
  void collectKpis()
  kpiTimer = setTimeout(tick, KPI_INTERVAL_MS)
}

export function stopKpiCollector(): void {
  if (kpiTimer) {
    clearTimeout(kpiTimer)
    kpiTimer = null
  }
}

export { collectKpis }
