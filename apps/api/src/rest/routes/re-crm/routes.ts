import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function reCrmRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [totalLeads, activeLeads, scheduledShowings] = await Promise.all([
      prisma.reCrmLead.count({ where: { tenantId } }),
      prisma.reCrmLead.count({ where: { tenantId, status: { in: ['new', 'contacted', 'qualified'] } } }),
      prisma.reCrmShowing.count({ where: { lead: { tenantId }, status: 'scheduled' } }),
    ])
    return { success: true, data: { totalLeads, activeLeads, scheduledShowings } }
  })

  app.get('/leads', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.status) where.status = q.status
    const leads = await prisma.reCrmLead.findMany({
      where: where as never,
      include: { _count: { select: { showings: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: leads }
  })

  app.post('/leads', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const lead = await prisma.reCrmLead.create({ data: { tenantId, assignedTo: userId, ...data } as never })
    return { success: true, data: lead }
  })

  app.patch('/leads/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const lead = await prisma.reCrmLead.update({ where: { id }, data: data as never })
    return { success: true, data: lead }
  })

  app.post('/leads/:id/showings', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const showing = await prisma.reCrmShowing.create({ data: { leadId: id, ...data } as never })
    return { success: true, data: showing }
  })

  app.get('/leads/:id/showings', async (req) => {
    const { id } = req.params as { id: string }
    const showings = await prisma.reCrmShowing.findMany({ where: { leadId: id }, orderBy: { scheduledAt: 'desc' } })
    return { success: true, data: showings }
  })
}
