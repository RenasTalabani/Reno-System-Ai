import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function atsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [openJobs, totalCandidates, totalApplications, hired] = await Promise.all([
      prisma.atsJob.count({ where: { tenantId, status: 'published' } }),
      prisma.atsCandidate.count({ where: { tenantId } }),
      prisma.atsApplication.count({ where: { job: { tenantId } } }),
      prisma.atsApplication.count({ where: { job: { tenantId }, hiredAt: { not: null } } }),
    ])
    return { success: true, data: { openJobs, totalCandidates, totalApplications, hired } }
  })

  app.get('/jobs', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.status) where.status = q.status
    if (q.department) where.department = q.department
    const jobs = await prisma.atsJob.findMany({
      where: where as never,
      include: { _count: { select: { applications: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: jobs }
  })

  app.post('/jobs', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const job = await prisma.atsJob.create({ data: { tenantId, createdBy: userId, ...data } as never })
    return { success: true, data: job }
  })

  app.get('/jobs/:id', async (req) => {
    const { id } = req.params as { id: string }
    const job = await prisma.atsJob.findUnique({
      where: { id },
      include: { applications: { include: { candidate: true, interviews: true } } },
    })
    return { success: true, data: job }
  })

  app.patch('/jobs/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const job = await prisma.atsJob.update({ where: { id }, data: data as never })
    return { success: true, data: job }
  })

  app.get('/candidates', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.search) where.OR = [{ firstName: { contains: q.search } }, { lastName: { contains: q.search } }, { email: { contains: q.search } }]
    const candidates = await prisma.atsCandidate.findMany({
      where: where as never,
      include: { _count: { select: { applications: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: candidates }
  })

  app.post('/candidates', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const candidate = await prisma.atsCandidate.create({ data: { tenantId, ...data } as never })
    return { success: true, data: candidate }
  })

  app.post('/applications', async (req) => {
    const data = req.body as Record<string, unknown>
    const app2 = await prisma.atsApplication.create({ data: data as never })
    return { success: true, data: app2 }
  })

  app.patch('/applications/:id/stage', async (req) => {
    const { id } = req.params as { id: string }
    const { stage } = req.body as { stage: string }
    const updated = await prisma.atsApplication.update({
      where: { id },
      data: { stage, hiredAt: stage === 'hired' ? new Date() : undefined, rejectedAt: stage === 'rejected' ? new Date() : undefined },
    })
    return { success: true, data: updated }
  })

  app.post('/applications/:id/interviews', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const interview = await prisma.atsInterview.create({ data: { applicationId: id, ...data } as never })
    return { success: true, data: interview }
  })
}