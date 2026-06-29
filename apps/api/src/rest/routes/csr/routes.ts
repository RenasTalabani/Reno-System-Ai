import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function csrRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [totalPrograms, activePrograms, totalBudget] = await Promise.all([
      prisma.csrProgram.count({ where: { tenantId } }),
      prisma.csrProgram.count({ where: { tenantId, status: 'active' } }),
      prisma.csrProgram.aggregate({ where: { tenantId, status: 'active' }, _sum: { budget: true } }),
    ])
    return { success: true, data: { totalPrograms, activePrograms, totalBudget: totalBudget._sum.budget ?? 0 } }
  })

  app.get('/programs', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.status) where.status = q.status
    if (q.category) where.category = q.category
    const programs = await prisma.csrProgram.findMany({
      where: where as never,
      include: { _count: { select: { metrics: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: programs }
  })

  app.post('/programs', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const program = await prisma.csrProgram.create({ data: { tenantId, ownerId: userId, ...data } as never })
    return { success: true, data: program }
  })

  app.get('/programs/:id', async (req) => {
    const { id } = req.params as { id: string }
    const program = await prisma.csrProgram.findUnique({ where: { id }, include: { metrics: { orderBy: { recordedAt: 'desc' } } } })
    return { success: true, data: program }
  })

  app.patch('/programs/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const program = await prisma.csrProgram.update({ where: { id }, data: data as never })
    return { success: true, data: program }
  })

  app.post('/programs/:id/metrics', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const metric = await prisma.csrMetric.create({ data: { programId: id, ...data } as never })
    return { success: true, data: metric }
  })
}
