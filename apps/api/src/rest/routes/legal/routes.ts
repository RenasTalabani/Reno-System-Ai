import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function legalRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [total, open, closed, billableHours] = await Promise.all([
      prisma.legalCase.count({ where: { tenantId } }),
      prisma.legalCase.count({ where: { tenantId, status: 'open' } }),
      prisma.legalCase.count({ where: { tenantId, status: 'closed' } }),
      prisma.legalTimesheet.aggregate({ where: { case: { tenantId }, isBillable: true }, _sum: { hours: true } }),
    ])
    return { success: true, data: { totalCases: total, openCases: open, closedCases: closed, billableHours: billableHours._sum.hours ?? 0 } }
  })

  app.get('/cases', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.status) where.status = q.status
    if (q.type) where.type = q.type
    const cases = await prisma.legalCase.findMany({
      where: where as never,
      include: { _count: { select: { timesheets: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: cases }
  })

  app.post('/cases', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const count = await prisma.legalCase.count({ where: { tenantId } })
    const caseNumber = 'CASE-' + String(count + 1).padStart(5, '0')
    const lcase = await prisma.legalCase.create({ data: { tenantId, assignedTo: userId, caseNumber, ...data } as never })
    return { success: true, data: lcase }
  })

  app.get('/cases/:id', async (req) => {
    const { id } = req.params as { id: string }
    const lcase = await prisma.legalCase.findUnique({
      where: { id },
      include: { timesheets: { orderBy: { billedAt: 'desc' } } },
    })
    return { success: true, data: lcase }
  })

  app.patch('/cases/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const lcase = await prisma.legalCase.update({ where: { id }, data: data as never })
    return { success: true, data: lcase }
  })

  app.post('/cases/:id/timesheets', async (req) => {
    const { id } = req.params as { id: string }
    const { userId } = req
    const data = req.body as Record<string, unknown>
    const ts = await prisma.legalTimesheet.create({ data: { caseId: id, lawyerId: userId, ...data } as never })
    return { success: true, data: ts }
  })
}
