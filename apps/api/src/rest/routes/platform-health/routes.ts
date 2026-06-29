import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function platformHealthRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [slos, openIncidents, recentChecks] = await Promise.all([
      prisma.phltSlo.findMany({ where: { tenantId } }),
      prisma.phltIncident.count({ where: { tenantId, status: 'open' } }),
      prisma.phltCheck.findMany({ where: { tenantId }, orderBy: { checkedAt: 'desc' }, take: 20 }),
    ])
    const meetingSlos = slos.filter(s => s.status === 'meeting').length
    const uniqueServices = [...new Set(recentChecks.map(c => c.service))]
    const healthyServices = uniqueServices.filter(svc => {
      const latest = recentChecks.find(c => c.service === svc)
      return latest?.status === 'healthy'
    }).length
    return { success: true, data: { totalSlos: slos.length, meetingSlos, openIncidents, totalServices: uniqueServices.length, healthyServices } }
  })

  app.get('/checks', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.service) where.service = q.service
    if (q.status) where.status = q.status
    const checks = await prisma.phltCheck.findMany({
      where: where as never,
      orderBy: { checkedAt: 'desc' },
      take: 200,
    })
    return { success: true, data: checks }
  })

  app.post('/checks', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const check = await prisma.phltCheck.create({ data: { tenantId, ...data } as never })
    return { success: true, data: check }
  })

  app.get('/slos', async (req) => {
    const { tenantId } = req
    const slos = await prisma.phltSlo.findMany({
      where: { tenantId },
      include: { _count: { select: { incidents: true } } },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: slos }
  })

  app.post('/slos', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const slo = await prisma.phltSlo.create({ data: { tenantId, ...data } as never })
    return { success: true, data: slo }
  })

  app.get('/incidents', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.status) where.status = q.status
    if (q.severity) where.severity = q.severity
    const incidents = await prisma.phltIncident.findMany({
      where: where as never,
      include: { slo: { select: { name: true } } },
      orderBy: { detectedAt: 'desc' },
      take: 50,
    })
    return { success: true, data: incidents }
  })

  app.post('/incidents', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const incident = await prisma.phltIncident.create({ data: { tenantId, ...data } as never })
    return { success: true, data: incident }
  })

  app.patch('/incidents/:id/resolve', async (req) => {
    const { id } = req.params as { id: string }
    const { summary } = req.body as { summary?: string }
    const incident = await prisma.phltIncident.update({ where: { id }, data: { status: 'resolved', resolvedAt: new Date(), summary } })
    return { success: true, data: incident }
  })
}