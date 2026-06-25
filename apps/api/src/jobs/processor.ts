/**
 * Background Job Processor — Phase 23 Performance & Scalability
 *
 * Polls sys_jobs table for pending work and executes handlers concurrently.
 * Designed to be stateless — safe to run in multiple API instances simultaneously
 * because each job is claimed with an atomic status update before processing.
 */

import { prisma } from '@reno/database'
import { logger } from '@reno/logger'

// ─── Handler Registry ─────────────────────────────────────────────────────────

type JobHandler = (payload: Record<string, unknown>, tenantId: string) => Promise<unknown>

const handlers = new Map<string, JobHandler>()

export function registerJobHandler(type: string, handler: JobHandler) {
  handlers.set(type, handler)
}

// ─── Processor Config ─────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 5_000
const BATCH_SIZE = 10
const MAX_CONCURRENCY = 5

// ─── Core Worker ─────────────────────────────────────────────────────────────

async function processJob(jobId: string): Promise<void> {
  // Atomically claim the job — prevents double-processing across instances
  const claimed = await prisma.sysJob.updateMany({
    where: { id: jobId, status: 'pending' },
    data: { status: 'running', startedAt: new Date(), attempts: { increment: 1 } },
  })

  if (claimed.count === 0) return // Another instance claimed it

  const job = await prisma.sysJob.findUnique({ where: { id: jobId } })
  if (!job) return

  const handler = handlers.get(job.type)

  try {
    if (!handler) {
      throw new Error(`No handler registered for job type: ${job.type}`)
    }

    const result = await handler(job.payload as Record<string, unknown>, job.tenantId)

    await prisma.sysJob.update({
      where: { id: jobId },
      data: { status: 'completed', completedAt: new Date(), result: (result ?? {}) as unknown as object },
    })
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    const shouldRetry = job.attempts < job.maxAttempts

    await prisma.sysJob.update({
      where: { id: jobId },
      data: {
        status: shouldRetry ? 'pending' : 'failed',
        failedAt: shouldRetry ? null : new Date(),
        error,
        // Exponential backoff: reschedule with delay on retry
        scheduledAt: shouldRetry
          ? new Date(Date.now() + Math.pow(2, job.attempts) * 30_000)
          : job.scheduledAt,
      },
    })

    if (!shouldRetry) {
      logger.error({ jobId, type: job.type, error }, 'Job permanently failed after max retries')
    }
  }
}

// ─── Poll Loop ────────────────────────────────────────────────────────────────

async function pollOnce(): Promise<void> {
  try {
    const pendingJobs = await prisma.sysJob.findMany({
      where: {
        status: 'pending',
        scheduledAt: { lte: new Date() },
        deletedAt: null,
      },
      orderBy: { scheduledAt: 'asc' },
      take: BATCH_SIZE,
      select: { id: true },
    })

    if (pendingJobs.length === 0) return

    // Process up to MAX_CONCURRENCY jobs simultaneously
    const chunks: string[][] = []
    for (let i = 0; i < pendingJobs.length; i += MAX_CONCURRENCY) {
      chunks.push(pendingJobs.slice(i, i + MAX_CONCURRENCY).map((j) => j.id))
    }

    for (const chunk of chunks) {
      await Promise.all(chunk.map(processJob))
    }
  } catch (err) {
    logger.warn({ err }, 'Job poll cycle error')
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

let pollTimer: ReturnType<typeof setTimeout> | null = null

export function startJobProcessor(): void {
  logger.info(`Job processor started (poll=${POLL_INTERVAL_MS}ms, batch=${BATCH_SIZE}, concurrency=${MAX_CONCURRENCY})`)

  const tick = async () => {
    await pollOnce()
    pollTimer = setTimeout(tick, POLL_INTERVAL_MS)
  }

  pollTimer = setTimeout(tick, POLL_INTERVAL_MS)
}

export function stopJobProcessor(): void {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
    logger.info('Job processor stopped')
  }
}

export async function enqueueJob(params: {
  tenantId: string
  queue: string
  type: string
  payload?: Record<string, unknown>
  scheduledAt?: Date
  maxAttempts?: number
  triggeredBy?: string
}): Promise<string> {
  const job = await prisma.sysJob.create({
    data: {
      tenantId: params.tenantId,
      queue: params.queue,
      type: params.type,
      payload: (params.payload ?? {}) as unknown as object,
      scheduledAt: params.scheduledAt ?? new Date(),
      maxAttempts: params.maxAttempts ?? 3,
      triggeredBy: params.triggeredBy,
    },
  })
  return job.id
}
