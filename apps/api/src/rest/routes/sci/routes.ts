import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import { assessSupplierRisk, predictShipmentDelay, forecastDemand, generateInventoryAlerts, computeSupplyChainKpis } from './ai-engine.js'

export async function sciRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Dashboard ─────────────────────────────────────────────────────────────
  app.get('/dashboard', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const [suppliers, shipments, forecasts, alerts] = await Promise.all([
      prisma.sciSupplier.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.sciShipment.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.sciDemandForecast.findMany({ where: { tenantId }, orderBy: { generatedAt: 'desc' }, take: 10 }),
      prisma.sciInventoryAlert.findMany({ where: { tenantId, resolved: false }, orderBy: { createdAt: 'desc' }, take: 10 }),
    ])
    const kpis = computeSupplyChainKpis(suppliers as any[], shipments as any[])
    return { kpis, recentShipments: shipments.slice(0, 5), criticalAlerts: alerts, forecasts: forecasts.slice(0, 5) }
  })

  // ── Suppliers ─────────────────────────────────────────────────────────────
  app.get('/suppliers', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    return prisma.sciSupplier.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } })
  })

  app.post('/suppliers', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as any
    const risk = assessSupplierRisk({ onTimeDelivery: body.onTimeDelivery ?? 95, qualityScore: body.qualityScore ?? 90, leadTimeDays: body.leadTimeDays ?? 7, country: body.country })
    const supplier = await prisma.sciSupplier.create({
      data: { tenantId, name: body.name, country: body.country, category: body.category, leadTimeDays: body.leadTimeDays ?? 7, onTimeDelivery: body.onTimeDelivery ?? 95, qualityScore: body.qualityScore ?? 90, aiRiskScore: risk.aiRiskScore, aiRiskLevel: risk.aiRiskLevel, aiInsights: risk.insights as never, metadata: (body.metadata ?? {}) as never },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'sci', entityType: 'SciSupplier', entityId: supplier.id, newValues: supplier as never } as never }).catch(() => null)
    return reply.code(201).send(supplier)
  })

  app.get('/suppliers/:id', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    return prisma.sciSupplier.findFirst({ where: { id, tenantId }, include: { shipments: { orderBy: { createdAt: 'desc' }, take: 10 } } })
  })

  app.patch('/suppliers/:id', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = req.body as any
    const existing = await prisma.sciSupplier.findFirst({ where: { id, tenantId } })
    if (!existing) return { error: 'NOT_FOUND' }
    const merged = { onTimeDelivery: body.onTimeDelivery ?? existing.onTimeDelivery, qualityScore: body.qualityScore ?? existing.qualityScore, leadTimeDays: body.leadTimeDays ?? existing.leadTimeDays, country: body.country ?? existing.country }
    const risk = assessSupplierRisk(merged as any)
    const supplier = await prisma.sciSupplier.update({ where: { id }, data: { ...body, aiRiskScore: risk.aiRiskScore, aiRiskLevel: risk.aiRiskLevel, aiInsights: risk.insights as never } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE', module: 'sci', entityType: 'SciSupplier', entityId: id, newValues: body as never } as never }).catch(() => null)
    return supplier
  })

  app.delete('/suppliers/:id', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    await prisma.sciSupplier.deleteMany({ where: { id, tenantId } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'DELETE', module: 'sci', entityType: 'SciSupplier', entityId: id, newValues: {} as never } as never }).catch(() => null)
    return reply.code(204).send()
  })

  app.post('/suppliers/:id/assess', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const supplier = await prisma.sciSupplier.findFirst({ where: { id, tenantId } })
    if (!supplier) return { error: 'NOT_FOUND' }
    const risk = assessSupplierRisk({ onTimeDelivery: supplier.onTimeDelivery, qualityScore: supplier.qualityScore, leadTimeDays: supplier.leadTimeDays, country: supplier.country })
    return prisma.sciSupplier.update({ where: { id }, data: { aiRiskScore: risk.aiRiskScore, aiRiskLevel: risk.aiRiskLevel, aiInsights: risk.insights as never } })
  })

  // ── Shipments ─────────────────────────────────────────────────────────────
  app.get('/shipments', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    return prisma.sciShipment.findMany({ where: { tenantId }, include: { supplier: true }, orderBy: { createdAt: 'desc' } })
  })

  app.post('/shipments', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as any
    const prediction = predictShipmentDelay({ scheduledDate: new Date(body.scheduledDate), carrier: body.carrier, origin: body.origin, destination: body.destination, status: 'pending' })
    const shipment = await prisma.sciShipment.create({
      data: { tenantId, supplierId: body.supplierId, trackingNumber: body.trackingNumber, origin: body.origin, destination: body.destination, carrier: body.carrier, status: body.status ?? 'pending', scheduledDate: new Date(body.scheduledDate), aiDelayRisk: prediction.aiDelayRisk, aiEta: prediction.aiEta, aiInsights: prediction.insights as never, items: (body.items ?? []) as never, metadata: (body.metadata ?? {}) as never },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'sci', entityType: 'SciShipment', entityId: shipment.id, newValues: shipment as never } as never }).catch(() => null)
    return reply.code(201).send(shipment)
  })

  app.patch('/shipments/:id', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = req.body as any
    const existing = await prisma.sciShipment.findFirst({ where: { id, tenantId } })
    if (!existing) return { error: 'NOT_FOUND' }
    const prediction = predictShipmentDelay({ scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : existing.scheduledDate, carrier: body.carrier ?? existing.carrier, origin: body.origin ?? existing.origin, destination: body.destination ?? existing.destination, status: body.status ?? existing.status })
    const shipment = await prisma.sciShipment.update({ where: { id }, data: { ...body, aiDelayRisk: prediction.aiDelayRisk, aiEta: prediction.aiEta, aiInsights: prediction.insights as never } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE', module: 'sci', entityType: 'SciShipment', entityId: id, newValues: body as never } as never }).catch(() => null)
    return shipment
  })

  // ── Demand Forecasts ──────────────────────────────────────────────────────
  app.get('/demand-forecasts', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    return prisma.sciDemandForecast.findMany({ where: { tenantId }, orderBy: { generatedAt: 'desc' } })
  })

  app.post('/demand-forecasts/generate', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as any
    const period = body.period ?? new Date().toISOString().slice(0, 7)
    const skus: Array<{ skuCode: string; skuName: string; historicalAvg?: number }> = body.skus ?? [
      { skuCode: 'SKU-001', skuName: 'Product A', historicalAvg: 150 },
      { skuCode: 'SKU-002', skuName: 'Product B', historicalAvg: 80 },
      { skuCode: 'SKU-003', skuName: 'Product C', historicalAvg: 220 },
    ]
    const results = []
    for (const sku of skus) {
      const fc = forecastDemand({ ...sku, period })
      const record = await prisma.sciDemandForecast.upsert({
        where: { tenantId_skuCode_period: { tenantId, skuCode: sku.skuCode, period } },
        create: { tenantId, skuCode: sku.skuCode, skuName: sku.skuName, period, ...fc },
        update: { skuName: sku.skuName, ...fc, generatedAt: new Date() },
      })
      results.push(record)
    }
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'AI_GENERATE', module: 'sci', entityType: 'SciDemandForecast', entityId: period, newValues: { count: results.length } as never } as never }).catch(() => null)
    return reply.code(201).send(results)
  })

  // ── Inventory Alerts ──────────────────────────────────────────────────────
  app.get('/inventory-alerts', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    return prisma.sciInventoryAlert.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } })
  })

  app.post('/inventory-alerts/generate', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as any
    const skus = body.skus ?? [
      { skuCode: 'SKU-001', skuName: 'Product A', currentQty: 5, reorderPoint: 30, maxQty: 500 },
      { skuCode: 'SKU-002', skuName: 'Product B', currentQty: 0, reorderPoint: 20, maxQty: 300 },
      { skuCode: 'SKU-003', skuName: 'Product C', currentQty: 480, reorderPoint: 50, maxQty: 500 },
    ]
    const alerts = generateInventoryAlerts(skus)
    const created = await Promise.all(
      alerts.map(a => prisma.sciInventoryAlert.create({ data: { tenantId, skuCode: a.skuCode, skuName: a.skuName, alertType: a.alertType, severity: a.severity, currentQty: a.currentQty, threshold: a.threshold, aiSuggestion: a.aiSuggestion } }))
    )
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'AI_GENERATE', module: 'sci', entityType: 'SciInventoryAlert', entityId: 'batch', newValues: { count: created.length } as never } as never }).catch(() => null)
    return reply.code(201).send(created)
  })

  app.patch('/inventory-alerts/:id/resolve', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    return prisma.sciInventoryAlert.updateMany({ where: { id, tenantId }, data: { resolved: true } })
  })
}
