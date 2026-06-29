import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function expensesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [total, pending, approved, agg] = await Promise.all([
      prisma.expReport.count({ where: { tenantId } }),
      prisma.expReport.count({ where: { tenantId, status: 'submitted' } }),
      prisma.expReport.count({ where: { tenantId, status: 'approved' } }),
      prisma.expReport.aggregate({ where: { tenantId, status: { in: ['submitted', 'approved'] } }, _sum: { totalAmount: true } }),
    ])
    return { success: true, data: { totalReports: total, pendingReports: pending, approvedReports: approved, totalPending: agg._sum.totalAmount ?? 0 } }
  })

  app.get('/', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.employeeId) where.employeeId = q.employeeId
    if (q.status) where.status = q.status
    const reports = await prisma.expReport.findMany({
      where: where as never,
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: reports }
  })

  app.post('/', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const report = await prisma.expReport.create({ data: { tenantId, employeeId: userId, ...data } as never })
    return { success: true, data: report }
  })

  app.get('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const report = await prisma.expReport.findUnique({ where: { id }, include: { items: true } })
    return { success: true, data: report }
  })

  app.post('/:id/items', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const item = await prisma.expItem.create({ data: { reportId: id, ...data } as never })
    const agg = await prisma.expItem.aggregate({ where: { reportId: id }, _sum: { amount: true } })
    await prisma.expReport.update({ where: { id }, data: { totalAmount: agg._sum.amount ?? 0 } })
    return { success: true, data: item }
  })

  app.patch('/:id/submit', async (req) => {
    const { id } = req.params as { id: string }
    const report = await prisma.expReport.update({ where: { id }, data: { status: 'submitted' } })
    return { success: true, data: report }
  })

  app.patch('/:id/approve', async (req) => {
    const { userId } = req
    const { id } = req.params as { id: string }
    const report = await prisma.expReport.update({ where: { id }, data: { status: 'approved', approvedBy: userId, approvedAt: new Date() } })
    return { success: true, data: report }
  })
}