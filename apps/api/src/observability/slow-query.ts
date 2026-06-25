/**
 * Reno Observability — Prisma Slow Query Monitor
 * Phase 24: Observability & Monitoring Platform
 *
 * Prisma middleware that measures every query and records:
 * - Duration histogram (reno_db_query_duration_seconds)
 * - Slow query counter for queries > SLOW_THRESHOLD_MS
 */

import { prisma } from '@reno/database'
import { logger } from '@reno/logger'
import { dbQueryDuration, dbSlowQueriesTotal } from './metrics.js'

const SLOW_THRESHOLD_MS = 500

// Parses "model.operation" from Prisma's query string
// e.g. "SELECT ... FROM \"core_users\"" → "CoreUser" approximation via params
function parseModelOp(params: { model?: string; action?: string }) {
  return {
    model: params.model ?? 'unknown',
    operation: params.action ?? 'unknown',
  }
}

export function installSlowQueryMonitor(): void {
  // @ts-expect-error — Prisma.$use is available at runtime; typed as deprecated in v5 but functional
  prisma.$use(async (params: { model?: string; action?: string }, next: (p: unknown) => Promise<unknown>) => {
    const start = Date.now()
    const result = await next(params)
    const durationMs = Date.now() - start
    const durationSec = durationMs / 1000

    const { model, operation } = parseModelOp(params)

    dbQueryDuration.observe({ model, operation }, durationSec)

    if (durationMs > SLOW_THRESHOLD_MS) {
      dbSlowQueriesTotal.inc({ model, operation })
      logger.warn(
        { model, operation, durationMs },
        `Slow query detected: ${model}.${operation} took ${durationMs}ms`,
      )
    }

    return result
  })

  logger.info(`Slow query monitor installed (threshold: ${SLOW_THRESHOLD_MS}ms)`)
}
