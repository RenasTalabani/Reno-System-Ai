import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function invReorderRuleRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { warehouseId, productId } = req.query as any
    const where: any = { tenantId, deletedAt: null }
    if (warehouseId) where.warehouseId = warehouseId
    if (productId) where.productId = productId
    const rules = await prisma.invReorderRule.findMany({
      where,
      include: {
        product: { select: { name: true, code: true, unit: { select: { symbol: true } } } },
        warehouse: { select: { name: true, code: true } },
      },
      orderBy: { product: { name: 'asc' } },
    })

    // Enrich with current stock
    const enriched = await Promise.all(rules.map(async r => {
      const balance = await prisma.invStockBalance.findUnique({
        where: { tenantId_productId_warehouseId: { tenantId, productId: r.productId, warehouseId: r.warehouseId } },
      })
      const onHand = balance ? Number(balance.onHand) : 0
      return { ...r, onHand, needsReorder: onHand < Number(r.minQty) }
    }))

    return reply.send({ success: true, data: enriched })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { productId, warehouseId, minQty, maxQty, reorderQty, leadTimeDays } = req.body as any
    const rule = await prisma.invReorderRule.create({
      data: { tenantId, productId, warehouseId, minQty, maxQty, reorderQty, leadTimeDays: leadTimeDays ?? 7, createdBy: userId, updatedBy: userId },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'inventory', entityType: 'InvReorderRule', entityId: rule.id, newValues: { productId, warehouseId } } })
    return reply.code(201).send({ success: true, data: rule })
  })

  app.patch('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any
    const allowed = ['minQty', 'maxQty', 'reorderQty', 'leadTimeDays', 'isActive']
    const data: any = { updatedBy: userId }
    allowed.forEach(k => { if (k in body) data[k] = body[k] })
    const rule = await prisma.invReorderRule.update({ where: { id }, data })
    return reply.send({ success: true, data: rule })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    await prisma.invReorderRule.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedBy: userId } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'DELETE', module: 'inventory', entityType: 'InvReorderRule', entityId: id, newValues: {} } })
    return reply.send({ success: true })
  })

  // Trigger check: returns all rules that need reordering
  app.get('/needs-reorder', async (req, reply) => {
    const { tenantId } = req as any
    const rules = await prisma.invReorderRule.findMany({
      where: { tenantId, isActive: true, deletedAt: null },
      include: {
        product: { select: { name: true, code: true, unit: { select: { symbol: true } } } },
        warehouse: { select: { name: true, code: true } },
      },
    })
    const alerts = await Promise.all(rules.map(async r => {
      const balance = await prisma.invStockBalance.findUnique({
        where: { tenantId_productId_warehouseId: { tenantId, productId: r.productId, warehouseId: r.warehouseId } },
      })
      const onHand = balance ? Number(balance.onHand) : 0
      return { ...r, onHand, needsReorder: onHand < Number(r.minQty) }
    }))
    const needsReorder = alerts.filter(a => a.needsReorder)
    return reply.send({ success: true, data: needsReorder, meta: { total: needsReorder.length } })
  })
}
