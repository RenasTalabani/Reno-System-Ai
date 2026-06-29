import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function surveysRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [total, active, totalResponses] = await Promise.all([
      prisma.surSurvey.count({ where: { tenantId } }),
      prisma.surSurvey.count({ where: { tenantId, status: 'active' } }),
      prisma.surResponse.count({ where: { survey: { tenantId } } }),
    ])
    return { success: true, data: { totalSurveys: total, activeSurveys: active, totalResponses } }
  })

  app.get('/', async (req) => {
    const { tenantId } = req
    const surveys = await prisma.surSurvey.findMany({
      where: { tenantId },
      include: { _count: { select: { questions: true, responses: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: surveys }
  })

  app.post('/', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const survey = await prisma.surSurvey.create({ data: { tenantId, createdBy: userId, ...data } as never })
    return { success: true, data: survey }
  })

  app.get('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const survey = await prisma.surSurvey.findUnique({
      where: { id },
      include: { questions: { orderBy: { order: 'asc' } }, _count: { select: { responses: true } } },
    })
    return { success: true, data: survey }
  })

  app.post('/:id/questions', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const q = await prisma.surQuestion.create({ data: { surveyId: id, ...data } as never })
    return { success: true, data: q }
  })

  app.post('/:id/responses', async (req) => {
    const { userId } = req
    const { id } = req.params as { id: string }
    const { answers } = req.body as { answers: Array<{ questionId: string; value: unknown }> }
    const response = await prisma.surResponse.create({
      data: {
        surveyId: id,
        respondentId: userId,
        completedAt: new Date(),
        answers: { create: answers.map(a => ({ questionId: a.questionId, value: a.value as never })) },
      },
      include: { answers: true },
    })
    return { success: true, data: response }
  })

  app.get('/:id/responses', async (req) => {
    const { id } = req.params as { id: string }
    const responses = await prisma.surResponse.findMany({
      where: { surveyId: id },
      include: { answers: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return { success: true, data: responses }
  })
}