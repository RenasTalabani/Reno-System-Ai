import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

function bookValue(purchasePrice: number, purchaseDate: Date, depreciationYrs: number): number {
  const ageYears = (Date.now() - purchaseDate.getTime()) / (365.25 * 24 * 3600 * 1000)
  const depreciationRate = 1 / depreciationYrs
  const remaining = Math.max(0, 1 - ageYears * depreciationRate)
  return Math.round(purchasePrice * remaining * 100) / 100
}

export async function assetRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Assets ─────────────────────────────────────────────────────────────────

  app.get('/', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const where: any = { tenantId }
    if (q.status) where.status = q.status
    if (q.category) where.category = q.category
    if (q.assignedTo) where.assignedTo = q.assignedTo
    if (q.search) where.OR = [{ name: { contains: q.search, mode: 'insensitive' } }, { assetTag: { contains: q.search, mode: 'insensitive' } }, { serialNumber: { contains: q.search, mode: 'insensitive' } }]
    const assets = await prisma.astAsset.findMany({ where, orderBy: { createdAt: 'desc' }, include: { _count: { select: { maintenance: true } } } })
    return reply.send(buildSuccessResponse(assets))
  })

  app.get('/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const asset = await prisma.astAsset.findFirst({ where: { id, tenantId }, include: { maintenance: { orderBy: { scheduledAt: 'desc' }, take: 10 }, assignments: { orderBy: { assignedAt: 'desc' }, take: 5 } } })
    if (!asset) throw new RenoError(ErrorCode.NOT_FOUND, 'Asset not found', 404)
    const bv = asset.purchasePrice && asset.purchaseDate ? bookValue(Number(asset.purchasePrice), asset.purchaseDate, asset.depreciationYrs) : null
    return reply.send(buildSuccessResponse({ ...asset, bookValue: bv }))
  })

  app.post('/', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any
    const asset = await prisma.astAsset.create({
      data: { tenantId, createdBy: userId, assetTag: body.assetTag, name: body.name, category: body.category, type: body.type, status: body.status ?? 'active', condition: body.condition ?? 'good', serialNumber: body.serialNumber, manufacturer: body.manufacturer, model: body.model, location: body.location, assignedTo: body.assignedTo, purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined, purchasePrice: body.purchasePrice, warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : undefined, nextService: body.nextService ? new Date(body.nextService) : undefined, depreciationYrs: body.depreciationYrs ?? 5, notes: body.notes, metadata: body.metadata ?? {} },
    })
    return reply.status(201).send(buildSuccessResponse(asset))
  })

  app.put('/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const body = request.body as any
    const updated = await prisma.astAsset.updateMany({ where: { id, tenantId }, data: { ...body, purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined, warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : undefined, nextService: body.nextService ? new Date(body.nextService) : undefined } })
    if (!updated.count) throw new RenoError(ErrorCode.NOT_FOUND, 'Asset not found', 404)
    return reply.send(buildSuccessResponse({ updated: true }))
  })

  // ── Assignments ────────────────────────────────────────────────────────────

  app.post('/:id/assign', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const { assigneeId, notes } = request.body as any
    await prisma.$transaction([
      prisma.astAssignment.create({ data: { tenantId, assetId: id, userId: assigneeId, assignedBy: userId, notes } }),
      prisma.astAsset.updateMany({ where: { id, tenantId }, data: { assignedTo: assigneeId, status: 'assigned' } }),
    ])
    return reply.status(201).send(buildSuccessResponse({ assigned: true }))
  })

  app.post('/:id/return', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const openAssignment = await prisma.astAssignment.findFirst({ where: { assetId: id, returnedAt: null }, orderBy: { assignedAt: 'desc' } })
    if (openAssignment) {
      await prisma.astAssignment.update({ where: { id: openAssignment.id }, data: { returnedAt: new Date() } })
    }
    await prisma.astAsset.updateMany({ where: { id, tenantId }, data: { assignedTo: null, status: 'active' } })
    return reply.send(buildSuccessResponse({ returned: true }))
  })

  // ── Maintenance ────────────────────────────────────────────────────────────

  app.post('/:id/maintenance', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const body = request.body as any
    const record = await prisma.astMaintenance.create({
      data: { tenantId, assetId: id, type: body.type ?? 'routine', description: body.description, cost: body.cost, vendor: body.vendor, scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined, technician: body.technician, notes: body.notes },
    })
    return reply.status(201).send(buildSuccessResponse(record))
  })

  app.patch('/maintenance/:mId/complete', async (request, reply) => {
    const { mId } = request.params as any
    const { notes, cost } = request.body as any
    const record = await prisma.astMaintenance.update({ where: { id: mId }, data: { status: 'completed', completedAt: new Date(), notes, cost } })
    // Update nextService on asset
    await prisma.astAsset.updateMany({ where: { id: record.assetId }, data: { nextService: new Date(Date.now() + 90 * 24 * 3600 * 1000) } })
    return reply.send(buildSuccessResponse(record))
  })

  // ── Dashboard ──────────────────────────────────────────────────────────────

  app.get('/dashboard', async (request, reply) => {
    const { tenantId } = request as any
    const today = new Date()
    const [totalAssets, byStatus, warrantyExpiring, upcomingService] = await Promise.all([
      prisma.astAsset.count({ where: { tenantId } }),
      prisma.astAsset.groupBy({ by: ['status'], where: { tenantId }, _count: { status: true } }),
      prisma.astAsset.count({ where: { tenantId, warrantyExpiry: { gte: today, lte: new Date(today.getTime() + 30 * 24 * 3600 * 1000) } } }),
      prisma.astAsset.count({ where: { tenantId, nextService: { lte: new Date(today.getTime() + 7 * 24 * 3600 * 1000) } } }),
    ])
    return reply.send(buildSuccessResponse({ totalAssets, byStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count.status])), warrantyExpiring, upcomingService }))
  })
}
