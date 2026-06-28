import { prisma } from '@reno/database'
import { logger } from '@reno/logger'
import { dbQueryDuration, dbSlowQueriesTotal } from './metrics.js'

const SLOW_THRESHOLD_MS = 500

// Prisma v5 uses $on('query', ...) instead of the removed $use() middleware
export function installSlowQueryMonitor(): void {
  // @ts-expect-error — $on is available on the extended client at runtime
  prisma.$on('query', (e: { query: string; duration: number }) => {
    const durationMs = e.duration
    const durationSec = durationMs / 1000
    const model = 'db'
    const operation = 'query'

    dbQueryDuration.observe({ model, operation }, durationSec)

    if (durationMs > SLOW_THRESHOLD_MS) {
      dbSlowQueriesTotal.inc({ model, operation })
      logger.warn({ durationMs, query: e.query?.slice(0, 100) }, `Slow query: ${durationMs}ms`)
    }
  })

  logger.info(`Slow query monitor installed (threshold: ${SLOW_THRESHOLD_MS}ms)`)
}
