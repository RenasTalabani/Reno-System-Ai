import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { randomBytes } from 'crypto'

function generateRoomToken() {
  return randomBytes(24).toString('hex')
}

export async function commMeetingRoutes(app: FastifyInstance) {
  // GET /comm/meetings
  app.get('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { status, page = 1, limit = 25 } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = { tenantId, deletedAt: null }
    if (status) where.status = status

    const [meetings, total] = await Promise.all([
      prisma.commMeeting.findMany({
        where,
        include: { _count: { select: { participants: true } }, channel: { select: { id: true, name: true } } },
        orderBy: [{ scheduledAt: 'desc' }, { createdAt: 'desc' }],
        skip, take: Number(limit),
      }),
      prisma.commMeeting.count({ where }),
    ])

    return reply.send({ success: true, data: meetings, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  // POST /comm/meetings — create/schedule meeting
  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { title, description, agenda, channelId, type, scheduledAt, maxParticipants, relatedEntityType, relatedEntityId } = req.body as any
    if (!title) return reply.code(400).send({ success: false, error: 'title required' })

    const roomToken = generateRoomToken()

    const meeting = await prisma.commMeeting.create({
      data: {
        tenantId, title, description, agenda, channelId,
        organizerId: userId, type: type ?? 'scheduled',
        status: 'scheduled',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        maxParticipants, roomToken, relatedEntityType, relatedEntityId,
        createdBy: userId,
      },
    })

    await prisma.commMeetingParticipant.create({ data: { tenantId, meetingId: meeting.id, userId, role: 'host' } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'comm', entityType: 'CommMeeting', entityId: meeting.id, newValues: { title, type } } })

    return reply.code(201).send({ success: true, data: meeting })
  })

  // GET /comm/meetings/:id
  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const meeting = await prisma.commMeeting.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        participants: true,
        channel: { select: { id: true, name: true } },
        _count: { select: { participants: true } },
      },
    })
    if (!meeting) return reply.code(404).send({ success: false, error: 'Meeting not found' })
    return reply.send({ success: true, data: meeting })
  })

  // PUT /comm/meetings/:id
  app.put('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { title, description, agenda, scheduledAt, maxParticipants, status } = req.body as any

    const meeting = await prisma.commMeeting.update({
      where: { id },
      data: {
        title, description, agenda, status,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        maxParticipants, updatedBy: userId,
      },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE', module: 'comm', entityType: 'CommMeeting', entityId: id, newValues: req.body as any } })
    return reply.send({ success: true, data: meeting })
  })

  // DELETE /comm/meetings/:id
  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    await prisma.commMeeting.update({ where: { id }, data: { deletedAt: new Date(), status: 'cancelled', isActive: false } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'DELETE', module: 'comm', entityType: 'CommMeeting', entityId: id, newValues: {} } })
    return reply.send({ success: true, data: { cancelled: true } })
  })

  // POST /comm/meetings/:id/start
  app.post('/:id/start', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const meeting = await prisma.commMeeting.update({
      where: { id },
      data: { status: 'active', startedAt: new Date() },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE', module: 'comm', entityType: 'CommMeeting', entityId: id, newValues: { status: 'active' } } })
    return reply.send({ success: true, data: meeting })
  })

  // POST /comm/meetings/:id/end
  app.post('/:id/end', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { aiSummary, aiActionItems, aiTranscript } = req.body as any ?? {}

    const meeting = await prisma.commMeeting.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!meeting) return reply.code(404).send({ success: false, error: 'Meeting not found' })

    const endedAt = new Date()
    const durationMinutes = meeting.startedAt ? Math.round((endedAt.getTime() - meeting.startedAt.getTime()) / 60000) : null

    const updated = await prisma.commMeeting.update({
      where: { id },
      data: { status: 'ended', endedAt, durationMinutes, aiSummary, aiActionItems, aiTranscript },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE', module: 'comm', entityType: 'CommMeeting', entityId: id, newValues: { status: 'ended', durationMinutes } } })
    return reply.send({ success: true, data: updated })
  })

  // POST /comm/meetings/:id/join
  app.post('/:id/join', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { hasVideo, hasAudio } = req.body as any ?? {}

    const participant = await prisma.commMeetingParticipant.upsert({
      where: { meetingId_userId: { meetingId: id, userId } },
      create: { tenantId, meetingId: id, userId, role: 'participant', joinedAt: new Date(), hasVideo: hasVideo ?? false, hasAudio: hasAudio ?? true },
      update: { joinedAt: new Date(), leftAt: null, hasVideo: hasVideo ?? false, hasAudio: hasAudio ?? true },
    })
    return reply.send({ success: true, data: participant })
  })

  // POST /comm/meetings/:id/leave
  app.post('/:id/leave', async (req, reply) => {
    const { userId } = req as any
    const { id } = req.params as any
    await prisma.commMeetingParticipant.updateMany({
      where: { meetingId: id, userId },
      data: { leftAt: new Date() },
    })
    return reply.send({ success: true, data: { left: true } })
  })

  // GET /comm/meetings/:id/participants
  app.get('/:id/participants', async (req, reply) => {
    const { id } = req.params as any
    const participants = await prisma.commMeetingParticipant.findMany({
      where: { meetingId: id },
      orderBy: { joinedAt: 'asc' },
    })
    return reply.send({ success: true, data: participants })
  })

  // PUT /comm/meetings/:id/ai-summary
  app.put('/:id/ai-summary', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { aiSummary, aiActionItems, aiTranscript } = req.body as any
    const updated = await prisma.commMeeting.update({ where: { id }, data: { aiSummary, aiActionItems, aiTranscript } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE', module: 'comm', entityType: 'CommMeeting', entityId: id, newValues: { aiSummary } } })
    return reply.send({ success: true, data: updated })
  })
}
