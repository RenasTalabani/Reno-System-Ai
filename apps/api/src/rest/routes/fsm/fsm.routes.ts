import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

export async function fsmRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Work Orders ────────────────────────────────────────────────────────────

  app.get('/work-orders', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const where: any = { tenantId }
    if (q.status) where.status = q.status
    if (q.priority) where.priority = q.priority
    if (q.assignedTo) where.assignedTo = q.assignedTo
    if (q.search) where.OR = [{ title: { contains: q.search, mode: 'insensitive' } }, { customerName: { contains: q.search, mode: 'insensitive' } }]
    const orders = await prisma.fsmWorkOrder.findMany({ where, orderBy: [{ priority: 'desc' }, { scheduledAt: 'asc' }], include: { _count: { select: { checklists: true } } } })
    return reply.send(buildSuccessResponse(orders))
  })

  app.get('/work-orders/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const order = await prisma.fsmWorkOrder.findFirst({ where: { id, tenantId }, include: { checklists: { orderBy: { orderIndex: 'asc' } } } })
    if (!order) throw new RenoError(ErrorCode.NOT_FOUND, 'Work order not found', 404)
    return reply.send(buildSuccessResponse(order))
  })

  app.post('/work-orders', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any
    const order = await prisma.fsmWorkOrder.create({
      data: { tenantId, createdBy: userId, title: body.title, type: body.type ?? 'maintenance', priority: body.priority ?? 'medium', customerName: body.customerName, customerId: body.customerId, location: body.location, latitude: body.latitude, longitude: body.longitude, description: body.description, scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined, slaDueAt: body.slaDueAt ? new Date(body.slaDueAt) : undefined, assignedTo: body.assignedTo },
    })
    return reply.status(201).send(buildSuccessResponse(order))
  })

  app.put('/work-orders/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const body = request.body as any
    const updated = await prisma.fsmWorkOrder.updateMany({ where: { id, tenantId }, data: { ...body, scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined } })
    if (!updated.count) throw new RenoError(ErrorCode.NOT_FOUND, 'Work order not found', 404)
    return reply.send(buildSuccessResponse({ updated: true }))
  })

  // PATCH /fsm/work-orders/:id/start
  app.patch('/work-orders/:id/start', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    await prisma.fsmWorkOrder.updateMany({ where: { id, tenantId }, data: { status: 'in_progress', startedAt: new Date() } })
    return reply.send(buildSuccessResponse({ status: 'in_progress' }))
  })

  // PATCH /fsm/work-orders/:id/complete
  app.patch('/work-orders/:id/complete', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const { resolution, laborHours } = request.body as any
    await prisma.fsmWorkOrder.updateMany({ where: { id, tenantId }, data: { status: 'completed', completedAt: new Date(), resolution, laborHours: laborHours ?? 0 } })
    return reply.send(buildSuccessResponse({ status: 'completed' }))
  })

  // ── Checklists ─────────────────────────────────────────────────────────────

  app.post('/work-orders/:id/checklists', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const body = request.body as any
    const items = Array.isArray(body.items) ? body.items : [{ item: body.item }]
    const maxOrder = await prisma.fsmChecklist.count({ where: { workOrderId: id } })
    await prisma.fsmChecklist.createMany({ data: items.map((it: any, i: number) => ({ tenantId, workOrderId: id, item: it.item ?? it, orderIndex: maxOrder + i })) })
    return reply.status(201).send(buildSuccessResponse({ added: items.length }))
  })

  app.patch('/work-orders/:id/checklists/:checkId', async (request, reply) => {
    const { userId } = request as any
    const { checkId } = request.params as any
    const { isDone } = request.body as any
    await prisma.fsmChecklist.update({ where: { id: checkId }, data: { isDone, doneAt: isDone ? new Date() : null, doneBy: isDone ? userId : null } })
    return reply.send(buildSuccessResponse({ updated: true }))
  })

  // ── Technicians ────────────────────────────────────────────────────────────

  app.get('/technicians', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const where: any = { tenantId }
    if (q.available === 'true') where.isAvailable = true
    const technicians = await prisma.fsmTechnician.findMany({ where, orderBy: { name: 'asc' } })
    return reply.send(buildSuccessResponse(technicians))
  })

  app.post('/technicians', async (request, reply) => {
    const { tenantId } = request as any
    const body = request.body as any
    const tech = await prisma.fsmTechnician.upsert({
      where: { tenantId_userId: { tenantId, userId: body.userId } },
      create: { tenantId, userId: body.userId, name: body.name, skills: body.skills ?? [], territory: body.territory },
      update: { name: body.name, skills: body.skills ?? [], territory: body.territory },
    })
    return reply.status(201).send(buildSuccessResponse(tech))
  })

  // PATCH /fsm/technicians/:id/location — mobile app GPS update
  app.patch('/technicians/:id/location', async (request, reply) => {
    const { id } = request.params as any
    const { latitude, longitude } = request.body as any
    await prisma.fsmTechnician.update({ where: { id }, data: { currentLat: latitude, currentLng: longitude, locationUpdatedAt: new Date() } })
    return reply.send(buildSuccessResponse({ updated: true }))
  })

  // ── Dashboard ──────────────────────────────────────────────────────────────

  app.get('/dashboard', async (request, reply) => {
    const { tenantId } = request as any
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today.getTime() + 86400000)
    const [byStatus, todayOrders, overdueCount, availableTechs] = await Promise.all([
      prisma.fsmWorkOrder.groupBy({ by: ['status'], where: { tenantId }, _count: { status: true } }),
      prisma.fsmWorkOrder.count({ where: { tenantId, scheduledAt: { gte: today, lt: tomorrow } } }),
      prisma.fsmWorkOrder.count({ where: { tenantId, status: { not: 'completed' }, slaDueAt: { lt: new Date() } } }),
      prisma.fsmTechnician.count({ where: { tenantId, isAvailable: true } }),
    ])
    return reply.send(buildSuccessResponse({
      byStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count.status])),
      scheduledToday: todayOrders,
      overdueOrders: overdueCount,
      availableTechnicians: availableTechs,
    }))
  })
}
