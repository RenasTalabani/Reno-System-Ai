import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function miningRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [activeSites, totalOperations] = await Promise.all([
      prisma.mneSite.count({ where: { tenantId, status: 'active' } }),
      prisma.mneOperation.count({ where: { site: { tenantId } } }),
    ])
    return { success: true, data: { activeSites, totalOperations } }
  })

  app.get('/sites', async (req) => {
    const { tenantId } = req
    const sites = await prisma.mneSite.findMany({
      where: { tenantId },
      include: { _count: { select: { operations: true } } },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: sites }
  })

  app.post('/sites', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const site = await prisma.mneSite.create({ data: { tenantId, ...data } as never })
    return { success: true, data: site }
  })

  app.post('/sites/:id/operations', async (req) => {
    const { id } = req.params as { id: string }
    const { userId } = req
    const data = req.body as Record<string, unknown>
    const op = await prisma.mneOperation.create({ data: { siteId: id, operatorId: userId, operatedAt: new Date(), ...data } as never })
    return { success: true, data: op }
  })

  app.get('/sites/:id/operations', async (req) => {
    const { id } = req.params as { id: string }
    const ops = await prisma.mneOperation.findMany({ where: { siteId: id }, orderBy: { operatedAt: 'desc' }, take: 50 })
    return { success: true, data: ops }
  })
}
