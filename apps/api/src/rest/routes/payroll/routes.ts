import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function payrollRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/pay-runs', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const runs = await prisma.payrollPayRun.findMany({
      where: { tenantId, ...(q.status ? { status: q.status } : {}) },
      include: { _count: { select: { payslips: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: runs }
  })

  app.post('/pay-runs', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const run = await prisma.payrollPayRun.create({ data: { tenantId, ...data } as never })
    return { success: true, data: run }
  })

  app.get('/pay-runs/:id', async (req) => {
    const { tenantId } = req
    const { id } = req.params as { id: string }
    const run = await prisma.payrollPayRun.findFirst({
      where: { id, tenantId },
      include: { payslips: true },
    })
    return { success: true, data: run }
  })

  app.patch('/pay-runs/:id/process', async (req) => {
    const { tenantId } = req
    const { id } = req.params as { id: string }
    const run = await prisma.payrollPayRun.update({
      where: { id },
      data: { status: 'processed', processedAt: new Date() },
    })
    return { success: true, data: run }
  })

  app.get('/payslips', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const payslips = await prisma.payrollPayslip.findMany({
      where: { tenantId, ...(q.payRunId ? { payRunId: q.payRunId } : {}) },
      include: { payRun: { select: { name: true, period: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return { success: true, data: payslips }
  })

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [totalRuns, processedRuns, totalPayslips, payroll] = await Promise.all([
      prisma.payrollPayRun.count({ where: { tenantId } }),
      prisma.payrollPayRun.count({ where: { tenantId, status: 'processed' } }),
      prisma.payrollPayslip.count({ where: { tenantId } }),
      prisma.payrollPayRun.aggregate({ where: { tenantId, status: 'processed' }, _sum: { totalNet: true } }),
    ])
    return { success: true, data: { totalRuns, processedRuns, totalPayslips, totalNetPaid: payroll._sum.totalNet ?? 0 } }
  })
}
