import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function wasteRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [activeRoutes, todayCollections, totalCollections] = await Promise.all([
      prisma.wstRoute.count({ where: { tenantId, isActive: true } }),
      prisma.wstCollection.count({ where: { route: { tenantId }, collectedAt: { gte: new Date(new Date().toDateString()) } } }),
      prisma.wstCollection.count({ where: { route: { tenantId } } }),
    ])
    return { success: true, data: { activeRoutes, todayCollections, totalCollections } }
  })

  app.get('/routes', async (req) => {
    const { tenantId } = req
    const routes = await prisma.wstRoute.findMany({
      where: { tenantId },
      include: { _count: { select: { collections: true } } },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: routes }
  })

  app.post('/routes', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const route = await prisma.wstRoute.create({ data: { tenantId, ...data } as never })
    return { success: true, data: route }
  })

  app.post('/routes/:id/collections', async (req) => {
    const { id } = req.params as { id: string }
    const { userId } = req
    const data = req.body as Record<string, unknown>
    const col = await prisma.wstCollection.create({ data: { routeId: id, operatorId: userId, collectedAt: new Date(), ...data } as never })
    return { success: true, data: col }
  })

  app.get('/routes/:id/collections', async (req) => {
    const { id } = req.params as { id: string }
    const collections = await prisma.wstCollection.findMany({ where: { routeId: id }, orderBy: { collectedAt: 'desc' }, take: 30 })
    return { success: true, data: collections }
  })
}
