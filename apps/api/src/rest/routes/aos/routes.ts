// Phase 51 — AI Enterprise Operating System Runtime: API Routes

import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import {
  JOB_TEMPLATES,
  parseCronDescription,
  calculateNextRunAt,
  resolveEventPriority,
  evaluateHookConditions,
  analyzeResourceUsage,
  simulateJobExecution,
  generateRuntimeSummary,
  buildChannelStats,
} from './ai-engine.js'

export async function aosRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Dashboard ────────────────────────────────────────────────────────────────

  app.get('/dashboard', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string; userId: string }

    const runtime = await prisma.aosRuntime.findFirst({ where: { tenantId, status: 'running' }, orderBy: { createdAt: 'asc' } })

    const [totalEvents, pendingEvents, activeJobs, totalJobs, activeHooks, latestUsage, recentEvents] = await Promise.all([
      prisma.aosEvent.count({ where: { tenantId } }),
      prisma.aosEvent.count({ where: { tenantId, status: 'published' } }),
      prisma.aosJob.count({ where: { tenantId, status: 'active' } }),
      prisma.aosJob.count({ where: { tenantId } }),
      prisma.aosHook.count({ where: { tenantId, isActive: true } }),
      prisma.aosResourceUsage.findFirst({ where: { tenantId }, orderBy: { periodAt: 'desc' } }),
      prisma.aosEvent.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 10 }),
    ])

    const summary = generateRuntimeSummary(
      runtime?.status ?? 'stopped',
      runtime?.totalEventsProcessed ?? 0,
      totalJobs,
      activeJobs,
      activeHooks,
      runtime?.uptimeSeconds ?? 0,
    )

    const channelStats = buildChannelStats(recentEvents)

    return {
      summary,
      runtime,
      stats: { totalEvents, pendingEvents, activeJobs, totalJobs, activeHooks, latestCost: latestUsage?.totalCost ?? 0 },
      channelStats,
      recentEvents,
      latestUsage,
    }
  })

  // ── Runtime CRUD ─────────────────────────────────────────────────────────────

  app.get('/runtime', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string; userId: string }
    const runtimes = await prisma.aosRuntime.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } })
    return { runtimes, total: runtimes.length }
  })

  app.post('/runtime', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { name: string; slug: string; description?: string; maxConcurrentAgents?: number; maxTokensPerHour?: number; maxCostPerDay?: number; config?: Record<string, unknown> }

    const runtime = await prisma.aosRuntime.create({
      data: {
        tenantId, name: body.name, slug: body.slug, description: body.description,
        status: 'running', startedAt: new Date(),
        maxConcurrentAgents: body.maxConcurrentAgents ?? 10,
        maxTokensPerHour: body.maxTokensPerHour,
        maxCostPerDay: body.maxCostPerDay,
        config: (body.config ?? {}) as never,
      },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'aos', entityType: 'AosRuntime', entityId: runtime.id, newValues: { slug: runtime.slug } as never } }).catch(() => null)

    return runtime
  })

  app.patch('/runtime/:id', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = req.body as Record<string, unknown>

    const runtime = await prisma.aosRuntime.findFirst({ where: { tenantId, id } })
    if (!runtime) return { error: 'Runtime not found' }

    const updated = await prisma.aosRuntime.update({
      where: { id },
      data: {
        status: body.status as string ?? runtime.status,
        maxConcurrentAgents: body.maxConcurrentAgents as number ?? runtime.maxConcurrentAgents,
        maxTokensPerHour: body.maxTokensPerHour as number ?? runtime.maxTokensPerHour,
        maxCostPerDay: body.maxCostPerDay as number ?? runtime.maxCostPerDay,
        startedAt: body.status === 'running' ? new Date() : runtime.startedAt,
      },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE', module: 'aos', entityType: 'AosRuntime', entityId: id, newValues: body as never } }).catch(() => null)

    return updated
  })

  // ── Events (Event Bus) ───────────────────────────────────────────────────────

  app.get('/events', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string; userId: string }
    const { channel, status, sourceType, limit } = req.query as { channel?: string; status?: string; sourceType?: string; limit?: string }

    const where: Record<string, unknown> = { tenantId }
    if (channel) where.channel = channel
    if (status) where.status = status
    if (sourceType) where.sourceType = sourceType

    const events = await prisma.aosEvent.findMany({
      where, orderBy: { createdAt: 'desc' }, take: Math.min(parseInt(limit ?? '50'), 200),
    })

    return { events, total: events.length }
  })

  app.get('/events/channels', async (_req) => {
    return { channels: [...(await import('./ai-engine.js')).EVENT_CHANNELS] }
  })

  app.post('/events/publish', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { channel: string; sourceType?: string; sourceId?: string; payload?: Record<string, unknown>; runtimeId?: string }

    const payload = body.payload ?? {}
    const priority = resolveEventPriority(body.channel, payload)

    const event = await prisma.aosEvent.create({
      data: {
        tenantId,
        runtimeId: body.runtimeId,
        channel: body.channel,
        sourceType: body.sourceType ?? 'user',
        sourceId: body.sourceId ?? userId,
        payload: payload as never,
        priority,
        status: 'published',
        consumers: 0,
      },
    })

    // Update runtime event counter
    if (body.runtimeId) {
      await prisma.aosRuntime.updateMany({
        where: { tenantId, id: body.runtimeId },
        data: { totalEventsProcessed: { increment: 1 } },
      })
    }

    // Fire matching hooks
    const hooks = await prisma.aosHook.findMany({ where: { tenantId, isActive: true } })
    let hooksFired = 0
    for (const hook of hooks) {
      const conditions = hook.conditions as Record<string, unknown>
      if (!evaluateHookConditions(conditions, payload)) continue
      await prisma.aosHook.update({ where: { id: hook.id }, data: { totalFired: { increment: 1 }, lastFiredAt: new Date() } }).catch(() => null)
      hooksFired++
    }

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'PUBLISH', module: 'aos', entityType: 'AosEvent', entityId: event.id, newValues: { channel: event.channel, priority, hooksFired } as never } }).catch(() => null)

    return { event, hooksFired }
  })

  app.post('/events/:id/consume', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }

    const event = await prisma.aosEvent.findFirst({ where: { tenantId, id } })
    if (!event) return { error: 'Event not found' }

    const updated = await prisma.aosEvent.update({
      where: { id },
      data: { consumers: event.consumers + 1, status: 'consumed', processedAt: new Date() },
    })

    return updated
  })

  // ── Job Templates ────────────────────────────────────────────────────────────

  app.get('/job-templates', async (_req) => {
    return { templates: JOB_TEMPLATES, total: JOB_TEMPLATES.length }
  })

  app.post('/job-templates/install', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { slug: string; runtimeId?: string }

    const template = JOB_TEMPLATES.find(t => t.slug === body.slug)
    if (!template) return { error: 'Template not found' }

    const existing = await prisma.aosJob.findFirst({ where: { tenantId, slug: body.slug } })
    if (existing) return existing

    const nextRunAt = template.defaultSchedule ? calculateNextRunAt(template.defaultSchedule) : undefined

    const job = await prisma.aosJob.create({
      data: {
        tenantId, runtimeId: body.runtimeId,
        name: template.name, slug: template.slug,
        jobType: template.jobType, schedule: template.defaultSchedule,
        handler: template.handler, params: template.params as never,
        priority: 'normal', status: 'active',
        nextRunAt,
      },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'INSTALL', module: 'aos', entityType: 'AosJob', entityId: job.id, newValues: { slug: job.slug } as never } }).catch(() => null)

    return job
  })

  // ── Jobs CRUD ────────────────────────────────────────────────────────────────

  app.get('/jobs', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string; userId: string }
    const { status, jobType } = req.query as { status?: string; jobType?: string }

    const where: Record<string, unknown> = { tenantId }
    if (status) where.status = status
    if (jobType) where.jobType = jobType

    const jobs = await prisma.aosJob.findMany({
      where, orderBy: [{ status: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { executions: true } } },
    })

    return { jobs: jobs.map(j => ({ ...j, scheduleDescription: j.schedule ? parseCronDescription(j.schedule) : 'Manual' })), total: jobs.length }
  })

  app.post('/jobs', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { name: string; slug: string; jobType: string; handler: string; schedule?: string; params?: Record<string, unknown>; runtimeId?: string; priority?: string }

    const nextRunAt = body.schedule ? calculateNextRunAt(body.schedule) : undefined

    const job = await prisma.aosJob.create({
      data: {
        tenantId, runtimeId: body.runtimeId,
        name: body.name, slug: body.slug,
        jobType: body.jobType, schedule: body.schedule,
        handler: body.handler, params: (body.params ?? {}) as never,
        priority: body.priority ?? 'normal', status: 'active',
        nextRunAt,
      },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'aos', entityType: 'AosJob', entityId: job.id, newValues: { slug: job.slug, handler: job.handler } as never } }).catch(() => null)

    return job
  })

  app.patch('/jobs/:id', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = req.body as Record<string, unknown>

    const job = await prisma.aosJob.findFirst({ where: { tenantId, id } })
    if (!job) return { error: 'Job not found' }

    const updated = await prisma.aosJob.update({
      where: { id },
      data: {
        status: body.status as string ?? job.status,
        schedule: body.schedule as string ?? job.schedule,
        priority: body.priority as string ?? job.priority,
        nextRunAt: body.schedule ? calculateNextRunAt(body.schedule as string) : job.nextRunAt,
      },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE', module: 'aos', entityType: 'AosJob', entityId: id, newValues: body as never } }).catch(() => null)

    return updated
  })

  app.post('/jobs/:id/run', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }

    const job = await prisma.aosJob.findFirst({ where: { tenantId, id } })
    if (!job) return { error: 'Job not found' }

    const execution = await prisma.aosJobExecution.create({
      data: { tenantId, jobId: id, status: 'running', input: job.params as never, startedAt: new Date() },
    })

    const result = simulateJobExecution(job.handler, job.params as Record<string, unknown>)

    const completedAt = new Date()
    const updated = await prisma.aosJobExecution.update({
      where: { id: execution.id },
      data: { status: result.status, output: result.output as never, durationMs: result.durationMs, completedAt },
    })

    await prisma.aosJob.update({
      where: { id },
      data: {
        totalRuns: { increment: 1 },
        failedRuns: result.status === 'failed' ? { increment: 1 } : undefined,
        lastRunAt: completedAt,
        nextRunAt: job.schedule ? calculateNextRunAt(job.schedule) : undefined,
      },
    })

    if (job.runtimeId) {
      await prisma.aosRuntime.updateMany({ where: { id: job.runtimeId }, data: { totalJobsRun: { increment: 1 } } })
    }

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'RUN', module: 'aos', entityType: 'AosJobExecution', entityId: updated.id, newValues: { jobSlug: job.slug, status: result.status, durationMs: result.durationMs } as never } }).catch(() => null)

    return { execution: updated, output: result.output, durationMs: result.durationMs }
  })

  app.delete('/jobs/:id', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }

    const job = await prisma.aosJob.findFirst({ where: { tenantId, id } })
    if (!job) return { error: 'Job not found' }

    await prisma.aosJob.delete({ where: { id } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'DELETE', module: 'aos', entityType: 'AosJob', entityId: id, newValues: { slug: job.slug } as never } }).catch(() => null)

    return { success: true }
  })

  app.get('/jobs/:id/executions', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }

    const executions = await prisma.aosJobExecution.findMany({
      where: { tenantId, jobId: id }, orderBy: { startedAt: 'desc' }, take: 30,
    })

    return { executions, total: executions.length }
  })

  // ── Resource Usage ───────────────────────────────────────────────────────────

  app.get('/resource-usage', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string; userId: string }
    const { period, limit } = req.query as { period?: string; limit?: string }

    const where: Record<string, unknown> = { tenantId }
    if (period) where.period = period

    const usage = await prisma.aosResourceUsage.findMany({
      where, orderBy: { periodAt: 'desc' }, take: Math.min(parseInt(limit ?? '24'), 168),
    })

    return { usage, total: usage.length }
  })

  app.post('/resource-usage/capture', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { period?: string }
    const period = body.period ?? 'hourly'
    const periodAt = new Date()
    if (period === 'hourly') { periodAt.setMinutes(0, 0, 0) }
    else { periodAt.setHours(0, 0, 0, 0) }

    // Get the runtime limits
    const runtime = await prisma.aosRuntime.findFirst({ where: { tenantId, status: 'running' } })

    // Gather live metrics
    const periodStart = new Date(periodAt)
    const [toolCalls, agentTasks, eventsPublished, jobsExecuted, costAgg] = await Promise.all([
      prisma.ualToolExecution.count({ where: { tenantId, createdAt: { gte: periodStart } } }),
      prisma.eapAgentTask.count({ where: { tenantId, createdAt: { gte: periodStart } } }),
      prisma.aosEvent.count({ where: { tenantId, createdAt: { gte: periodStart } } }),
      prisma.aosJobExecution.count({ where: { tenantId, startedAt: { gte: periodStart } } }),
      prisma.ualToolExecution.aggregate({ where: { tenantId, createdAt: { gte: periodStart } }, _sum: { cost: true } }),
    ])

    const totalCost = costAgg._sum.cost ?? 0
    const { alerts, budgetUsedPct } = analyzeResourceUsage(totalCost, runtime?.maxCostPerDay ?? null, 0, runtime?.maxTokensPerHour ?? null, toolCalls, agentTasks)

    const data = {
      tenantId, period, periodAt,
      toolCallsTotal: toolCalls, agentTasksTotal: agentTasks,
      eventsPublished, jobsExecuted, totalCost,
      budgetUsedPct, alerts: alerts as never,
    }

    const existing = await prisma.aosResourceUsage.findFirst({ where: { tenantId, period, periodAt } })
    const snapshot = existing
      ? await prisma.aosResourceUsage.update({ where: { id: existing.id }, data })
      : await prisma.aosResourceUsage.create({ data })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CAPTURE', module: 'aos', entityType: 'AosResourceUsage', entityId: snapshot.id, newValues: { period, totalCost, alerts: alerts.length } as never } }).catch(() => null)

    return { snapshot, alerts }
  })

  // ── Hooks ────────────────────────────────────────────────────────────────────

  app.get('/hooks', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string; userId: string }
    const hooks = await prisma.aosHook.findMany({ where: { tenantId }, orderBy: [{ priority: 'desc' }, { name: 'asc' }] })
    return { hooks, total: hooks.length }
  })

  app.post('/hooks', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { name: string; slug: string; hookType: string; handler: string; handlerType?: string; conditions?: Record<string, unknown>; priority?: number }

    const hook = await prisma.aosHook.create({
      data: {
        tenantId, name: body.name, slug: body.slug,
        hookType: body.hookType, handler: body.handler,
        handlerType: body.handlerType ?? 'internal',
        conditions: (body.conditions ?? {}) as never,
        priority: body.priority ?? 0,
        isActive: true,
      },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'aos', entityType: 'AosHook', entityId: hook.id, newValues: { slug: hook.slug, hookType: hook.hookType } as never } }).catch(() => null)

    return hook
  })

  app.patch('/hooks/:id', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = req.body as Record<string, unknown>

    const hook = await prisma.aosHook.findFirst({ where: { tenantId, id } })
    if (!hook) return { error: 'Hook not found' }

    const updated = await prisma.aosHook.update({
      where: { id },
      data: {
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : hook.isActive,
        priority: body.priority as number ?? hook.priority,
        handler: body.handler as string ?? hook.handler,
        conditions: body.conditions ? (body.conditions as never) : hook.conditions,
      },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE', module: 'aos', entityType: 'AosHook', entityId: id, newValues: body as never } }).catch(() => null)

    return updated
  })

  app.post('/hooks/:id/test', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = req.body as { payload?: Record<string, unknown> }

    const hook = await prisma.aosHook.findFirst({ where: { tenantId, id } })
    if (!hook) return { error: 'Hook not found' }

    const payload = body.payload ?? { test: true, userId }
    const conditions = hook.conditions as Record<string, unknown>
    const fired = evaluateHookConditions(conditions, payload)

    if (fired) {
      await prisma.aosHook.update({ where: { id }, data: { totalFired: { increment: 1 }, lastFiredAt: new Date() } })
    }

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'TEST', module: 'aos', entityType: 'AosHook', entityId: id, newValues: { fired, payload } as never } }).catch(() => null)

    return { fired, reason: fired ? 'Conditions matched' : 'Conditions did not match', handler: hook.handler }
  })

  app.delete('/hooks/:id', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }

    const hook = await prisma.aosHook.findFirst({ where: { tenantId, id } })
    if (!hook) return { error: 'Hook not found' }

    await prisma.aosHook.delete({ where: { id } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'DELETE', module: 'aos', entityType: 'AosHook', entityId: id, newValues: { slug: hook.slug } as never } }).catch(() => null)

    return { success: true }
  })
}
