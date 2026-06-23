import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function invMovementRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { page = '1', limit = '50', type, productId, warehouseId, fromDate, toDate } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)
    const where: any = { tenantId, deletedAt: null }
    if (type) where.type = type
    if (productId) where.productId = productId
    if (warehouseId) where.OR = [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }]
    if (fromDate || toDate) {
      where.date = {}
      if (fromDate) where.date.gte = new Date(fromDate)
      if (toDate) where.date.lte = new Date(toDate)
    }
    const [total, items] = await Promise.all([
      prisma.invMovement.count({ where }),
      prisma.invMovement.findMany({
        where, skip, take: Number(limit),
        include: {
          product: { select: { name: true, code: true, unit: { select: { symbol: true } } } },
          fromWarehouse: { select: { name: true, code: true } },
          toWarehouse: { select: { name: true, code: true } },
          lot: { select: { number: true } },
        },
        orderBy: { date: 'desc' },
      }),
    ])
    return reply.send({ success: true, data: items, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const item = await prisma.invMovement.findFirst({
      where: { id, tenantId },
      include: {
        product: true,
        fromWarehouse: true,
        toWarehouse: true,
        lot: true,
        serial: true,
      },
    })
    if (!item) return reply.code(404).send({ success: false, error: 'Movement not found' })
    return reply.send({ success: true, data: item })
  })
}
