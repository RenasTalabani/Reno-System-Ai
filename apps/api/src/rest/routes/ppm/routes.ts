import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../lib/prisma.js'

export async function ppmRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  app.get('/portfolios', auth, async (req) => {
    const { tenantId } = req.user as { tenantId: string }
    const portfolios = await prisma.ppmPortfolio.findMany({ where: { tenantId }, include: { projects: { select: { id: true, name: true, status: true, progress: true } } }, orderBy: { createdAt: 'desc' } })
    return { success: true, data: portfolios }
  })

  app.post('/portfolios', auth, async (req) => {
    const { tenantId, id: ownerId } = req.user as { tenantId: string; id: string }
    const data = req.body as Record<string, unknown>
    const portfolio = await prisma.ppmPortfolio.create({ data: { tenantId, ownerId, ...data } as never })
    return { success: true, data: portfolio }
  })

  app.get('/projects', auth, async (req) => {
    const { tenantId } = req.user as { tenantId: string }
    const q = req.query as Record<string, string>
    const projects = await prisma.ppmProject.findMany({
      where: { tenantId, ...(q.status ? { status: q.status } : {}), ...(q.portfolioId ? { portfolioId: q.portfolioId } : {}) },
      include: { milestones: true, members: true },
      orderBy: { createdAt: 'desc' }, take: 50,
    })
    return { success: true, data: projects }
  })

  app.post('/projects', auth, async (req) => {
    const { tenantId, id: managerId } = req.user as { tenantId: string; id: string }
    const { milestones, ...rest } = req.body as Record<string, unknown>
    const project = await prisma.ppmProject.create({
      data: { tenantId, managerId, ...rest, milestones: { create: (milestones as unknown[]) ?? [] } } as never,
      include: { milestones: true },
    })
    return { success: true, data: project }
  })

  app.patch('/projects/:id', auth, async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const project = await prisma.ppmProject.update({ where: { id }, data: data as never })
    return { success: true, data: project }
  })

  app.get('/summary', auth, async (req) => {
    const { tenantId } = req.user as { tenantId: string }
    const [portfolios, activeProjects, atRisk] = await Promise.all([
      prisma.ppmPortfolio.count({ where: { tenantId } }),
      prisma.ppmProject.count({ where: { tenantId, status: 'active' } }),
      prisma.ppmProject.count({ where: { tenantId, status: 'at_risk' } }),
    ])
    return { success: true, data: { portfolios, activeProjects, atRisk } }
  })
}
