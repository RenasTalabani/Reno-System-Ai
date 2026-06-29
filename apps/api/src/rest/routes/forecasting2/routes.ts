import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function forecasting2Routes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [models, predictions, anomalies] = await Promise.all([
      prisma.fcstModel.count({ where: { tenantId } }),
      prisma.fcstPrediction.count({ where: { tenantId } }),
      prisma.fcstAnomaly.count({ where: { tenantId, acknowledged: false } }),
    ])
    return { success: true, data: { models, predictions, openAnomalies: anomalies } }
  })

  app.get('/models', async (req) => {
    const { tenantId } = req
    const models = await prisma.fcstModel.findMany({
      where: { tenantId },
      include: { _count: { select: { predictions: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: models }
  })

  app.post('/models', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const model = await prisma.fcstModel.create({ data: { tenantId, createdBy: userId, ...data } as never })
    return { success: true, data: model }
  })

  app.get('/predictions', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.modelId) where.modelId = q.modelId
    const predictions = await prisma.fcstPrediction.findMany({
      where: where as never,
      include: { model: { select: { name: true, entity: true } } },
      orderBy: { period: 'desc' },
      take: 100,
    })
    return { success: true, data: predictions }
  })

  app.get('/anomalies', async (req) => {
    const { tenantId } = req
    const anomalies = await prisma.fcstAnomaly.findMany({
      where: { tenantId, acknowledged: false },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: anomalies }
  })

  app.patch('/anomalies/:id/resolve', async (req) => {
    const { id } = req.params as { id: string }
    const anomaly = await prisma.fcstAnomaly.update({ where: { id }, data: { acknowledged: true } })
    return { success: true, data: anomaly }
  })
}