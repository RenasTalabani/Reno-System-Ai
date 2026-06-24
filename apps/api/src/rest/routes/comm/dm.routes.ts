import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

const MSG_INCLUDE = {
  reactions: true,
  attachments: true,
  _count: { select: { replies: true } },
}

export async function commDmRoutes(app: FastifyInstance) {
  // GET /comm/dm — list my DM conversations
  app.get('/', async (req, reply) => {
    const { tenantId, userId } = req as any

    const participants = await prisma.commDmParticipant.findMany({
      where: { tenantId, userId, isArchived: false },
      include: {
        conversation: {
          include: {
            participants: true,
            _count: { select: { messages: true } },
          },
        },
      },
      orderBy: { conversation: { lastMessageAt: 'desc' } },
    })

    return reply.send({ success: true, data: participants })
  })

  // POST /comm/dm — start or get DM conversation
  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { participantIds, isGroup, name } = req.body as any
    if (!participantIds?.length) return reply.code(400).send({ success: false, error: 'participantIds required' })

    const allParticipants: string[] = [...new Set([userId, ...participantIds])]

    // For 1:1 DMs, find existing conversation
    if (!isGroup && allParticipants.length === 2) {
      const otherUserId = allParticipants.find(id => id !== userId)!
      const existing = await prisma.commDmParticipant.findFirst({
        where: {
          tenantId, userId,
          conversation: {
            isGroup: false,
            participants: { some: { userId: otherUserId } },
          },
        },
        include: { conversation: true },
      })
      if (existing) return reply.send({ success: true, data: existing.conversation })
    }

    const conversation = await prisma.commDmConversation.create({
      data: {
        tenantId, isGroup: isGroup ?? false, name,
        participants: {
          create: allParticipants.map(uid => ({ tenantId, userId: uid })),
        },
      },
      include: { participants: true },
    })

    return reply.code(201).send({ success: true, data: conversation })
  })

  // GET /comm/dm/:id — get conversation
  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any

    const conversation = await prisma.commDmConversation.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        participants: true,
        _count: { select: { messages: true } },
      },
    })
    if (!conversation) return reply.code(404).send({ success: false, error: 'Conversation not found' })
    return reply.send({ success: true, data: conversation })
  })

  // GET /comm/dm/:id/messages
  app.get('/:id/messages', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const { before, limit = 50 } = req.query as any

    const where: any = { dmConversationId: id, tenantId, deletedAt: null, parentMessageId: null }
    if (before) where.createdAt = { lt: new Date(before) }

    const messages = await prisma.commMessage.findMany({
      where,
      include: MSG_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
    })

    return reply.send({ success: true, data: messages.reverse() })
  })

  // POST /comm/dm/:id/messages
  app.post('/:id/messages', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { content, type, parentMessageId } = req.body as any
    if (!content?.trim()) return reply.code(400).send({ success: false, error: 'content required' })

    const conversation = await prisma.commDmConversation.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!conversation) return reply.code(404).send({ success: false, error: 'Conversation not found' })

    const message = await prisma.commMessage.create({
      data: { tenantId, dmConversationId: id, userId, content: content.trim(), type: type ?? 'text', parentMessageId },
      include: MSG_INCLUDE,
    })

    await prisma.commDmConversation.update({ where: { id }, data: { lastMessageAt: new Date() } })

    return reply.code(201).send({ success: true, data: message })
  })

  // PUT /comm/dm/:id/messages/:msgId
  app.put('/:id/messages/:msgId', async (req, reply) => {
    const { userId } = req as any
    const { id, msgId } = req.params as any
    const { content } = req.body as any
    if (!content?.trim()) return reply.code(400).send({ success: false, error: 'content required' })

    const msg = await prisma.commMessage.findFirst({ where: { id: msgId, dmConversationId: id, userId, deletedAt: null } })
    if (!msg) return reply.code(404).send({ success: false, error: 'Message not found or not yours' })

    const updated = await prisma.commMessage.update({
      where: { id: msgId },
      data: { content: content.trim(), isEdited: true, editedAt: new Date() },
      include: MSG_INCLUDE,
    })
    return reply.send({ success: true, data: updated })
  })

  // DELETE /comm/dm/:id/messages/:msgId
  app.delete('/:id/messages/:msgId', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { msgId } = req.params as any
    await prisma.commMessage.update({ where: { id: msgId }, data: { deletedAt: new Date(), content: '[deleted]' } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'DELETE', module: 'comm', entityType: 'CommMessage', entityId: msgId, newValues: {} } })
    return reply.send({ success: true, data: { deleted: true } })
  })

  // POST /comm/dm/:id/read
  app.post('/:id/read', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    await prisma.commDmParticipant.updateMany({
      where: { conversationId: id, userId },
      data: { lastReadAt: new Date() },
    })
    return reply.send({ success: true, data: { marked: true } })
  })

  // PATCH /comm/dm/:id/archive
  app.patch('/:id/archive', async (req, reply) => {
    const { userId } = req as any
    const { id } = req.params as any
    await prisma.commDmParticipant.updateMany({
      where: { conversationId: id, userId },
      data: { isArchived: true },
    })
    return reply.send({ success: true, data: { archived: true } })
  })
}
