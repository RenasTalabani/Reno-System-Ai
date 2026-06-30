import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function mediaRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [totalChannels, totalContent, livePrograms] = await Promise.all([
      prisma.mbrChannel.count({ where: { tenantId, status: 'active' } }),
      prisma.mbrContent.count({ where: { tenantId } }),
      prisma.mbrProgram.count({ where: { channel: { tenantId }, status: 'live' } }),
    ])
    return { success: true, data: { totalChannels, totalContent, livePrograms } }
  })

  app.get('/channels', async (req) => {
    const { tenantId } = req
    const channels = await prisma.mbrChannel.findMany({
      where: { tenantId },
      include: { _count: { select: { programs: true } } },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: channels }
  })

  app.post('/channels', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const channel = await prisma.mbrChannel.create({ data: { tenantId, ...data } as never })
    return { success: true, data: channel }
  })

  app.post('/channels/:id/programs', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const program = await prisma.mbrProgram.create({ data: { channelId: id, ...data } as never })
    return { success: true, data: program }
  })

  app.get('/content', async (req) => {
    const { tenantId } = req
    const content = await prisma.mbrContent.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: content }
  })

  app.post('/content', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const content = await prisma.mbrContent.create({ data: { tenantId, ...data } as never })
    return { success: true, data: content }
  })

  app.patch('/content/:id/publish', async (req) => {
    const { id } = req.params as { id: string }
    const content = await prisma.mbrContent.update({ where: { id }, data: { status: 'published', publishedAt: new Date() } })
    return { success: true, data: content }
  })
}
