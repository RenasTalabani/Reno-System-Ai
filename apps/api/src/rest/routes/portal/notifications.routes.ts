import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function portalNotificationRoutes(app: FastifyInstance) {
  // GET /portal/notifications — list my notifications
  app.get('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { isRead, page = 1, limit = 20 } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = { tenantId, userId }
    if (isRead !== undefined) where.isRead = isRead === 'true'

    const [notifications, total, unread] = await Promise.all([
      prisma.portalNotification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: Number(limit) }),
      prisma.portalNotification.count({ where }),
      prisma.portalNotification.count({ where: { tenantId, userId, isRead: false } }),
    ])

    return reply.send({
      success: true,
      data: notifications,
      meta: { pagination: { total, page: Number(page), limit: Number(limit) }, unread },
    })
  })

  // PATCH /portal/notifications/:id/read — mark single notification as read
  app.patch('/:id/read', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any

    await prisma.portalNotification.updateMany({
      where: { id, tenantId, userId },
      data: { isRead: true, readAt: new Date() },
    })

    return reply.send({ success: true, data: { read: true } })
  })

  // POST /portal/notifications/read-all — mark all as read
  app.post('/read-all', async (req, reply) => {
    const { tenantId, userId } = req as any

    const result = await prisma.portalNotification.updateMany({
      where: { tenantId, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    })

    return reply.send({ success: true, data: { updated: result.count } })
  })
}
