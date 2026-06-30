import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function architectureRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [activeProjects, totalProjects, pendingMilestones] = await Promise.all([
      prisma.adfProject.count({ where: { tenantId, status: 'active' } }),
      prisma.adfProject.count({ where: { tenantId } }),
      prisma.adfMilestone.count({ where: { project: { tenantId }, status: 'pending' } }),
    ])
    return { success: true, data: { activeProjects, totalProjects, pendingMilestones } }
  })

  app.get('/projects', async (req) => {
    const { tenantId } = req
    const projects = await prisma.adfProject.findMany({
      where: { tenantId },
      include: { _count: { select: { milestones: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: projects }
  })

  app.post('/projects', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const project = await prisma.adfProject.create({ data: { tenantId, ...data } as never })
    return { success: true, data: project }
  })

  app.post('/projects/:id/milestones', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const ms = await prisma.adfMilestone.create({ data: { projectId: id, ...data } as never })
    return { success: true, data: ms }
  })

  app.patch('/milestones/:id/complete', async (req) => {
    const { id } = req.params as { id: string }
    const ms = await prisma.adfMilestone.update({ where: { id }, data: { status: 'completed' } })
    return { success: true, data: ms }
  })
}
