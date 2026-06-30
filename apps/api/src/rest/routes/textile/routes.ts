import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function textileRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [totalCollections, activeCollections, totalItems] = await Promise.all([
      prisma.txtCollection.count({ where: { tenantId } }),
      prisma.txtCollection.count({ where: { tenantId, status: 'production' } }),
      prisma.txtItem.count({ where: { collection: { tenantId } } }),
    ])
    return { success: true, data: { totalCollections, activeCollections, totalItems } }
  })

  app.get('/collections', async (req) => {
    const { tenantId } = req
    const collections = await prisma.txtCollection.findMany({
      where: { tenantId },
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: collections }
  })

  app.post('/collections', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const col = await prisma.txtCollection.create({ data: { tenantId, ...data } as never })
    return { success: true, data: col }
  })

  app.post('/collections/:id/items', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const item = await prisma.txtItem.create({ data: { collectionId: id, ...data } as never })
    return { success: true, data: item }
  })

  app.get('/collections/:id/items', async (req) => {
    const { id } = req.params as { id: string }
    const items = await prisma.txtItem.findMany({ where: { collectionId: id }, orderBy: { name: 'asc' } })
    return { success: true, data: items }
  })
}
