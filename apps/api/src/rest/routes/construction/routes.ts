import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function constructionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [totalProjects, activeProjects, openRfis, openPunchItems] = await Promise.all([
      prisma.conProject.count({ where: { tenantId } }),
      prisma.conProject.count({ where: { tenantId, status: { in: ['active', 'in-progress'] } } }),
      prisma.conRfi.count({ where: { project: { tenantId }, status: 'open' } }),
      prisma.conPunchItem.count({ where: { project: { tenantId }, status: 'open' } }),
    ])
    return { success: true, data: { totalProjects, activeProjects, openRfis, openPunchItems } }
  })

  app.get('/projects', async (req) => {
    const { tenantId } = req
    const projects = await prisma.conProject.findMany({
      where: { tenantId },
      include: { _count: { select: { rfis: true, punchItems: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: projects }
  })

  app.post('/projects', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const project = await prisma.conProject.create({ data: { tenantId, createdBy: userId, ...data } as never })
    return { success: true, data: project }
  })

  app.get('/projects/:id', async (req) => {
    const { id } = req.params as { id: string }
    const project = await prisma.conProject.findUnique({
      where: { id },
      include: { rfis: { orderBy: { createdAt: 'desc' } }, punchItems: { orderBy: { createdAt: 'desc' } } },
    })
    return { success: true, data: project }
  })

  app.post('/projects/:id/rfis', async (req) => {
    const { id } = req.params as { id: string }
    const { userId } = req
    const data = req.body as Record<string, unknown>
    const count = await prisma.conRfi.count({ where: { projectId: id } })
    const number = `RFI-${String(count + 1).padStart(3, '0')}`
    const rfi = await prisma.conRfi.create({ data: { projectId: id, number, submittedBy: userId, ...data } as never })
    return { success: true, data: rfi }
  })

  app.post('/projects/:id/punch-items', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const item = await prisma.conPunchItem.create({ data: { projectId: id, ...data } as never })
    return { success: true, data: item }
  })

  app.patch('/punch-items/:id/close', async (req) => {
    const { id } = req.params as { id: string }
    const item = await prisma.conPunchItem.update({ where: { id }, data: { status: 'closed', closedAt: new Date() } })
    return { success: true, data: item }
  })
}
