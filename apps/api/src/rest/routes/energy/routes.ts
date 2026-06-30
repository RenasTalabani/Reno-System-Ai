import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function energyRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [totalMeters, activeMeters, openAlerts] = await Promise.all([
      prisma.engyMeter.count({ where: { tenantId } }),
      prisma.engyMeter.count({ where: { tenantId, isActive: true } }),
      prisma.engyAlert.count({ where: { meter: { tenantId }, status: 'open' } }),
    ])
    return { success: true, data: { totalMeters, activeMeters, openAlerts } }
  })

  app.get('/meters', async (req) => {
    const { tenantId } = req
    const meters = await prisma.engyMeter.findMany({
      where: { tenantId },
      include: { _count: { select: { readings: true, alerts: true } } },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: meters }
  })

  app.post('/meters', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const meter = await prisma.engyMeter.create({ data: { tenantId, ...data } as never })
    return { success: true, data: meter }
  })

  app.post('/meters/:id/readings', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const reading = await prisma.engyReading.create({ data: { meterId: id, ...data } as never })
    return { success: true, data: reading }
  })

  app.get('/meters/:id/readings', async (req) => {
    const { id } = req.params as { id: string }
    const q = req.query as Record<string, string>
    const readings = await prisma.engyReading.findMany({
      where: { meterId: id },
      orderBy: { recordedAt: 'desc' },
      take: Number(q.limit ?? 100),
    })
    return { success: true, data: readings }
  })

  app.get('/alerts', async (req) => {
    const { tenantId } = req
    const alerts = await prisma.engyAlert.findMany({
      where: { meter: { tenantId }, status: 'open' },
      include: { meter: { select: { name: true, unit: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: alerts }
  })

  app.patch('/alerts/:id/resolve', async (req) => {
    const { id } = req.params as { id: string }
    const alert = await prisma.engyAlert.update({ where: { id }, data: { status: 'resolved', resolvedAt: new Date() } })
    return { success: true, data: alert }
  })
}
