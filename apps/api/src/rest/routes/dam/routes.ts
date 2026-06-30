import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function damRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [totalCollections, totalAssets, expiringSoon] = await Promise.all([
      prisma.damCollection.count({ where: { tenantId } }),
      prisma.damAsset.count({ where: { collection: { tenantId } } }),
      prisma.damAsset.count({
        where: {
          collection: { tenantId },
          expiresAt: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), gte: new Date() },
        },
      }),
    ])
    return { success: true, data: { totalCollections, totalAssets, expiringSoon } }
  })

  app.get('/collections', async (req) => {
    const { tenantId } = req
    const collections = await prisma.damCollection.findMany({
      where: { tenantId },
      include: { _count: { select: { assets: true } } },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: collections }
  })

  app.post('/collections', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const col = await prisma.damCollection.create({ data: { tenantId, createdBy: userId, ...data } as never })
    return { success: true, data: col }
  })

  app.get('/collections/:id/assets', async (req) => {
    const { id } = req.params as { id: string }
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { collectionId: id }
    const assets = await prisma.damAsset.findMany({
      where: where as never,
      include: { _count: { select: { distributions: true } } },
      orderBy: { createdAt: 'desc' },
      take: Number(q.limit ?? 50),
    })
    return { success: true, data: assets }
  })

  app.post('/collections/:id/assets', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const asset = await prisma.damAsset.create({ data: { collectionId: id, ...data } as never })
    return { success: true, data: asset }
  })

  app.post('/assets/:id/distribute', async (req) => {
    const { id } = req.params as { id: string }
    const { channel } = req.body as { channel: string }
    const dist = await prisma.damDistribution.create({
      data: { assetId: id, channel, distributedAt: new Date(), status: 'distributed' },
    })
    return { success: true, data: dist }
  })

  app.delete('/assets/:id', async (req) => {
    const { id } = req.params as { id: string }
    await prisma.damAsset.delete({ where: { id } })
    return { success: true }
  })
}
