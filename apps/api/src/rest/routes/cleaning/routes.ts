import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function cleaningRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const now = new Date()
    const [scheduledToday, completedTotal, pendingJobs] = await Promise.all([
      prisma.clnJob.count({ where: { tenantId, scheduledAt: { gte: new Date(now.toDateString()) } } }),
      prisma.clnJob.count({ where: { tenantId, status: 'completed' } }),
      prisma.clnJob.count({ where: { tenantId, status: 'scheduled' } }),
    ])
    return { success: true, data: { scheduledToday, completedTotal, pendingJobs } }
  })

  app.get('/jobs', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.status) where.status = q.status
    const jobs = await prisma.clnJob.findMany({
      where: where as never,
      include: { _count: { select: { assignments: true } } },
      orderBy: { scheduledAt: 'asc' },
      take: 50,
    })
    return { success: true, data: jobs }
  })

  app.post('/jobs', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const job = await prisma.clnJob.create({ data: { tenantId, ...data } as never })
    return { success: true, data: job }
  })

  app.patch('/jobs/:id/complete', async (req) => {
    const { id } = req.params as { id: string }
    const job = await prisma.clnJob.update({ where: { id }, data: { status: 'completed' } })
    return { success: true, data: job }
  })

  app.post('/jobs/:id/assign', async (req) => {
    const { id } = req.params as { id: string }
    const { staffId } = req.body as { staffId: string }
    const assignment = await prisma.clnAssignment.create({ data: { jobId: id, staffId } })
    return { success: true, data: assignment }
  })
}
