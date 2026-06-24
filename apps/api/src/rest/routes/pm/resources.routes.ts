import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

export async function pmResourceRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // GET /pm/resources?projectId=&userId=
  app.get('/', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any

    const where: any = { tenantId, deletedAt: null }
    if (q.projectId) where.projectId = q.projectId
    if (q.userId) where.userId = q.userId
    if (q.from) where.startDate = { gte: new Date(q.from) }
    if (q.to) where.endDate = { lte: new Date(q.to) }

    const allocations = await prisma.pmResourceAllocation.findMany({
      where,
      orderBy: { startDate: 'asc' },
      include: { project: { select: { id: true, name: true, code: true, color: true } } },
    })

    return reply.send(buildSuccessResponse(allocations))
  })

  // GET /pm/resources/capacity?userId=&from=&to= — workload view
  app.get('/capacity', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any

    const from = q.from ? new Date(q.from) : new Date()
    const to = q.to ? new Date(q.to) : new Date(from.getTime() + 30 * 86400000)

    const allocations = await prisma.pmResourceAllocation.findMany({
      where: {
        tenantId, deletedAt: null,
        AND: [{ startDate: { lte: to } }, { endDate: { gte: from } }],
        ...(q.userId && { userId: q.userId }),
      },
      include: { project: { select: { id: true, name: true, code: true, color: true } } },
    })

    // Group by userId
    const byUser: Record<string, { totalPct: number; projects: any[]; burnoutRisk: number }> = {}
    for (const a of allocations) {
      if (!byUser[a.userId]) byUser[a.userId] = { totalPct: 0, projects: [], burnoutRisk: 0 }
      const entry = byUser[a.userId]!
      entry.totalPct += Number(a.allocationPct)
      entry.projects.push(a)
      if (Number(a.burnoutRisk ?? 0) > entry.burnoutRisk) {
        entry.burnoutRisk = Number(a.burnoutRisk ?? 0)
      }
    }

    return reply.send(buildSuccessResponse({ from: from.toISOString(), to: to.toISOString(), byUser }))
  })

  // POST /pm/resources
  app.post('/', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any

    const allocation = await prisma.pmResourceAllocation.create({
      data: {
        tenantId, projectId: body.projectId, userId: body.userId,
        allocatedHours: body.allocatedHours ?? 0,
        allocationPct: body.allocationPct ?? 100,
        startDate: new Date(body.startDate), endDate: new Date(body.endDate),
        burnoutRisk: body.burnoutRisk, notes: body.notes, createdBy: userId,
      },
    })

    return reply.status(201).send(buildSuccessResponse(allocation))
  })

  // PUT /pm/resources/:id
  app.put('/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const body = request.body as any

    const existing = await prisma.pmResourceAllocation.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!existing) throw new RenoError(ErrorCode.NOT_FOUND, 'Allocation not found', 404)

    const updated = await prisma.pmResourceAllocation.update({
      where: { id },
      data: {
        ...body,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        updatedBy: userId,
      },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // DELETE /pm/resources/:id
  app.delete('/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any

    await prisma.pmResourceAllocation.updateMany({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false, updatedBy: userId },
    })

    return reply.send(buildSuccessResponse({ id }))
  })
}
