import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function rdRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [total, active, publications] = await Promise.all([
      prisma.rdProject.count({ where: { tenantId } }),
      prisma.rdProject.count({ where: { tenantId, status: 'active' } }),
      prisma.rdPublication.count({ where: { project: { tenantId } } }),
    ])
    return { success: true, data: { totalProjects: total, activeProjects: active, publications } }
  })

  app.get('/projects', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.status) where.status = q.status
    const projects = await prisma.rdProject.findMany({
      where: where as never,
      include: { _count: { select: { experiments: true, publications: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: projects }
  })

  app.post('/projects', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const project = await prisma.rdProject.create({ data: { tenantId, leadId: userId, ...data } as never })
    return { success: true, data: project }
  })

  app.get('/projects/:id', async (req) => {
    const { id } = req.params as { id: string }
    const project = await prisma.rdProject.findUnique({
      where: { id },
      include: { experiments: { orderBy: { createdAt: 'desc' } }, publications: { orderBy: { createdAt: 'desc' } } },
    })
    return { success: true, data: project }
  })

  app.post('/projects/:id/experiments', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const exp = await prisma.rdExperiment.create({ data: { projectId: id, ...data } as never })
    return { success: true, data: exp }
  })

  app.post('/projects/:id/publications', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const pub = await prisma.rdPublication.create({ data: { projectId: id, ...data } as never })
    return { success: true, data: pub }
  })
}
