import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function crmActivityRoutes(app: FastifyInstance) {
  // GET /activities
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { contactId, companyId, opportunityId, activityType, status, ownerId, limit = '50', page = '1' } = req.query as any
    const take = Math.min(parseInt(limit), 200)
    const skip = (parseInt(page) - 1) * take

    const where: any = { tenantId, deletedAt: null }
    if (contactId) where.contactId = contactId
    if (companyId) where.companyId = companyId
    if (opportunityId) where.opportunityId = opportunityId
    if (activityType) where.activityType = activityType
    if (status) where.status = status
    if (ownerId) where.ownerId = ownerId

    const [activities, total] = await Promise.all([
      prisma.crmActivity.findMany({
        where,
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
          company: { select: { id: true, name: true } },
          opportunity: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.crmActivity.count({ where }),
    ])

    return reply.send({ success: true, data: activities, meta: { pagination: { total, page: parseInt(page), limit: take } } })
  })

  // POST /activities
  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const activity = await prisma.crmActivity.create({
      data: {
        tenantId,
        contactId: body.contactId,
        companyId: body.companyId,
        opportunityId: body.opportunityId,
        ownerId: body.ownerId ?? userId,
        activityType: body.activityType,
        subject: body.subject,
        description: body.description,
        outcome: body.outcome,
        status: body.status ?? 'scheduled',
        direction: body.direction,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        completedAt: body.completedAt ? new Date(body.completedAt) : undefined,
        durationMinutes: body.durationMinutes,
        location: body.location,
        createdBy: userId,
        updatedBy: userId,
      },
    })
    return reply.code(201).send({ success: true, data: activity })
  })

  // GET /activities/:id
  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as { id: string }
    const activity = await prisma.crmActivity.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
        opportunity: { select: { id: true, name: true } },
      },
    })
    if (!activity) return reply.code(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: activity })
  })

  // PUT /activities/:id
  app.put('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as { id: string }
    const body = req.body as any
    const allowed = ['subject','description','outcome','status','direction','scheduledAt','completedAt','durationMinutes','location','activityType']
    const data: any = { updatedBy: userId }
    for (const k of allowed) {
      if (body[k] !== undefined) {
        data[k] = (k === 'scheduledAt' || k === 'completedAt') && body[k] ? new Date(body[k]) : body[k]
      }
    }
    await prisma.crmActivity.updateMany({ where: { id, tenantId, deletedAt: null }, data })
    return reply.send({ success: true })
  })

  // PATCH /activities/:id/complete
  app.patch('/:id/complete', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as { id: string }
    const { outcome, durationMinutes } = req.body as any
    await prisma.crmActivity.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { status: 'completed', completedAt: new Date(), outcome, durationMinutes, updatedBy: userId },
    })
    return reply.send({ success: true })
  })

  // DELETE /activities/:id
  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as { id: string }
    await prisma.crmActivity.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date(), updatedBy: userId },
    })
    return reply.send({ success: true })
  })
}
