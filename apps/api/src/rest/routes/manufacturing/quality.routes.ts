import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function mfgQualityRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { page = '1', limit = '50', status, orderId, type } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)
    const where: any = { tenantId, deletedAt: null }
    if (status) where.status = status
    if (orderId) where.orderId = orderId
    if (type) where.type = type
    const [total, items] = await Promise.all([
      prisma.mfgQualityCheck.count({ where }),
      prisma.mfgQualityCheck.findMany({
        where, skip, take: Number(limit),
        include: {
          order: { select: { number: true } },
          _count: { select: { lines: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])
    return reply.send({ success: true, data: items, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const count = await prisma.mfgQualityCheck.count({ where: { tenantId } })
    const number = `QC-${String(count + 1).padStart(5, '0')}`
    const check = await prisma.mfgQualityCheck.create({
      data: {
        tenantId, number,
        orderId: body.orderId, productId: body.productId,
        type: body.type ?? 'production',
        inspectedQty: body.inspectedQty, inspectorId: body.inspectorId ?? userId,
        notes: body.notes,
        createdBy: userId, updatedBy: userId,
        lines: {
          create: (body.lines ?? []).map((l: any) => ({
            tenantId, parameter: l.parameter, specification: l.specification,
            minValue: l.minValue, maxValue: l.maxValue,
            actualValue: l.actualValue, unit: l.unit,
            result: l.result, notes: l.notes,
          })),
        },
      },
      include: { lines: true },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'manufacturing', entityType: 'MfgQualityCheck', entityId: check.id, newValues: { number, orderId: body.orderId } } })
    return reply.code(201).send({ success: true, data: check })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const item = await prisma.mfgQualityCheck.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { order: { select: { number: true, finishedProductId: true } }, lines: true },
    })
    if (!item) return reply.code(404).send({ success: false, error: 'Quality check not found' })
    return reply.send({ success: true, data: item })
  })

  app.post('/:id/inspect', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any
    const existing = await prisma.mfgQualityCheck.findFirst({ where: { id, tenantId }, include: { lines: true } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Not found' })

    const passedQty = Number(body.passedQty ?? 0)
    const failedQty = Number(body.failedQty ?? 0)
    const inspectedQty = passedQty + failedQty
    const overallResult = failedQty === 0 ? 'passed' : passedQty === 0 ? 'failed' : 'partial'

    // Update check lines if provided
    if (body.lineResults) {
      for (const lr of body.lineResults) {
        await prisma.mfgQualityCheckLine.update({
          where: { id: lr.id },
          data: { actualValue: lr.actualValue, result: lr.result, notes: lr.notes },
        })
      }
    }

    const updated = await prisma.mfgQualityCheck.update({
      where: { id },
      data: {
        status: overallResult, inspectedQty, passedQty, failedQty,
        inspectedAt: new Date(), inspectorId: userId, notes: body.notes,
        updatedBy: userId,
      },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'INSPECT', module: 'manufacturing', entityType: 'MfgQualityCheck', entityId: id, newValues: { result: overallResult, passedQty, failedQty } } })
    return reply.send({ success: true, data: updated })
  })
}
