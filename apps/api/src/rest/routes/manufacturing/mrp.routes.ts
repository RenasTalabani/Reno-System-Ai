import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function mfgMrpRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const runs = await prisma.mfgMrpRun.findMany({
      where: { tenantId },
      include: { _count: { select: { demands: true, recommendations: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return reply.send({ success: true, data: runs })
  })

  // Trigger an MRP run
  app.post('/run', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { horizonDays = 30, notes } = req.body as any ?? {}

    const count = await prisma.mfgMrpRun.count({ where: { tenantId } })
    const number = `MRP-${String(count + 1).padStart(5, '0')}`

    const run = await prisma.mfgMrpRun.create({
      data: { tenantId, number, status: 'running', horizonDays, notes, createdBy: userId },
    })

    try {
      const horizonDate = new Date(Date.now() + horizonDays * 86400000)

      // Collect demand signals:
      // 1. Products below min stock level (safety stock demand)
      const lowStockProducts = await prisma.invStockBalance.groupBy({
        by: ['productId'],
        where: { tenantId },
        _sum: { onHand: true },
      })

      const productsWithMin = await prisma.invProduct.findMany({
        where: { tenantId, deletedAt: null, minStockLevel: { not: null }, type: { not: 'service' } },
      })

      const demandData: { productId: string; demandQty: number; dueDate: Date; source: string }[] = []

      for (const product of productsWithMin) {
        const balance = lowStockProducts.find(b => b.productId === product.id)
        const onHand = Number(balance?._sum.onHand ?? 0)
        const minStock = Number(product.minStockLevel ?? 0)
        if (onHand < minStock) {
          const reorderQty = Number(product.reorderQty ?? minStock - onHand)
          demandData.push({ productId: product.id, demandQty: reorderQty, dueDate: new Date(Date.now() + 7 * 86400000), source: 'safety_stock' })
        }
      }

      // Create demand records
      if (demandData.length > 0) {
        await prisma.mfgMrpDemand.createMany({
          data: demandData.map(d => ({ tenantId, mrpRunId: run.id, ...d })),
        })
      }

      // Generate recommendations: for each demand, check if product has a BOM (make) or needs to be bought
      const recommendations: { productId: string; type: string; qty: number; dueDate: Date }[] = []
      let moCreated = 0
      let reqCreated = 0

      for (const demand of demandData) {
        const bom = await prisma.mfgBomTemplate.findFirst({
          where: { tenantId, finishedProductId: demand.productId, deletedAt: null, isDefault: true },
        })
        const type = bom ? 'make' : 'buy'
        recommendations.push({ productId: demand.productId, type, qty: demand.demandQty, dueDate: demand.dueDate })
      }

      if (recommendations.length > 0) {
        await prisma.mfgMrpRecommendation.createMany({
          data: recommendations.map(r => ({ tenantId, mrpRunId: run.id, ...r })),
        })
      }

      await prisma.mfgMrpRun.update({
        where: { id: run.id },
        data: {
          status: 'completed', completedAt: new Date(),
          demandCount: demandData.length,
          moCreated, reqCreated,
        },
      })

      await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'MRP_RUN', module: 'manufacturing', entityType: 'MfgMrpRun', entityId: run.id, newValues: { number, demandCount: demandData.length, recommendationCount: recommendations.length } } })
    } catch (err) {
      await prisma.mfgMrpRun.update({ where: { id: run.id }, data: { status: 'failed' } })
      throw err
    }

    const result = await prisma.mfgMrpRun.findUnique({
      where: { id: run.id },
      include: { demands: true, recommendations: true },
    })
    return reply.code(201).send({ success: true, data: result })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const run = await prisma.mfgMrpRun.findFirst({
      where: { id, tenantId },
      include: { demands: true, recommendations: true },
    })
    if (!run) return reply.code(404).send({ success: false, error: 'MRP run not found' })
    return reply.send({ success: true, data: run })
  })

  // Accept recommendation → convert to MO or procurement requisition
  app.post('/:runId/recommendations/:recId/convert', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { recId } = req.params as any
    const rec = await prisma.mfgMrpRecommendation.findFirst({ where: { id: recId, tenantId } })
    if (!rec || rec.status !== 'pending') return reply.code(400).send({ success: false, error: 'Recommendation not available for conversion' })

    let convertedId: string

    if (rec.type === 'make') {
      const bom = await prisma.mfgBomTemplate.findFirst({ where: { tenantId, finishedProductId: rec.productId, isDefault: true } })
      const count = await prisma.mfgOrder.count({ where: { tenantId } })
      const number = `MO-${String(count + 1).padStart(5, '0')}`
      const mo = await prisma.mfgOrder.create({
        data: {
          tenantId, number, finishedProductId: rec.productId,
          bomId: bom?.id, plannedQty: rec.qty,
          scheduledEnd: rec.dueDate,
          origin: 'mrp', originId: rec.mrpRunId,
          createdBy: userId, updatedBy: userId,
        },
      })
      convertedId = mo.id
      await prisma.mfgMrpRun.update({ where: { id: rec.mrpRunId }, data: { moCreated: { increment: 1 } } })
    } else {
      const reqCount = await prisma.procRequisition.count({ where: { tenantId } })
      const number = `REQ-${String(reqCount + 1).padStart(5, '0')}`
      const requisition = await prisma.procRequisition.create({
        data: {
          tenantId, number, title: `MRP - Auto Requisition`,
          requestedById: userId, priority: 'normal',
          requiredDate: rec.dueDate,
          reason: `MRP Run auto-generated demand`,
          createdBy: userId, updatedBy: userId,
          lines: {
            create: [{
              tenantId, productId: rec.productId,
              description: 'MRP auto-requisition', quantity: rec.qty, currency: 'USD',
            }],
          },
        },
      })
      convertedId = requisition.id
      await prisma.mfgMrpRun.update({ where: { id: rec.mrpRunId }, data: { reqCreated: { increment: 1 } } })
    }

    await prisma.mfgMrpRecommendation.update({
      where: { id: recId },
      data: { status: 'converted', convertedId },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'MRP_CONVERT', module: 'manufacturing', entityType: 'MfgMrpRecommendation', entityId: recId, newValues: { type: rec.type, convertedId } } })
    return reply.send({ success: true, data: { type: rec.type, convertedId } })
  })
}
