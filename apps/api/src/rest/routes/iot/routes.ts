import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function iotRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [totalDevices, onlineDevices, activeAlerts] = await Promise.all([
      prisma.iotDevice.count({ where: { tenantId } }),
      prisma.iotDevice.count({ where: { tenantId, status: 'online' } }),
      prisma.iotAlert.count({ where: { device: { tenantId }, isResolved: false } }),
    ])
    return { success: true, data: { totalDevices, onlineDevices, offlineDevices: totalDevices - onlineDevices, activeAlerts } }
  })

  app.get('/devices', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.status) where.status = q.status
    if (q.type) where.type = q.type
    const devices = await prisma.iotDevice.findMany({
      where: where as never,
      include: { _count: { select: { alerts: true, telemetry: true } } },
      orderBy: { lastSeenAt: 'desc' },
      take: 100,
    })
    return { success: true, data: devices }
  })

  app.post('/devices', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const device = await prisma.iotDevice.create({ data: { tenantId, ...data } as never })
    return { success: true, data: device }
  })

  app.get('/devices/:id/telemetry', async (req) => {
    const { id } = req.params as { id: string }
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { deviceId: id }
    if (q.metric) where.metric = q.metric
    const telemetry = await prisma.iotTelemetry.findMany({
      where: where as never,
      orderBy: { recordedAt: 'desc' },
      take: 200,
    })
    return { success: true, data: telemetry }
  })

  app.post('/devices/:id/telemetry', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const record = await prisma.iotTelemetry.create({ data: { deviceId: id, ...data } as never })
    await prisma.iotDevice.update({ where: { id }, data: { lastSeenAt: new Date() } })
    return { success: true, data: record }
  })

  app.get('/alerts', async (req) => {
    const { tenantId } = req
    const alerts = await prisma.iotAlert.findMany({
      where: { device: { tenantId }, isResolved: false },
      include: { device: { select: { name: true, type: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return { success: true, data: alerts }
  })

  app.patch('/alerts/:id/resolve', async (req) => {
    const { id } = req.params as { id: string }
    const alert = await prisma.iotAlert.update({ where: { id }, data: { isResolved: true, resolvedAt: new Date() } })
    return { success: true, data: alert }
  })
}
