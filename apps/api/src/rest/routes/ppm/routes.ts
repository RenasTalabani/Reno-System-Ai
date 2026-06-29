import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function ppmRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)
  app.get('/portfolios', async (req) => {
    const { tenantId } = req
    const portfolios = await prisma.ppmPortfolio.findMany({ where: { tenantId }, include: { projects: { select: { id: true, name: true, status: true, progress: true } } }, orderBy: { createdAt: 'desc' } })
    return { success: true, data: portfolios }
  })

  app.post('/portfolios', async (req) => {
    const { tenantId, id: ownerId } = req.user as { tenantId: string; id: string }
    const data = req.body as Record<string, unknown>
    const portfolio = await prisma.ppmPortfolio.create({ data: { tenantId, ownerId, ...data } as never })
    return { success: true, data: portfolio }
  })

  app.get('/projects', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const projects = await prisma.ppmProject.findMany({
      where: { tenantId, ...(q.status ? { status: q.status } : {}), ...(q.portfolioId ? { portfolioId: q.portfolioId } : {}) },
      include: { milestones: true, members: true },
      orderBy: { createdAt: 'desc' }, take: 50,
    })
    return { success: true, data: projects }
  })

  app.post('/projects', async (req) => {
    const { tenantId, id: managerId } = req.user as { tenantId: string; id: string }
    const { milestones, ...rest } = req.body as Record<string, unknown>
    const project = await prisma.ppmProject.create({
      data: { tenantId, managerId, ...rest, milestones: { create: (milestones as unknown[]) ?? [] } } as never,
      include: { milestones: true },
    })
    return { success: true, data: project }
  })

  app.patch('/projects/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const project = await prisma.ppmProject.update({ where: { id }, data: data as never })
    return { success: true, data: project }
  })

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [portfolios, activeProjects, atRisk] = await Promise.all([
      prisma.ppmPortfolio.count({ where: { tenantId } }),
      prisma.ppmProject.count({ where: { tenantId, status: 'active' } }),
      prisma.ppmProject.count({ where: { tenantId, status: 'at_risk' } }),
    ])
    return { success: true, data: { portfolios, activeProjects, atRisk } }
  })
}


