import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'

function fix(obj: unknown): unknown {
  return JSON.parse(JSON.stringify(obj, (_, v) => typeof v === 'bigint' ? Number(v) : v))
}

export async function eventBusRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)
  app.addHook('preSerialization', async (_req, _rep, payload) => {
    return JSON.parse(JSON.stringify(payload, (_, v) => typeof v === 'bigint' ? Number(v) : v))
  })

  // T1: registry / capabilities
  app.get('/registry', async (_req, rep) => {
    return rep.send({
      features: ['pub-sub', 'consumer-groups', 'offset-tracking', 'dead-letter-queue', 'replay', 'partitioning'],
      maxStreams: 50,
      maxConsumers: 100,
      retentionOptions: [3600000, 86400000, 604800000],
      statusValues: ['pending', 'processing', 'delivered', 'failed', 'dead'],
    })
  })

  // T2: create stream
  app.post('/streams', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as any
    const stream = await prisma.ebStream.create({
      data: { tenantId, createdBy: userId, name: body.name, description: body.description, partitions: body.partitions ?? 1, retentionMs: body.retentionMs ?? 86400000n, maxMsgSize: body.maxMsgSize ?? 1048576 }
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'event-bus', entityType: 'EbStream', entityId: stream.id, newValues: { name: body.name } as never } }).catch(() => null)
    return rep.status(201).send(fix(stream))
  })

  // T3: list streams
  app.get('/streams', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const streams = await prisma.ebStream.findMany({
      where: { tenantId }, orderBy: { createdAt: 'desc' },
      include: { _count: { select: { messages: true, consumerGroups: true } } }
    })
    return rep.send({ streams, total: streams.length })
  })

  // T4: get stream
  app.get('/streams/:streamId', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { streamId } = req.params as any
    const stream = await prisma.ebStream.findFirst({ where: { id: streamId, tenantId }, include: { consumerGroups: { include: { _count: { select: { consumers: true } } } } } })
    if (!stream) return rep.status(404).send({ error: 'Not found' })
    return rep.send(stream)
  })

  // T5: update stream
  app.patch('/streams/:streamId', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { streamId } = req.params as any
    const body = req.body as any
    const exists = await prisma.ebStream.findFirst({ where: { id: streamId, tenantId } })
    if (!exists) return rep.status(404).send({ error: 'Not found' })
    const data: any = {}
    if (body.description !== undefined) data.description = body.description
    if (body.isActive !== undefined) data.isActive = body.isActive
    if (body.retentionMs !== undefined) data.retentionMs = BigInt(body.retentionMs)
    const stream = await prisma.ebStream.update({ where: { id: streamId }, data })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE', module: 'event-bus', entityType: 'EbStream', entityId: streamId, newValues: data as never } }).catch(() => null)
    return rep.send(stream)
  })

  // T6: delete stream
  app.delete('/streams/:streamId', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { streamId } = req.params as any
    const exists = await prisma.ebStream.findFirst({ where: { id: streamId, tenantId } })
    if (!exists) return rep.status(404).send({ error: 'Not found' })
    await prisma.ebStream.delete({ where: { id: streamId } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'DELETE', module: 'event-bus', entityType: 'EbStream', entityId: streamId, newValues: {} as never } }).catch(() => null)
    return rep.send({ success: true })
  })

  // T7: publish message to stream
  app.post('/streams/:streamId/publish', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { streamId } = req.params as any
    const body = req.body as any
    const stream = await prisma.ebStream.findFirst({ where: { id: streamId, tenantId } })
    if (!stream) return rep.status(404).send({ error: 'Stream not found' })
    const count = await prisma.ebMessage.count({ where: { tenantId, streamId } })
    const message = await prisma.ebMessage.create({
      data: { tenantId, streamId, publishedBy: userId, payload: body.payload ?? {}, headers: (body.headers ?? {}) as never, partitionKey: body.partitionKey, offset: BigInt(count), status: 'pending', expiresAt: body.expiresAt ? new Date(body.expiresAt) : null }
    })
    await prisma.ebStream.update({ where: { id: streamId }, data: { messageCount: { increment: 1 } } })
    return rep.status(201).send(message)
  })

  // T8: publish batch
  app.post('/streams/:streamId/publish/batch', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { streamId } = req.params as any
    const body = req.body as any
    const messages: any[] = body.messages ?? []
    if (!messages.length) return rep.status(400).send({ error: 'No messages' })
    const stream = await prisma.ebStream.findFirst({ where: { id: streamId, tenantId } })
    if (!stream) return rep.status(404).send({ error: 'Stream not found' })
    const baseCount = await prisma.ebMessage.count({ where: { tenantId, streamId } })
    const created = await prisma.ebMessage.createMany({
      data: messages.map((msg: any, idx: number) => ({
        tenantId, streamId, publishedBy: userId, payload: msg.payload ?? {}, headers: (msg.headers ?? {}) as never,
        partitionKey: msg.partitionKey, offset: BigInt(baseCount + idx), status: 'pending'
      }))
    })
    await prisma.ebStream.update({ where: { id: streamId }, data: { messageCount: { increment: created.count } } })
    return rep.send({ published: created.count })
  })

  // T9: consume messages from stream (poll)
  app.post('/streams/:streamId/consume', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { streamId } = req.params as any
    const body = req.body as any
    const limit = body.limit ?? 10
    const fromOffset = body.fromOffset !== undefined ? BigInt(body.fromOffset) : 0n
    const stream = await prisma.ebStream.findFirst({ where: { id: streamId, tenantId } })
    if (!stream) return rep.status(404).send({ error: 'Stream not found' })
    const messages = await prisma.ebMessage.findMany({
      where: { tenantId, streamId, status: { in: ['pending', 'failed'] }, offset: { gte: fromOffset } },
      orderBy: { offset: 'asc' }, take: limit
    })
    if (messages.length > 0) {
      await prisma.ebMessage.updateMany({ where: { id: { in: messages.map(m => m.id) } }, data: { status: 'processing', processedAt: new Date() } })
    }
    return rep.send({ messages, count: messages.length, nextOffset: messages.length > 0 ? Number(messages[messages.length - 1].offset) + 1 : Number(fromOffset) })
  })

  // T10: acknowledge messages
  app.post('/streams/:streamId/ack', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { streamId } = req.params as any
    const body = req.body as any
    const messageIds: string[] = body.messageIds ?? []
    await prisma.ebMessage.updateMany({ where: { id: { in: messageIds }, tenantId, streamId }, data: { status: 'delivered' } })
    return rep.send({ acknowledged: messageIds.length })
  })

  // T11: create consumer group
  app.post('/streams/:streamId/consumer-groups', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { streamId } = req.params as any
    const body = req.body as any
    const stream = await prisma.ebStream.findFirst({ where: { id: streamId, tenantId } })
    if (!stream) return rep.status(404).send({ error: 'Stream not found' })
    const group = await prisma.ebConsumerGroup.create({
      data: { tenantId, streamId, name: body.name, description: body.description, maxRetries: body.maxRetries ?? 3 }
    })
    await prisma.ebConsumerOffset.create({ data: { tenantId, consumerGroupId: group.id, partition: 0, offset: 0n, updatedAt: new Date() } })
    return rep.status(201).send(group)
  })

  // T12: list consumer groups for stream
  app.get('/streams/:streamId/consumer-groups', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { streamId } = req.params as any
    const groups = await prisma.ebConsumerGroup.findMany({
      where: { streamId, tenantId },
      include: { _count: { select: { consumers: true } }, offsets: true }
    })
    return rep.send({ groups, total: groups.length })
  })

  // T13: add consumer to group
  app.post('/consumer-groups/:groupId/consumers', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { groupId } = req.params as any
    const body = req.body as any
    const group = await prisma.ebConsumerGroup.findFirst({ where: { id: groupId, tenantId } })
    if (!group) return rep.status(404).send({ error: 'Group not found' })
    const consumer = await prisma.ebConsumer.create({
      data: { tenantId, consumerGroupId: groupId, name: body.name, callbackUrl: body.callbackUrl }
    })
    return rep.status(201).send(consumer)
  })

  // T14: list consumers in group
  app.get('/consumer-groups/:groupId/consumers', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { groupId } = req.params as any
    const consumers = await prisma.ebConsumer.findMany({ where: { consumerGroupId: groupId, tenantId } })
    return rep.send({ consumers, total: consumers.length })
  })

  // T15: update consumer offset (commit offset)
  app.post('/consumer-groups/:groupId/offsets', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { groupId } = req.params as any
    const body = req.body as any
    const group = await prisma.ebConsumerGroup.findFirst({ where: { id: groupId, tenantId } })
    if (!group) return rep.status(404).send({ error: 'Group not found' })
    const offset = await prisma.ebConsumerOffset.upsert({
      where: { consumerGroupId_partition: { consumerGroupId: groupId, partition: body.partition ?? 0 } },
      update: { offset: BigInt(body.offset), updatedAt: new Date() },
      create: { tenantId, consumerGroupId: groupId, partition: body.partition ?? 0, offset: BigInt(body.offset), updatedAt: new Date() }
    })
    return rep.send(offset)
  })

  // T16: get consumer group offsets
  app.get('/consumer-groups/:groupId/offsets', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { groupId } = req.params as any
    const offsets = await prisma.ebConsumerOffset.findMany({ where: { consumerGroupId: groupId, tenantId } })
    return rep.send({ offsets })
  })

  // T17: list messages in stream
  app.get('/streams/:streamId/messages', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { streamId } = req.params as any
    const { status, limit } = req.query as any
    const take = parseInt(limit ?? '50')
    const where: any = { tenantId, streamId }
    if (status) where.status = status
    const messages = await prisma.ebMessage.findMany({ where, orderBy: { offset: 'asc' }, take: Math.min(take, 200) })
    return rep.send({ messages, total: messages.length })
  })

  // T18: mark message as failed → dead letter
  app.post('/messages/:msgId/dead-letter', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { msgId } = req.params as any
    const body = req.body as any
    const msg = await prisma.ebMessage.findFirst({ where: { id: msgId, tenantId } })
    if (!msg) return rep.status(404).send({ error: 'Message not found' })
    await prisma.ebMessage.update({ where: { id: msgId }, data: { status: 'dead', attempts: { increment: 1 } } })
    const existing = await prisma.ebDeadLetter.findFirst({ where: { messageId: msgId } })
    if (existing) {
      const dl = await prisma.ebDeadLetter.update({ where: { id: existing.id }, data: { attempts: { increment: 1 }, reason: body.reason ?? 'Max retries exceeded' } })
      return rep.send(dl)
    }
    const dl = await prisma.ebDeadLetter.create({
      data: { tenantId, messageId: msgId, streamId: msg.streamId, reason: body.reason ?? 'Max retries exceeded', attempts: 1, payload: msg.payload as never, headers: msg.headers as never }
    })
    return rep.status(201).send(dl)
  })

  // T19: list dead letter queue
  app.get('/dead-letters', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { streamId } = req.query as any
    const where: any = { tenantId }
    if (streamId) where.streamId = streamId
    const items = await prisma.ebDeadLetter.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100, include: { message: { select: { status: true, createdAt: true } } } })
    return rep.send({ deadLetters: items, total: items.length })
  })

  // T20: replay dead letter message
  app.post('/dead-letters/:dlId/replay', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { dlId } = req.params as any
    const dl = await prisma.ebDeadLetter.findFirst({ where: { id: dlId, tenantId } })
    if (!dl) return rep.status(404).send({ error: 'Not found' })
    await prisma.ebMessage.update({ where: { id: dl.messageId }, data: { status: 'pending', attempts: 0 } })
    await prisma.ebDeadLetter.update({ where: { id: dlId }, data: { replayedAt: new Date() } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'REPLAY', module: 'event-bus', entityType: 'EbDeadLetter', entityId: dlId, newValues: {} as never } }).catch(() => null)
    return rep.send({ success: true, messageId: dl.messageId })
  })

  // T21: stream statistics
  app.get('/streams/:streamId/stats', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { streamId } = req.params as any
    const stream = await prisma.ebStream.findFirst({ where: { id: streamId, tenantId } })
    if (!stream) return rep.status(404).send({ error: 'Not found' })
    const [pending, processing, delivered, failed, dead, groups, dl] = await Promise.all([
      prisma.ebMessage.count({ where: { tenantId, streamId, status: 'pending' } }),
      prisma.ebMessage.count({ where: { tenantId, streamId, status: 'processing' } }),
      prisma.ebMessage.count({ where: { tenantId, streamId, status: 'delivered' } }),
      prisma.ebMessage.count({ where: { tenantId, streamId, status: 'failed' } }),
      prisma.ebMessage.count({ where: { tenantId, streamId, status: 'dead' } }),
      prisma.ebConsumerGroup.count({ where: { tenantId, streamId } }),
      prisma.ebDeadLetter.count({ where: { tenantId, streamId } }),
    ])
    return rep.send({ streamId, streamName: stream.name, messageCount: Number(stream.messageCount), pending, processing, delivered, failed, dead, consumerGroups: groups, deadLetterCount: dl })
  })

  // T22: overall event bus stats
  app.get('/stats', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const [streams, messages, consumerGroups, consumers, deadLetters] = await Promise.all([
      prisma.ebStream.count({ where: { tenantId } }),
      prisma.ebMessage.count({ where: { tenantId } }),
      prisma.ebConsumerGroup.count({ where: { tenantId } }),
      prisma.ebConsumer.count({ where: { tenantId } }),
      prisma.ebDeadLetter.count({ where: { tenantId } }),
    ])
    const delivered = await prisma.ebMessage.count({ where: { tenantId, status: 'delivered' } })
    const pending = await prisma.ebMessage.count({ where: { tenantId, status: 'pending' } })
    return rep.send({ streams, messages, consumerGroups, consumers, deadLetters, delivered, pending, throughputRate: messages > 0 ? Math.round((delivered / messages) * 100) : 0 })
  })

  // T23: delete consumer group
  app.delete('/consumer-groups/:groupId', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { groupId } = req.params as any
    const group = await prisma.ebConsumerGroup.findFirst({ where: { id: groupId, tenantId } })
    if (!group) return rep.status(404).send({ error: 'Not found' })
    await prisma.ebConsumerGroup.delete({ where: { id: groupId } })
    return rep.send({ success: true })
  })

  // T24: seek / reset offset
  app.post('/consumer-groups/:groupId/seek', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { groupId } = req.params as any
    const body = req.body as any
    const group = await prisma.ebConsumerGroup.findFirst({ where: { id: groupId, tenantId } })
    if (!group) return rep.status(404).send({ error: 'Not found' })
    const seekTo = body.seekTo === 'earliest' ? 0n : body.seekTo === 'latest' ? BigInt(await prisma.ebMessage.count({ where: { tenantId, streamId: group.streamId } })) : BigInt(body.offset ?? 0)
    await prisma.ebConsumerOffset.upsert({
      where: { consumerGroupId_partition: { consumerGroupId: groupId, partition: body.partition ?? 0 } },
      update: { offset: seekTo, updatedAt: new Date() },
      create: { tenantId, consumerGroupId: groupId, partition: body.partition ?? 0, offset: seekTo, updatedAt: new Date() }
    })
    return rep.send({ success: true, seekedTo: Number(seekTo) })
  })

  // T25: delete consumer
  app.delete('/consumers/:consumerId', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { consumerId } = req.params as any
    const consumer = await prisma.ebConsumer.findFirst({ where: { id: consumerId, tenantId } })
    if (!consumer) return rep.status(404).send({ error: 'Not found' })
    await prisma.ebConsumer.delete({ where: { id: consumerId } })
    return rep.send({ success: true })
  })

  // T26: replay messages from offset
  app.post('/streams/:streamId/replay', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { streamId } = req.params as any
    const body = req.body as any
    const fromOffset = BigInt(body.fromOffset ?? 0)
    const toOffset = body.toOffset !== undefined ? BigInt(body.toOffset) : undefined
    const where: any = { tenantId, streamId, offset: { gte: fromOffset } }
    if (toOffset !== undefined) where.offset.lte = toOffset
    const count = await prisma.ebMessage.updateMany({ where: { ...where, status: { in: ['delivered', 'dead'] } }, data: { status: 'pending', attempts: 0 } })
    return rep.send({ replayed: count.count })
  })

  // T27: pause / resume stream
  app.post('/streams/:streamId/toggle', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { streamId } = req.params as any
    const stream = await prisma.ebStream.findFirst({ where: { id: streamId, tenantId } })
    if (!stream) return rep.status(404).send({ error: 'Not found' })
    const updated = await prisma.ebStream.update({ where: { id: streamId }, data: { isActive: !stream.isActive } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: updated.isActive ? 'RESUME' : 'PAUSE', module: 'event-bus', entityType: 'EbStream', entityId: streamId, newValues: { isActive: updated.isActive } as never } }).catch(() => null)
    return rep.send({ isActive: updated.isActive, streamId })
  })

  // T28: purge stream messages
  app.delete('/streams/:streamId/messages', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { streamId } = req.params as any
    const stream = await prisma.ebStream.findFirst({ where: { id: streamId, tenantId } })
    if (!stream) return rep.status(404).send({ error: 'Not found' })
    const deleted = await prisma.ebMessage.deleteMany({ where: { tenantId, streamId, status: 'delivered' } })
    await prisma.ebStream.update({ where: { id: streamId }, data: { messageCount: { decrement: BigInt(deleted.count) } } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'PURGE', module: 'event-bus', entityType: 'EbStream', entityId: streamId, newValues: { deleted: deleted.count } as never } }).catch(() => null)
    return rep.send({ success: true, purged: deleted.count })
  })
}
