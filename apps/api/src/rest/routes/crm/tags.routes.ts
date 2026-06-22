import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function crmTagRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { entityType } = req.query as any
    const where: any = { tenantId, deletedAt: null }
    if (entityType) where.entityType = { in: [entityType, 'all'] }
    const tags = await prisma.crmTag.findMany({ where, orderBy: [{ usageCount: 'desc' }, { name: 'asc' }] })
    return reply.send({ success: true, data: tags })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { name, color, entityType } = req.body as any
    const tag = await prisma.crmTag.upsert({
      where: { tenantId_name: { tenantId, name } },
      update: { color: color ?? '#6366f1', entityType: entityType ?? 'all', updatedBy: userId },
      create: { tenantId, name, color: color ?? '#6366f1', entityType: entityType ?? 'all', createdBy: userId, updatedBy: userId },
    })
    return reply.code(201).send({ success: true, data: tag })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as { id: string }
    await prisma.crmTag.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date(), updatedBy: userId },
    })
    return reply.send({ success: true })
  })
}
