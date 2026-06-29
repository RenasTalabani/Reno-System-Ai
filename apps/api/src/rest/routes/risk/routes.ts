import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function riskRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/items', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const items = await prisma.riskItem.findMany({
      where: {
        tenantId,
        ...(q.status ? { status: q.status } : {}),
        ...(q.category ? { category: q.category } : {}),
      },
      include: { _count: { select: { assessments: true } } },
      orderBy: { score: 'desc' },
    })
    return { success: true, data: items }
  })

  app.post('/items', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown> & { likelihood?: number; impact?: number }
    const likelihood = (data.likelihood as number) ?? 3
    const impact = (data.impact as number) ?? 3
    const risk = await prisma.riskItem.create({
      data: { tenantId, ...data, score: likelihood * impact } as never,
    })
    return { success: true, data: risk }
  })

  app.patch('/items/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown> & { likelihood?: number; impact?: number }
    const updateData: Record<string, unknown> = { ...data }
    if (data.likelihood !== undefined && data.impact !== undefined) {
      updateData.score = (data.likelihood as number) * (data.impact as number)
    }
    const risk = await prisma.riskItem.update({ where: { id }, data: updateData as never })
    return { success: true, data: risk }
  })

  app.post('/items/:id/assessments', async (req) => {
    const { userId } = req
    const { id } = req.params as { id: string }
    const data = req.body as { likelihood: number; impact: number; notes?: string }
    const assessment = await prisma.riskAssessment.create({
      data: { riskId: id, assessedBy: userId, ...data, score: data.likelihood * data.impact },
    })
    return { success: true, data: assessment }
  })

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [total, open, critical, highScore] = await Promise.all([
      prisma.riskItem.count({ where: { tenantId } }),
      prisma.riskItem.count({ where: { tenantId, status: 'open' } }),
      prisma.riskItem.count({ where: { tenantId, score: { gte: 15 } } }),
      prisma.riskItem.findFirst({ where: { tenantId }, orderBy: { score: 'desc' }, select: { score: true } }),
    ])
    return { success: true, data: { totalRisks: total, openRisks: open, criticalRisks: critical, maxScore: highScore?.score ?? 0 } }
  })
}
