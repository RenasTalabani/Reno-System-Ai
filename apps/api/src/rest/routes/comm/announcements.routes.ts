import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function commAnnouncementRoutes(app: FastifyInstance) {
  // GET /comm/announcements
  app.get('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { teamId, page = 1, limit = 25 } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = { tenantId, deletedAt: null, isActive: true }
    if (teamId) where.teamId = teamId

    const [announcements, total] = await Promise.all([
      prisma.commAnnouncement.findMany({
        where,
        include: {
          _count: { select: { reads: true } },
          reads: { where: { userId }, take: 1 },
          team: { select: { id: true, name: true } },
        },
        orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
        skip, take: Number(limit),
      }),
      prisma.commAnnouncement.count({ where }),
    ])

    return reply.send({ success: true, data: announcements, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  // POST /comm/announcements
  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { title, content, teamId, priority, isPinned, scheduledAt, expiresAt } = req.body as any
    if (!title || !content) return reply.code(400).send({ success: false, error: 'title and content required' })

    const announcement = await prisma.commAnnouncement.create({
      data: {
        tenantId, title, content, teamId,
        authorId: userId, priority: priority ?? 'normal',
        isPinned: isPinned ?? false,
        publishedAt: scheduledAt ? undefined : new Date(),
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        createdBy: userId,
      },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'comm', entityType: 'CommAnnouncement', entityId: announcement.id, newValues: { title } } })
    return reply.code(201).send({ success: true, data: announcement })
  })

  // GET /comm/announcements/:id
  app.get('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const announcement = await prisma.commAnnouncement.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        _count: { select: { reads: true } },
        reads: { where: { userId }, take: 1 },
        team: { select: { id: true, name: true } },
      },
    })
    if (!announcement) return reply.code(404).send({ success: false, error: 'Announcement not found' })
    return reply.send({ success: true, data: announcement })
  })

  // PUT /comm/announcements/:id
  app.put('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { title, content, priority, isPinned, expiresAt } = req.body as any
    const updated = await prisma.commAnnouncement.update({
      where: { id },
      data: { title, content, priority, isPinned, expiresAt: expiresAt ? new Date(expiresAt) : undefined },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE', module: 'comm', entityType: 'CommAnnouncement', entityId: id, newValues: req.body as any } })
    return reply.send({ success: true, data: updated })
  })

  // DELETE /comm/announcements/:id
  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    await prisma.commAnnouncement.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'DELETE', module: 'comm', entityType: 'CommAnnouncement', entityId: id, newValues: {} } })
    return reply.send({ success: true, data: { deleted: true } })
  })

  // POST /comm/announcements/:id/read
  app.post('/:id/read', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    await prisma.commAnnouncementRead.upsert({
      where: { announcementId_userId: { announcementId: id, userId } },
      create: { tenantId, announcementId: id, userId },
      update: { readAt: new Date() },
    })
    return reply.send({ success: true, data: { read: true } })
  })
}
