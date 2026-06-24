import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function commDashboardRoutes(app: FastifyInstance) {
  // GET /comm/dashboard
  app.get('/', async (req, reply) => {
    const { tenantId, userId } = req as any

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(today.getTime() + 86400000)

    const [
      totalChannels, totalTeams, totalMessages, messagestoday,
      upcomingMeetings, activeMeetings, recentAnnouncements,
      myChannels, unreadMentions,
    ] = await Promise.all([
      prisma.commChannel.count({ where: { tenantId, deletedAt: null, isArchived: false } }),
      prisma.commTeam.count({ where: { tenantId, deletedAt: null } }),
      prisma.commMessage.count({ where: { tenantId, deletedAt: null } }),
      prisma.commMessage.count({ where: { tenantId, deletedAt: null, createdAt: { gte: today, lt: todayEnd } } }),
      prisma.commMeeting.findMany({
        where: { tenantId, deletedAt: null, status: 'scheduled', scheduledAt: { gte: now } },
        include: { _count: { select: { participants: true } } },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
      }),
      prisma.commMeeting.count({ where: { tenantId, status: 'active' } }),
      prisma.commAnnouncement.findMany({
        where: { tenantId, deletedAt: null, isActive: true },
        include: { reads: { where: { userId }, take: 1 }, _count: { select: { reads: true } } },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        take: 5,
      }),
      prisma.commChannelMember.findMany({
        where: { tenantId, userId, leftAt: null },
        include: { channel: { select: { id: true, name: true, lastMessageAt: true, messageCount: true } } },
        orderBy: { channel: { lastMessageAt: 'desc' } },
        take: 10,
      }),
      prisma.commMention.count({ where: { tenantId, mentionedUserId: userId, isRead: false } }),
    ])

    return reply.send({
      success: true,
      data: {
        summary: { totalChannels, totalTeams, totalMessages, messagestoday, activeMeetings, unreadMentions },
        upcomingMeetings,
        recentAnnouncements,
        myChannels,
      },
    })
  })

  // GET /comm/dashboard/mentions — unread mentions for current user
  app.get('/mentions', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { page = 1, limit = 25 } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const [mentions, total] = await Promise.all([
      prisma.commMention.findMany({
        where: { tenantId, mentionedUserId: userId, isRead: false },
        include: { message: { include: { channel: { select: { id: true, name: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip, take: Number(limit),
      }),
      prisma.commMention.count({ where: { tenantId, mentionedUserId: userId, isRead: false } }),
    ])

    return reply.send({ success: true, data: mentions, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  // POST /comm/dashboard/mentions/read-all
  app.post('/mentions/read-all', async (req, reply) => {
    const { tenantId, userId } = req as any
    await prisma.commMention.updateMany({
      where: { tenantId, mentionedUserId: userId, isRead: false },
      data: { isRead: true },
    })
    return reply.send({ success: true, data: { marked: true } })
  })
}
