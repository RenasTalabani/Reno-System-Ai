import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function mfgBomRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { page = '1', limit = '50', productId, search } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)
    const where: any = { tenantId, deletedAt: null }
    if (productId) where.finishedProductId = productId
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { code: { contains: search, mode: 'insensitive' } }]
    const [total, items] = await Promise.all([
      prisma.mfgBomTemplate.count({ where }),
      prisma.mfgBomTemplate.findMany({
        where, skip, take: Number(limit),
        include: {
          finishedProduct: { select: { name: true, code: true } },
          routing: { select: { name: true } },
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
    const bom = await prisma.mfgBomTemplate.create({
      data: {
        tenantId, code: body.code, name: body.name,
        finishedProductId: body.finishedProductId,
        version: body.version ?? '1.0',
        type: body.type ?? 'production',
        quantity: body.quantity ?? 1,
        unitId: body.unitId, routingId: body.routingId,
        isDefault: body.isDefault ?? false,
        notes: body.notes,
        createdBy: userId, updatedBy: userId,
        lines: {
          create: (body.lines ?? []).map((l: any, i: number) => ({
            tenantId, componentId: l.componentId,
            sequence: l.sequence ?? i,
            quantity: l.quantity, scrapPercent: l.scrapPercent ?? 0,
            unitId: l.unitId, type: l.type ?? 'component',
            parentLineId: l.parentLineId, notes: l.notes,
          })),
        },
      },
      include: { lines: { include: { component: { select: { name: true, code: true } } } } },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'manufacturing', entityType: 'MfgBomTemplate', entityId: bom.id, newValues: { code: body.code, name: body.name } } })
    return reply.code(201).send({ success: true, data: bom })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const item = await prisma.mfgBomTemplate.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        finishedProduct: { select: { name: true, code: true, costPrice: true } },
        routing: { include: { operations: { include: { workCenter: { select: { name: true, costPerHour: true } } }, orderBy: { sequence: 'asc' } } } },
        lines: {
          include: {
            component: { select: { name: true, code: true, costPrice: true } },
            children: { include: { component: { select: { name: true, code: true } } } },
          },
          where: { parentLineId: null },
          orderBy: { sequence: 'asc' },
        },
      },
    })
    if (!item) return reply.code(404).send({ success: false, error: 'BOM not found' })
    return reply.send({ success: true, data: item })
  })

  app.patch('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any
    const allowed = ['name', 'type', 'quantity', 'unitId', 'routingId', 'isDefault', 'notes', 'aiYieldRate', 'aiCycleTime', 'aiCostEstimate']
    const data: any = { updatedBy: userId }
    allowed.forEach(k => { if (k in body) data[k] = body[k] })
    const item = await prisma.mfgBomTemplate.update({ where: { id }, data })
    return reply.send({ success: true, data: item })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const inUse = await prisma.mfgOrder.count({ where: { tenantId, bomId: id, status: { in: ['released', 'in_progress'] } } })
    if (inUse > 0) return reply.code(400).send({ success: false, error: 'BOM is used in active manufacturing orders' })
    await prisma.mfgBomTemplate.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedBy: userId } })
    return reply.send({ success: true })
  })

  // BOM multi-level explosion endpoint
  app.get('/:id/explode', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const { qty = '1' } = req.query as any

    const bom = await prisma.mfgBomTemplate.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { lines: { include: { component: { select: { name: true, code: true, costPrice: true, standardCost: true } }, children: { include: { component: { select: { name: true, code: true, costPrice: true, standardCost: true } } } } }, orderBy: { sequence: 'asc' } } },
    })
    if (!bom) return reply.code(404).send({ success: false, error: 'BOM not found' })

    const multiplier = Number(qty) / Number(bom.quantity)

    const explodeLines = (lines: typeof bom.lines, level = 0): any[] =>
      lines.map(l => ({
        level, sequence: l.sequence,
        componentId: l.componentId,
        componentCode: l.component.code,
        componentName: l.component.name,
        plannedQty: Number(l.quantity) * multiplier * (1 + Number(l.scrapPercent) / 100),
        scrapPercent: Number(l.scrapPercent),
        unitCost: Number(l.component.costPrice ?? l.component.standardCost ?? 0),
        lineCost: Number(l.quantity) * multiplier * Number(l.component.costPrice ?? l.component.standardCost ?? 0),
        type: l.type,
        children: l.children.length > 0 ? explodeLines(l.children as any, level + 1) : [],
      }))

    const exploded = explodeLines(bom.lines.filter(l => !l.parentLineId))
    const totalCost = exploded.reduce((s, l) => s + l.lineCost, 0)

    return reply.send({ success: true, data: { bom: { id: bom.id, code: bom.code, name: bom.name }, qty: Number(qty), totalCost, lines: exploded } })
  })
}
