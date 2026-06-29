import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function biDashboardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [totalDashboards, totalWidgets, totalReports, kpiSnapshots] = await Promise.all([
      prisma.biDashboard.count({ where: { tenantId, isActive: true, deletedAt: null } }),
      prisma.biWidget.count({ where: { tenantId, isActive: true } }),
      prisma.biReport.count({ where: { tenantId, isActive: true, deletedAt: null } }),
      prisma.biKpiSnapshot.count({ where: { tenantId } }),
    ])
    return { success: true, data: { totalDashboards, totalWidgets, totalReports, kpiSnapshots } }
  })

  app.get('/dashboards', async (req) => {
    const { tenantId } = req
    const dashboards = await prisma.biDashboard.findMany({
      where: { tenantId, isActive: true, deletedAt: null },
      include: { _count: { select: { widgets: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: dashboards }
  })

  app.post('/dashboards', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const dash = await prisma.biDashboard.create({ data: { tenantId, createdBy: userId, ...data } as never })
    return { success: true, data: dash }
  })

  app.get('/dashboards/:id', async (req) => {
    const { id } = req.params as { id: string }
    const dash = await prisma.biDashboard.findUnique({
      where: { id },
      include: { widgets: { where: { isActive: true }, orderBy: [{ positionY: 'asc' }, { positionX: 'asc' }] } },
    })
    return { success: true, data: dash }
  })

  app.post('/dashboards/:id/widgets', async (req) => {
    const { tenantId } = req
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const widget = await prisma.biWidget.create({ data: { tenantId, dashboardId: id, ...data } as never })
    return { success: true, data: widget }
  })

  app.patch('/widgets/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const widget = await prisma.biWidget.update({ where: { id }, data: data as never })
    return { success: true, data: widget }
  })

  app.delete('/widgets/:id', async (req) => {
    const { id } = req.params as { id: string }
    await prisma.biWidget.update({ where: { id }, data: { isActive: false } })
    return { success: true }
  })

  app.get('/reports', async (req) => {
    const { tenantId } = req
    const reports = await prisma.biReport.findMany({
      where: { tenantId, isActive: true, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: reports }
  })

  app.get('/kpis', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.module) where.module = q.module
    if (q.kpiKey) where.kpiKey = q.kpiKey
    const kpis = await prisma.biKpiSnapshot.findMany({
      where: where as never,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return { success: true, data: kpis }
  })

  app.post('/kpis', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const kpi = await prisma.biKpiSnapshot.create({ data: { tenantId, ...data } as never })
    return { success: true, data: kpi }
  })

  app.get('/insights', async (req) => {
    const { tenantId } = req
    const insights = await prisma.biAiInsight.findMany({
      where: { tenantId, isDismissed: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return { success: true, data: insights }
  })
}