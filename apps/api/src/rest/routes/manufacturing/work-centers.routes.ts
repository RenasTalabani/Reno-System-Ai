import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function mfgWorkCenterRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { page = '1', limit = '50', type } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)
    const where: any = { tenantId, deletedAt: null }
    if (type) where.type = type
    const [total, items] = await Promise.all([
      prisma.mfgWorkCenter.count({ where }),
      prisma.mfgWorkCenter.findMany({
        where, skip, take: Number(limit),
        include: { _count: { select: { orderOps: true, maintenanceLogs: true } } },
        orderBy: { name: 'asc' },
      }),
    ])
    return reply.send({ success: true, data: items, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const item = await prisma.mfgWorkCenter.create({
      data: {
        tenantId, code: body.code, name: body.name,
        type: body.type ?? 'machine',
        capacity: body.capacity ?? 1,
        capacityUnit: body.capacityUnit ?? 'hour',
        costPerHour: body.costPerHour, currency: body.currency ?? 'USD',
        oeeTarget: body.oeeTarget, mtbfHours: body.mtbfHours, mttrHours: body.mttrHours,
        maintenanceIntervalDays: body.maintenanceIntervalDays,
        digitalTwinId: body.digitalTwinId, digitalTwinUrl: body.digitalTwinUrl,
        mesDeviceId: body.mesDeviceId, mesProtocol: body.mesProtocol,
        simulationCapacity: body.simulationCapacity, simulationSetupTime: body.simulationSetupTime,
        warehouseId: body.warehouseId, notes: body.notes,
        createdBy: userId, updatedBy: userId,
      },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'manufacturing', entityType: 'MfgWorkCenter', entityId: item.id, newValues: { code: body.code, name: body.name } } })
    return reply.code(201).send({ success: true, data: item })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const item = await prisma.mfgWorkCenter.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        maintenanceLogs: { where: { deletedAt: null }, orderBy: { scheduledAt: 'desc' }, take: 10 },
        _count: { select: { orderOps: true, maintenanceLogs: true } },
      },
    })
    if (!item) return reply.code(404).send({ success: false, error: 'Work center not found' })
    return reply.send({ success: true, data: item })
  })

  app.patch('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any
    const allowed = ['name', 'type', 'capacity', 'capacityUnit', 'costPerHour', 'currency', 'oeeTarget', 'oeeActual',
      'mtbfHours', 'mttrHours', 'lastMaintenanceAt', 'nextMaintenanceAt', 'maintenanceIntervalDays',
      'digitalTwinId', 'digitalTwinUrl', 'mesDeviceId', 'mesProtocol',
      'aiEfficiencyScore', 'aiDowntimeRisk', 'aiMaintenancePriority', 'aiInsights',
      'simulationCapacity', 'simulationSetupTime', 'notes', 'isActive']
    const data: any = { updatedBy: userId }
    allowed.forEach(k => { if (k in body) data[k] = body[k] })
    if (data.lastMaintenanceAt) data.lastMaintenanceAt = new Date(data.lastMaintenanceAt)
    if (data.nextMaintenanceAt) data.nextMaintenanceAt = new Date(data.nextMaintenanceAt)
    const item = await prisma.mfgWorkCenter.update({ where: { id }, data })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE', module: 'manufacturing', entityType: 'MfgWorkCenter', entityId: id, newValues: data } })
    return reply.send({ success: true, data: item })
  })

  // Maintenance logs
  app.post('/:id/maintenance', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any
    const log = await prisma.mfgMaintenanceLog.create({
      data: {
        tenantId, workCenterId: id,
        type: body.type ?? 'preventive',
        scheduledAt: new Date(body.scheduledAt),
        startedAt: body.startedAt ? new Date(body.startedAt) : undefined,
        completedAt: body.completedAt ? new Date(body.completedAt) : undefined,
        downtimeHours: body.downtimeHours,
        technician: body.technician,
        description: body.description, rootCause: body.rootCause, resolution: body.resolution,
        cost: body.cost, currency: body.currency ?? 'USD',
        createdBy: userId, updatedBy: userId,
      },
    })
    // Recalculate MTBF/MTTR from completed logs
    if (body.completedAt && body.type !== 'preventive') {
      const corrective = await prisma.mfgMaintenanceLog.findMany({
        where: { tenantId, workCenterId: id, type: { in: ['corrective', 'emergency'] }, status: 'completed', deletedAt: null },
        orderBy: { completedAt: 'asc' },
      })
      if (corrective.length >= 2) {
        const totalDowntime = corrective.reduce((s, l) => s + Number(l.downtimeHours ?? 0), 0)
        const avgMttr = totalDowntime / corrective.length
        await prisma.mfgWorkCenter.update({
          where: { id },
          data: { mttrHours: avgMttr, lastMaintenanceAt: new Date(), updatedBy: userId },
        })
      }
    }
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'MAINTENANCE_LOG', module: 'manufacturing', entityType: 'MfgWorkCenter', entityId: id, newValues: { type: body.type, scheduledAt: body.scheduledAt } } })
    return reply.code(201).send({ success: true, data: log })
  })

  app.patch('/:id/maintenance/:logId', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { logId } = req.params as any
    const body = req.body as any
    const allowed = ['status', 'startedAt', 'completedAt', 'downtimeHours', 'rootCause', 'resolution', 'cost']
    const data: any = { updatedBy: userId }
    allowed.forEach(k => { if (k in body) data[k] = body[k] })
    if (data.startedAt) data.startedAt = new Date(data.startedAt)
    if (data.completedAt) data.completedAt = new Date(data.completedAt)
    const log = await prisma.mfgMaintenanceLog.update({ where: { id: logId }, data })
    return reply.send({ success: true, data: log })
  })

  // Routings
  app.get('/routings', async (req, reply) => {
    const { tenantId } = req as any
    const items = await prisma.mfgRouting.findMany({
      where: { tenantId, deletedAt: null },
      include: { operations: { include: { workCenter: { select: { name: true, code: true } } }, orderBy: { sequence: 'asc' } }, _count: { select: { boms: true } } },
      orderBy: { name: 'asc' },
    })
    return reply.send({ success: true, data: items })
  })

  app.post('/routings', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const routing = await prisma.mfgRouting.create({
      data: {
        tenantId, code: body.code, name: body.name, notes: body.notes,
        createdBy: userId, updatedBy: userId,
        operations: {
          create: (body.operations ?? []).map((op: any, i: number) => ({
            tenantId, workCenterId: op.workCenterId,
            sequence: op.sequence ?? i, name: op.name,
            durationHours: op.durationHours, setupHours: op.setupHours ?? 0,
            description: op.description,
          })),
        },
      },
      include: { operations: true },
    })
    return reply.code(201).send({ success: true, data: routing })
  })
}
