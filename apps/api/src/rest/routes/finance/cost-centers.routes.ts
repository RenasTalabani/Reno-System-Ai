import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function finCostCenterRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const centers = await prisma.finCostCenter.findMany({
      where: { tenantId, deletedAt: null },
      include: { _count: { select: { children: true } } },
      orderBy: { code: 'asc' },
    })
    return reply.send({ success: true, data: centers })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const center = await prisma.finCostCenter.create({
      data: {
        tenantId, code: body.code, name: body.name,
        parentId: body.parentId, description: body.description,
        createdBy: userId, updatedBy: userId,
      },
    })
    return reply.code(201).send({ success: true, data: center })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const center = await prisma.finCostCenter.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { children: { where: { deletedAt: null }, orderBy: { code: 'asc' } } },
    })
    if (!center) return reply.code(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: center })
  })

  app.put('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any
    const data: any = { updatedBy: userId }
    for (const k of ['name','description','isActive']) if (body[k] !== undefined) data[k] = body[k]
    await prisma.finCostCenter.updateMany({ where: { id, tenantId, deletedAt: null }, data })
    return reply.send({ success: true })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    await prisma.finCostCenter.updateMany({ where: { id, tenantId, deletedAt: null }, data: { deletedAt: new Date(), updatedBy: userId } })
    return reply.send({ success: true })
  })
}
