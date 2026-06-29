import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function chatRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [channels, totalMessages, todayMessages] = await Promise.all([
      prisma.chatChannel.count({ where: { tenantId, isArchived: false } }),
      prisma.chatMessage.count({ where: { channel: { tenantId }, isDeleted: false } }),
      prisma.chatMessage.count({ where: { channel: { tenantId }, isDeleted: false, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    ])
    return { success: true, data: { activeChannels: channels, totalMessages, todayMessages } }
  })

  app.get('/channels', async (req) => {
    const { tenantId } = req
    const channels = await prisma.chatChannel.findMany({
      where: { tenantId, isArchived: false },
      include: { _count: { select: { messages: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    })
    return { success: true, data: channels }
  })

  app.post('/channels', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const channel = await prisma.chatChannel.create({ data: { tenantId, createdBy: userId, ...data } as never })
    return { success: true, data: channel }
  })

  app.get('/channels/:id/messages', async (req) => {
    const { id } = req.params as { id: string }
    const q = req.query as Record<string, string>
    const messages = await prisma.chatMessage.findMany({
      where: { channelId: id, isDeleted: false, replyToId: null },
      include: { replies: { where: { isDeleted: false }, orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
      take: q.limit ? parseInt(q.limit) : 50,
    })
    return { success: true, data: messages.reverse() }
  })

  app.post('/channels/:id/messages', async (req) => {
    const { id } = req.params as { id: string }
    const { userId } = req
    const data = req.body as Record<string, unknown>
    const message = await prisma.chatMessage.create({ data: { channelId: id, senderId: userId, ...data } as never })
    await prisma.chatChannel.update({ where: { id }, data: { updatedAt: new Date() } })
    return { success: true, data: message }
  })

  app.patch('/messages/:id', async (req) => {
    const { id } = req.params as { id: string }
    const { content } = req.body as { content: string }
    const message = await prisma.chatMessage.update({ where: { id }, data: { content, isEdited: true } })
    return { success: true, data: message }
  })

  app.delete('/messages/:id', async (req) => {
    const { id } = req.params as { id: string }
    await prisma.chatMessage.update({ where: { id }, data: { isDeleted: true } })
    return { success: true }
  })
}
