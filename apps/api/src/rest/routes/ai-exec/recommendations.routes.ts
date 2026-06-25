import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function aiExecRecommendationsRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { status, category, limit = 20, offset = 0 } = req.query as any
    const where: any = { tenantId, deletedAt: null }
    if (status) where.status = status
    if (category) where.category = category
    const [items, total] = await Promise.all([
      prisma.aiExecRecommendation.findMany({
        where, orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: Number(limit), skip: Number(offset),
      }),
      prisma.aiExecRecommendation.count({ where }),
    ])
    return reply.send({ success: true, data: items, meta: { total } })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const item = await prisma.aiExecRecommendation.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!item) return reply.status(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: item })
  })

  // Human approves a recommendation
  app.post('/:id/approve', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { notes } = req.body as any

    const rec = await prisma.aiExecRecommendation.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!rec) return reply.status(404).send({ success: false, error: 'Not found' })
    if (rec.status !== 'pending') return reply.status(400).send({ success: false, error: 'Only pending recommendations can be approved' })

    const updated = await prisma.aiExecRecommendation.update({
      where: { id },
      data: { status: 'approved', approvedBy: userId, approvedAt: new Date(), outcome: notes },
    })

    await prisma.brainAuditLog.create({
      data: { tenantId, userId, action: 'approve_recommendation', module: 'ai_executive', entityType: 'recommendation', entityId: id, metadata: { notes } as any },
    })

    return reply.send({ success: true, data: updated })
  })

  // Human rejects a recommendation
  app.post('/:id/reject', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { reason } = req.body as any

    const rec = await prisma.aiExecRecommendation.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!rec) return reply.status(404).send({ success: false, error: 'Not found' })
    if (rec.status !== 'pending') return reply.status(400).send({ success: false, error: 'Only pending recommendations can be rejected' })

    const updated = await prisma.aiExecRecommendation.update({
      where: { id },
      data: { status: 'rejected', rejectedBy: userId, rejectedAt: new Date(), rejectionReason: reason },
    })

    await prisma.brainAuditLog.create({
      data: { tenantId, userId, action: 'reject_recommendation', module: 'ai_executive', entityType: 'recommendation', entityId: id, metadata: { reason } as any },
    })

    return reply.send({ success: true, data: updated })
  })

  // Mark as implemented
  app.post('/:id/implement', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { outcomeNotes } = req.body as any

    const rec = await prisma.aiExecRecommendation.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!rec) return reply.status(404).send({ success: false, error: 'Not found' })
    if (rec.status !== 'approved') return reply.status(400).send({ success: false, error: 'Only approved recommendations can be implemented' })

    const updated = await prisma.aiExecRecommendation.update({
      where: { id },
      data: { status: 'implemented', implementedAt: new Date(), outcome: outcomeNotes },
    })

    await prisma.brainAuditLog.create({
      data: { tenantId, userId, action: 'implement_recommendation', module: 'ai_executive', entityType: 'recommendation', entityId: id, metadata: { outcomeNotes } as any },
    })

    return reply.send({ success: true, data: updated })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    await prisma.aiExecRecommendation.updateMany({ where: { id, tenantId }, data: { deletedAt: new Date() } })
    return reply.send({ success: true })
  })
}
