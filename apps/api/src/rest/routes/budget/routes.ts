import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function budgetRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/periods', async (req) => {
    const { tenantId } = req
    const periods = await prisma.budgetPeriod.findMany({
      where: { tenantId },
      include: { _count: { select: { lines: true } } },
      orderBy: { fiscalYear: 'desc' },
    })
    return { success: true, data: periods }
  })

  app.post('/periods', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const period = await prisma.budgetPeriod.create({ data: { tenantId, ...data } as never })
    return { success: true, data: period }
  })

  app.get('/periods/:id/lines', async (req) => {
    const { tenantId } = req
    const { id } = req.params as { id: string }
    const lines = await prisma.budgetLine.findMany({
      where: { tenantId, periodId: id },
      orderBy: { category: 'asc' },
    })
    return { success: true, data: lines }
  })

  app.post('/periods/:id/lines', async (req) => {
    const { tenantId } = req
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const line = await prisma.budgetLine.create({ data: { tenantId, periodId: id, ...data } as never })
    return { success: true, data: line }
  })

  app.patch('/lines/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const line = await prisma.budgetLine.update({ where: { id }, data: data as never })
    return { success: true, data: line }
  })

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [periods, activePeriod] = await Promise.all([
      prisma.budgetPeriod.count({ where: { tenantId } }),
      prisma.budgetPeriod.findFirst({ where: { tenantId, status: 'active' }, include: { _count: { select: { lines: true } } } }),
    ])
    const variance = activePeriod
      ? await prisma.budgetLine.aggregate({ where: { tenantId, periodId: activePeriod.id }, _sum: { budgeted: true, actual: true } })
      : null
    return {
      success: true,
      data: {
        totalPeriods: periods,
        activePeriod: activePeriod?.name ?? null,
        budgeted: variance?._sum.budgeted ?? 0,
        actual: variance?._sum.actual ?? 0,
      },
    }
  })
}
