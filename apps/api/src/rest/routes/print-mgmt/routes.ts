import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function printMgmtRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [total, pending, inProgress] = await Promise.all([
      prisma.printJob.count({ where: { tenantId } }),
      prisma.printJob.count({ where: { tenantId, status: 'pending' } }),
      prisma.printJob.count({ where: { tenantId, status: 'in_progress' } }),
    ])
    return { success: true, data: { totalJobs: total, pendingJobs: pending, inProgressJobs: inProgress } }
  })

  app.get('/jobs', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.status) where.status = q.status
    const jobs = await prisma.printJob.findMany({
      where: where as never,
      include: { _count: { select: { assets: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: jobs }
  })

  app.post('/jobs', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const job = await prisma.printJob.create({ data: { tenantId, submittedBy: userId, ...data } as never })
    return { success: true, data: job }
  })

  app.patch('/jobs/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const job = await prisma.printJob.update({ where: { id }, data: data as never })
    return { success: true, data: job }
  })

  app.post('/jobs/:id/assets', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const asset = await prisma.printAsset.create({ data: { jobId: id, ...data } as never })
    return { success: true, data: asset }
  })
}
