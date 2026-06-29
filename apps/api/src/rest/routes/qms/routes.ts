import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function qmsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)
  app.get('/audits', async (req) => {
    const { tenantId } = req
    const audits = await prisma.qmsAudit.findMany({ where: { tenantId }, include: { nonConformances: true }, orderBy: { scheduledAt: 'desc' } })
    return { success: true, data: audits }
  })

  app.post('/audits', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const audit = await prisma.qmsAudit.create({ data: { tenantId, ...data } as never })
    return { success: true, data: audit }
  })

  app.patch('/audits/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const audit = await prisma.qmsAudit.update({ where: { id }, data: data as never })
    return { success: true, data: audit }
  })

  app.get('/non-conformances', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const ncs = await prisma.qmsNonConformance.findMany({
      where: { tenantId, ...(q.status ? { status: q.status } : {}), ...(q.severity ? { severity: q.severity } : {}) },
      orderBy: { createdAt: 'desc' }, take: 100,
    })
    return { success: true, data: ncs }
  })

  app.post('/non-conformances', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const nc = await prisma.qmsNonConformance.create({ data: { tenantId, ...data } as never })
    return { success: true, data: nc }
  })

  app.patch('/non-conformances/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const nc = await prisma.qmsNonConformance.update({ where: { id }, data: { ...data, ...(data.status === 'closed' ? { closedAt: new Date() } : {}) } as never })
    return { success: true, data: nc }
  })

  app.get('/checklists', async (req) => {
    const { tenantId } = req
    const lists = await prisma.qmsChecklist.findMany({ where: { tenantId } })
    return { success: true, data: lists }
  })

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [totalAudits, openNCs, criticalNCs] = await Promise.all([
      prisma.qmsAudit.count({ where: { tenantId } }),
      prisma.qmsNonConformance.count({ where: { tenantId, status: 'open' } }),
      prisma.qmsNonConformance.count({ where: { tenantId, status: 'open', severity: 'critical' } }),
    ])
    return { success: true, data: { totalAudits, openNCs, criticalNCs } }
  })
}


