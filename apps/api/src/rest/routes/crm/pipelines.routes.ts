import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function crmPipelineRoutes(app: FastifyInstance) {
  // GET /pipelines
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const pipelines = await prisma.crmPipeline.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        stages: { where: { deletedAt: null }, orderBy: { position: 'asc' } },
        _count: { select: { opportunities: true } },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    })
    return reply.send({ success: true, data: pipelines })
  })

  // POST /pipelines
  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const pipeline = await prisma.crmPipeline.create({
      data: {
        tenantId,
        name: body.name,
        description: body.description,
        currency: body.currency ?? 'USD',
        isDefault: body.isDefault ?? false,
        createdBy: userId,
        updatedBy: userId,
      },
    })

    // Auto-create default stages if none provided
    const stageDefs = body.stages ?? [
      { name: 'New Lead', position: 0, probability: 10, color: '#94a3b8' },
      { name: 'Qualified', position: 1, probability: 25, color: '#6366f1' },
      { name: 'Proposal', position: 2, probability: 50, color: '#f59e0b' },
      { name: 'Negotiation', position: 3, probability: 75, color: '#f97316' },
      { name: 'Won', position: 4, probability: 100, color: '#22c55e', isWon: true },
      { name: 'Lost', position: 5, probability: 0, color: '#ef4444', isLost: true },
    ]

    for (const s of stageDefs) {
      await prisma.crmPipelineStage.create({
        data: {
          tenantId,
          pipelineId: pipeline.id,
          name: s.name,
          position: s.position,
          probability: s.probability ?? 0,
          color: s.color ?? '#6366f1',
          isWon: s.isWon ?? false,
          isLost: s.isLost ?? false,
          createdBy: userId,
          updatedBy: userId,
        },
      })
    }

    const full = await prisma.crmPipeline.findUnique({
      where: { id: pipeline.id },
      include: { stages: { where: { deletedAt: null }, orderBy: { position: 'asc' } } },
    })
    return reply.code(201).send({ success: true, data: full })
  })

  // GET /pipelines/:id
  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as { id: string }
    const pipeline = await prisma.crmPipeline.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        stages: { where: { deletedAt: null }, orderBy: { position: 'asc' } },
        _count: { select: { opportunities: true } },
      },
    })
    if (!pipeline) return reply.code(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: pipeline })
  })

  // PUT /pipelines/:id
  app.put('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as { id: string }
    const body = req.body as any
    const pipeline = await prisma.crmPipeline.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { ...body, updatedBy: userId },
    })
    if (!pipeline.count) return reply.code(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true })
  })

  // DELETE /pipelines/:id
  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as { id: string }
    await prisma.crmPipeline.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date(), updatedBy: userId },
    })
    return reply.send({ success: true })
  })

  // PATCH /pipelines/:id/stages/reorder
  app.patch('/:id/stages/reorder', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as { id: string }
    const { order } = req.body as { order: Array<{ id: string; position: number }> }
    for (const item of order) {
      await prisma.crmPipelineStage.updateMany({
        where: { id: item.id, pipelineId: id, tenantId },
        data: { position: item.position, updatedBy: userId },
      })
    }
    return reply.send({ success: true })
  })
}
