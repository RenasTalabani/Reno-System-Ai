import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse } from '@reno/core'
import { requireAuth } from '../middleware/auth.js'

export async function aiUsageRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // GET /ai-usage — Current month summary
  app.get('/summary', async (request, reply) => {
    const { tenantId } = request as any

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const [tenant, logs] = await Promise.all([
      prisma.coreTenant.findUnique({ where: { id: tenantId }, select: { aiMonthlyTokenQuota: true } }),
      prisma.aiUsageLog.findMany({
        where: { tenantId, occurredAt: { gte: monthStart, lte: monthEnd } },
        select: { totalTokens: true, estimatedCostUsd: true, model: true, module: true, status: true },
      }),
    ])

    const totalTokens = logs.reduce((s, l) => s + l.totalTokens, 0)
    const totalCostUsd = logs.reduce((s, l) => s + Number(l.estimatedCostUsd), 0)
    const successCount = logs.filter(l => l.status === 'success').length
    const errorCount = logs.filter(l => l.status !== 'success').length

    const byModel = logs.reduce((acc: Record<string, number>, l) => {
      acc[l.model] = (acc[l.model] ?? 0) + l.totalTokens
      return acc
    }, {})

    const byModule = logs.reduce((acc: Record<string, number>, l) => {
      acc[l.module] = (acc[l.module] ?? 0) + l.totalTokens
      return acc
    }, {})

    return reply.send(buildSuccessResponse({
      period: { from: monthStart, to: monthEnd },
      quota: tenant?.aiMonthlyTokenQuota ?? null,
      quotaUsedPct: tenant?.aiMonthlyTokenQuota
        ? Math.round((totalTokens / tenant.aiMonthlyTokenQuota) * 100)
        : null,
      totalTokens,
      totalCostUsd: totalCostUsd.toFixed(6),
      totalRequests: logs.length,
      successCount,
      errorCount,
      byModel,
      byModule,
    }))
  })

  // GET /ai-usage/logs — Paginated logs
  app.get('/logs', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const page = Math.max(1, parseInt(q.page ?? '1'))
    const limit = Math.min(100, parseInt(q.limit ?? '50'))
    const skip = (page - 1) * limit

    const where: any = { tenantId }
    if (q.module) where.module = q.module
    if (q.userId) where.userId = q.userId
    if (q.status) where.status = q.status
    if (q.from) where.occurredAt = { ...where.occurredAt, gte: new Date(q.from) }
    if (q.to) where.occurredAt = { ...where.occurredAt, lte: new Date(q.to) }

    const [total, logs] = await Promise.all([
      prisma.aiUsageLog.count({ where }),
      prisma.aiUsageLog.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip,
        take: limit,
      }),
    ])

    return reply.send(buildSuccessResponse(logs, {
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }))
  })

  // POST /ai-usage/log — Internal: record an AI call (called by Reno Brain agents)
  app.post('/log', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any

    const log = await prisma.aiUsageLog.create({
      data: {
        tenantId,
        userId,
        sessionId: body.sessionId,
        module: body.module,
        feature: body.feature,
        provider: body.provider ?? 'anthropic',
        model: body.model,
        promptTokens: body.promptTokens ?? 0,
        completionTokens: body.completionTokens ?? 0,
        totalTokens: body.totalTokens ?? 0,
        estimatedCostUsd: body.estimatedCostUsd ?? 0,
        requestDurationMs: body.requestDurationMs,
        status: body.status ?? 'success',
        errorCode: body.errorCode,
        requestId: body.requestId,
        metadata: body.metadata,
      },
    })

    return reply.status(201).send(buildSuccessResponse(log))
  })

  // GET /ai-usage/quota — Get and update monthly token quota
  app.get('/quota', async (request, reply) => {
    const { tenantId } = request as any
    const tenant = await prisma.coreTenant.findUnique({
      where: { id: tenantId },
      select: { aiMonthlyTokenQuota: true },
    })
    return reply.send(buildSuccessResponse({ aiMonthlyTokenQuota: tenant?.aiMonthlyTokenQuota ?? null }))
  })

  app.patch('/quota', async (request, reply) => {
    const { tenantId } = request as any
    const { aiMonthlyTokenQuota } = request.body as { aiMonthlyTokenQuota: number | null }

    const tenant = await prisma.coreTenant.update({
      where: { id: tenantId },
      data: { aiMonthlyTokenQuota },
      select: { id: true, aiMonthlyTokenQuota: true },
    })

    await prisma.sysAuditLog.create({
      data: {
        tenantId,
        userId: (request as any).userId,
        action: 'UPDATE_AI_QUOTA',
        module: 'ai',
        entityType: 'core_tenants',
        entityId: tenantId,
        newValues: { aiMonthlyTokenQuota },
        ipAddress: request.ip,
      },
    })

    return reply.send(buildSuccessResponse(tenant))
  })
}
