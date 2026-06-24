import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function commSearchRoutes(app: FastifyInstance) {
  // GET /comm/search?q=...&type=channel|dm|all
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { q, type = 'all', limit = 30 } = req.query as any
    if (!q || q.length < 2) return reply.code(400).send({ success: false, error: 'query must be at least 2 chars' })

    const results: any = { channels: [], dm: [], total: 0 }

    if (type === 'all' || type === 'channel') {
      results.channels = await prisma.commMessage.findMany({
        where: {
          tenantId, deletedAt: null,
          channelId: { not: null },
          content: { contains: q, mode: 'insensitive' },
        },
        include: { channel: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
      })
    }

    if (type === 'all' || type === 'dm') {
      results.dm = await prisma.commMessage.findMany({
        where: {
          tenantId, deletedAt: null,
          dmConversationId: { not: null },
          content: { contains: q, mode: 'insensitive' },
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
      })
    }

    results.total = results.channels.length + results.dm.length
    return reply.send({ success: true, data: results })
  })
}
