import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

const MSG_INCLUDE = {
  reactions: true,
  attachments: true,
  mentions: true,
  _count: { select: { replies: true, reactions: true } },
}

export async function commChannelRoutes(app: FastifyInstance) {
  // GET /comm/channels
  app.get('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { teamId, page = 1, limit = 100 } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = { tenantId, deletedAt: null, isArchived: false }
    if (teamId) where.teamId = teamId

    const [channels, total] = await Promise.all([
      prisma.commChannel.findMany({
        where,
        include: {
          _count: { select: { members: true } },
          members: { where: { userId }, take: 1 },
        },
        orderBy: [{ lastMessageAt: 'desc' }, { name: 'asc' }],
        skip, take: Number(limit),
      }),
      prisma.commChannel.count({ where }),
    ])

    return reply.send({ success: true, data: channels, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  // POST /comm/channels
  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { teamId, name, description, topic, type } = req.body as any
    if (!name) return reply.code(400).send({ success: false, error: 'name required' })

    const channel = await prisma.commChannel.create({
      data: { tenantId, teamId, name, description, topic, type: type ?? 'public', createdBy: userId },
    })
    await prisma.commChannelMember.create({ data: { tenantId, channelId: channel.id, userId, role: 'admin' } })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'comm', entityType: 'CommChannel', entityId: channel.id, newValues: { name, type } } })
    return reply.code(201).send({ success: true, data: channel })
  })

  // GET /comm/channels/:id
  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const channel = await prisma.commChannel.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        team: { select: { id: true, name: true } },
        _count: { select: { members: true, messages: true } },
      },
    })
    if (!channel) return reply.code(404).send({ success: false, error: 'Channel not found' })
    return reply.send({ success: true, data: channel })
  })

  // PUT /comm/channels/:id
  app.put('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { name, description, topic, isArchived } = req.body as any
    const channel = await prisma.commChannel.update({ where: { id }, data: { name, description, topic, isArchived, updatedBy: userId } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE', module: 'comm', entityType: 'CommChannel', entityId: id, newValues: req.body as any } })
    return reply.send({ success: true, data: channel })
  })

  // DELETE /comm/channels/:id
  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    await prisma.commChannel.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'DELETE', module: 'comm', entityType: 'CommChannel', entityId: id, newValues: {} } })
    return reply.send({ success: true, data: { deleted: true } })
  })

  // POST /comm/channels/:id/join
  app.post('/:id/join', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const member = await prisma.commChannelMember.upsert({
      where: { channelId_userId: { channelId: id, userId } },
      create: { tenantId, channelId: id, userId, role: 'member' },
      update: { leftAt: null },
    })
    return reply.send({ success: true, data: member })
  })

  // POST /comm/channels/:id/leave
  app.post('/:id/leave', async (req, reply) => {
    const { userId } = req as any
    const { id } = req.params as any
    await prisma.commChannelMember.updateMany({
      where: { channelId: id, userId },
      data: { leftAt: new Date() },
    })
    return reply.send({ success: true, data: { left: true } })
  })

  // GET /comm/channels/:id/members
  app.get('/:id/members', async (req, reply) => {
    const { id } = req.params as any
    const members = await prisma.commChannelMember.findMany({
      where: { channelId: id, leftAt: null },
      orderBy: { joinedAt: 'asc' },
    })
    return reply.send({ success: true, data: members })
  })

  // GET /comm/channels/:id/messages
  app.get('/:id/messages', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const { before, limit = 50 } = req.query as any

    const where: any = { channelId: id, tenantId, deletedAt: null, parentMessageId: null }
    if (before) where.createdAt = { lt: new Date(before) }

    const messages = await prisma.commMessage.findMany({
      where,
      include: MSG_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
    })

    return reply.send({ success: true, data: messages.reverse() })
  })

  // POST /comm/channels/:id/messages
  app.post('/:id/messages', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { content, type, parentMessageId, relatedEntityType, relatedEntityId, isAiGenerated } = req.body as any
    if (!content?.trim()) return reply.code(400).send({ success: false, error: 'content required' })

    const message = await prisma.commMessage.create({
      data: {
        tenantId, channelId: id, userId,
        content: content.trim(), type: type ?? 'text',
        parentMessageId, relatedEntityType, relatedEntityId,
        isAiGenerated: isAiGenerated ?? false,
      },
      include: MSG_INCLUDE,
    })

    await prisma.commChannel.update({ where: { id }, data: { lastMessageAt: new Date(), messageCount: { increment: 1 } } })

    if (parentMessageId) {
      await prisma.commMessage.update({ where: { id: parentMessageId }, data: { replyCount: { increment: 1 } } })
    }

    // Extract @mentions (format: @[userId])
    const mentionMatches = content.match(/@\[([a-f0-9-]+)\]/g) ?? []
    for (const m of mentionMatches) {
      const mentionedUserId = m.slice(2, -1)
      await prisma.commMention.create({ data: { tenantId, messageId: message.id, mentionedUserId, mentionType: 'user' } })
        .catch(() => null)
    }

    return reply.code(201).send({ success: true, data: message })
  })

  // PUT /comm/channels/:id/messages/:msgId
  app.put('/:id/messages/:msgId', async (req, reply) => {
    const { userId } = req as any
    const { id, msgId } = req.params as any
    const { content } = req.body as any
    if (!content?.trim()) return reply.code(400).send({ success: false, error: 'content required' })

    const msg = await prisma.commMessage.findFirst({ where: { id: msgId, channelId: id, userId, deletedAt: null } })
    if (!msg) return reply.code(404).send({ success: false, error: 'Message not found or not yours' })

    const updated = await prisma.commMessage.update({
      where: { id: msgId },
      data: { content: content.trim(), isEdited: true, editedAt: new Date() },
      include: MSG_INCLUDE,
    })
    return reply.send({ success: true, data: updated })
  })

  // DELETE /comm/channels/:id/messages/:msgId
  app.delete('/:id/messages/:msgId', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id, msgId } = req.params as any
    await prisma.commMessage.update({ where: { id: msgId }, data: { deletedAt: new Date(), content: '[deleted]' } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'DELETE', module: 'comm', entityType: 'CommMessage', entityId: msgId, newValues: { channelId: id } } })
    return reply.send({ success: true, data: { deleted: true } })
  })

  // POST /comm/channels/:id/messages/:msgId/react
  app.post('/:id/messages/:msgId/react', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { msgId } = req.params as any
    const { emoji } = req.body as any
    if (!emoji) return reply.code(400).send({ success: false, error: 'emoji required' })

    const reaction = await prisma.commReaction.upsert({
      where: { messageId_userId_emoji: { messageId: msgId, userId, emoji } },
      create: { tenantId, messageId: msgId, userId, emoji },
      update: {},
    })
    return reply.code(201).send({ success: true, data: reaction })
  })

  // DELETE /comm/channels/:id/messages/:msgId/react
  app.delete('/:id/messages/:msgId/react', async (req, reply) => {
    const { userId } = req as any
    const { msgId } = req.params as any
    const { emoji } = req.query as any
    await prisma.commReaction.deleteMany({ where: { messageId: msgId, userId, emoji } })
    return reply.send({ success: true, data: { removed: true } })
  })

  // POST /comm/channels/:id/messages/:msgId/pin
  app.post('/:id/messages/:msgId/pin', async (req, reply) => {
    const { userId } = req as any
    const { msgId } = req.params as any
    const msg = await prisma.commMessage.update({
      where: { id: msgId },
      data: { isPinned: true, pinnedAt: new Date(), pinnedBy: userId },
    })
    return reply.send({ success: true, data: msg })
  })

  // DELETE /comm/channels/:id/messages/:msgId/pin
  app.delete('/:id/messages/:msgId/pin', async (req, reply) => {
    const { msgId } = req.params as any
    const msg = await prisma.commMessage.update({
      where: { id: msgId },
      data: { isPinned: false, pinnedAt: null, pinnedBy: null },
    })
    return reply.send({ success: true, data: msg })
  })

  // GET /comm/channels/:id/pinned
  app.get('/:id/pinned', async (req, reply) => {
    const { id } = req.params as any
    const pinned = await prisma.commMessage.findMany({
      where: { channelId: id, isPinned: true, deletedAt: null },
      include: MSG_INCLUDE,
      orderBy: { pinnedAt: 'desc' },
    })
    return reply.send({ success: true, data: pinned })
  })

  // GET /comm/channels/:id/threads/:msgId
  app.get('/:id/threads/:msgId', async (req, reply) => {
    const { tenantId } = req as any
    const { msgId } = req.params as any
    const replies = await prisma.commMessage.findMany({
      where: { parentMessageId: msgId, tenantId, deletedAt: null },
      include: MSG_INCLUDE,
      orderBy: { createdAt: 'asc' },
    })
    return reply.send({ success: true, data: replies })
  })

  // POST /comm/channels/:id/read
  app.post('/:id/read', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    await prisma.commChannelMember.updateMany({
      where: { channelId: id, userId },
      data: { lastReadAt: new Date() },
    })
    return reply.send({ success: true, data: { marked: true } })
  })
}
