import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function innovationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [total, submitted, approved, inPilot] = await Promise.all([
      prisma.innIdea.count({ where: { tenantId } }),
      prisma.innIdea.count({ where: { tenantId, status: 'submitted' } }),
      prisma.innIdea.count({ where: { tenantId, status: 'approved' } }),
      prisma.innIdea.count({ where: { tenantId, status: 'pilot' } }),
    ])
    return { success: true, data: { totalIdeas: total, submitted, approved, inPilot } }
  })

  app.get('/ideas', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.status) where.status = q.status
    if (q.category) where.category = q.category
    const ideas = await prisma.innIdea.findMany({
      where: where as never,
      include: { _count: { select: { evaluations: true } } },
      orderBy: [{ votes: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    })
    return { success: true, data: ideas }
  })

  app.post('/ideas', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const idea = await prisma.innIdea.create({ data: { tenantId, submittedBy: userId, ...data } as never })
    return { success: true, data: idea }
  })

  app.patch('/ideas/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const idea = await prisma.innIdea.update({ where: { id }, data: data as never })
    return { success: true, data: idea }
  })

  app.post('/ideas/:id/vote', async (req) => {
    const { id } = req.params as { id: string }
    const idea = await prisma.innIdea.update({ where: { id }, data: { votes: { increment: 1 } } })
    return { success: true, data: idea }
  })

  app.post('/ideas/:id/evaluate', async (req) => {
    const { id } = req.params as { id: string }
    const { userId } = req
    const data = req.body as Record<string, unknown>
    const evaluation = await prisma.innEvaluation.create({ data: { ideaId: id, evaluatorId: userId, ...data } as never })
    return { success: true, data: evaluation }
  })
}
