import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function fisheryRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [activeSites, todayCatches, totalCatches] = await Promise.all([
      prisma.fshSite.count({ where: { tenantId, isActive: true } }),
      prisma.fshCatch.count({ where: { site: { tenantId }, caughtAt: { gte: new Date(new Date().toDateString()) } } }),
      prisma.fshCatch.count({ where: { site: { tenantId } } }),
    ])
    return { success: true, data: { activeSites, todayCatches, totalCatches } }
  })

  app.get('/sites', async (req) => {
    const { tenantId } = req
    const sites = await prisma.fshSite.findMany({
      where: { tenantId },
      include: { _count: { select: { catches: true } } },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: sites }
  })

  app.post('/sites', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const site = await prisma.fshSite.create({ data: { tenantId, ...data } as never })
    return { success: true, data: site }
  })

  app.post('/sites/:id/catches', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const c = await prisma.fshCatch.create({ data: { siteId: id, caughtAt: new Date(), ...data } as never })
    return { success: true, data: c }
  })

  app.get('/sites/:id/catches', async (req) => {
    const { id } = req.params as { id: string }
    const catches = await prisma.fshCatch.findMany({ where: { siteId: id }, orderBy: { caughtAt: 'desc' }, take: 30 })
    return { success: true, data: catches }
  })
}
