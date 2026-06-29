import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function ocrRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [total, processed, pending, failed] = await Promise.all([
      prisma.ocrJob.count({ where: { tenantId } }),
      prisma.ocrJob.count({ where: { tenantId, status: 'completed' } }),
      prisma.ocrJob.count({ where: { tenantId, status: 'pending' } }),
      prisma.ocrJob.count({ where: { tenantId, status: 'failed' } }),
    ])
    return { success: true, data: { totalJobs: total, processed, pending, failed } }
  })

  app.get('/jobs', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.status) where.status = q.status
    if (q.template) where.template = q.template
    const jobs = await prisma.ocrJob.findMany({
      where: where as never,
      include: { _count: { select: { fields: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: jobs }
  })

  app.post('/jobs', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const job = await prisma.ocrJob.create({ data: { tenantId, createdBy: userId, status: 'pending', ...data } as never })
    return { success: true, data: job }
  })

  app.get('/jobs/:id', async (req) => {
    const { id } = req.params as { id: string }
    const job = await prisma.ocrJob.findUnique({ where: { id }, include: { fields: true } })
    return { success: true, data: job }
  })

  app.patch('/jobs/:id/complete', async (req) => {
    const { id } = req.params as { id: string }
    const { fields, rawText, confidence } = req.body as { fields: Array<{ key: string; value: string; confidence?: number; pageNo?: number }>; rawText?: string; confidence?: number }
    const job = await prisma.ocrJob.update({
      where: { id },
      data: { status: 'completed', completedAt: new Date(), rawText, confidence: confidence as never,
        fields: { create: fields.map(f => ({ key: f.key, value: f.value, confidence: f.confidence as never, pageNo: f.pageNo })) } },
      include: { fields: true },
    })
    return { success: true, data: job }
  })

  app.patch('/jobs/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const job = await prisma.ocrJob.update({ where: { id }, data: data as never })
    return { success: true, data: job }
  })
}