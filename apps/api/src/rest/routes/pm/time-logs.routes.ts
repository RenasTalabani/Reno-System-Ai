import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

export async function pmTimeLogRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // GET /pm/time-logs — cross-project time log query
  app.get('/', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const page = Math.max(1, parseInt(q.page ?? '1'))
    const limit = Math.min(100, parseInt(q.limit ?? '20'))

    const where: any = { tenantId, deletedAt: null }
    if (q.projectId) where.projectId = q.projectId
    if (q.taskId) where.taskId = q.taskId
    if (q.userId) where.userId = q.userId
    if (q.isBillable !== undefined) where.isBillable = q.isBillable === 'true'
    if (q.from) where.startTime = { gte: new Date(q.from) }
    if (q.to) where.startTime = { ...where.startTime, lte: new Date(q.to) }

    const [total, logs] = await Promise.all([
      prisma.pmTimeLog.count({ where }),
      prisma.pmTimeLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startTime: 'desc' },
        include: { task: { select: { id: true, title: true } } },
      }),
    ])

    return reply.send(buildSuccessResponse(logs, {
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }))
  })

  // GET /pm/time-logs/summary?projectId=&userId=&month=&year=
  app.get('/summary', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const year = parseInt(q.year ?? String(new Date().getFullYear()))
    const month = parseInt(q.month ?? String(new Date().getMonth() + 1))

    const monthStart = new Date(year, month - 1, 1)
    const monthEnd = new Date(year, month, 0, 23, 59, 59)

    const where: any = { tenantId, deletedAt: null, startTime: { gte: monthStart, lte: monthEnd } }
    if (q.projectId) where.projectId = q.projectId
    if (q.userId) where.userId = q.userId

    const logs = await prisma.pmTimeLog.findMany({ where, select: { userId: true, projectId: true, durationMinutes: true, isBillable: true, hourlyRate: true } })

    const totalMinutes = logs.reduce((s, l) => s + (l.durationMinutes ?? 0), 0)
    const billableMinutes = logs.filter(l => l.isBillable).reduce((s, l) => s + (l.durationMinutes ?? 0), 0)
    const billableAmount = logs.filter(l => l.isBillable && l.hourlyRate).reduce((s, l) => s + (Number(l.hourlyRate) * (l.durationMinutes ?? 0) / 60), 0)

    // By user
    const byUser: Record<string, number> = {}
    for (const l of logs) {
      byUser[l.userId] = (byUser[l.userId] ?? 0) + (l.durationMinutes ?? 0)
    }

    return reply.send(buildSuccessResponse({
      year, month,
      totalHours: Number((totalMinutes / 60).toFixed(1)),
      billableHours: Number((billableMinutes / 60).toFixed(1)),
      billableAmount: Number(billableAmount.toFixed(2)),
      logCount: logs.length,
      byUser,
    }))
  })

  // DELETE /pm/time-logs/:id
  app.delete('/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any

    await prisma.pmTimeLog.updateMany({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false, updatedBy: userId },
    })

    return reply.send(buildSuccessResponse({ id }))
  })
}
