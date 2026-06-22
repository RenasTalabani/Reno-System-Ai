import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse } from '@reno/core'
import { requireAuth } from '../middleware/auth.js'

export async function notificationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // GET /notifications
  app.get('/', async (request, reply) => {
    const { tenantId, userId } = request as any
    const query = request.query as any
    const unreadOnly = query.unread === 'true'

    const where = {
      tenantId,
      userId,
      deletedAt: null,
      ...(unreadOnly ? { readAt: null } : {}),
    }

    const [total, notifications] = await Promise.all([
      prisma.sysNotification.count({ where }),
      prisma.sysNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ])

    return reply.send(buildSuccessResponse(notifications, { total }))
  })

  // PATCH /notifications/:id/read
  app.patch('/:id/read', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any

    const notification = await prisma.sysNotification.findFirst({
      where: { id, tenantId, userId, deletedAt: null },
    })

    if (!notification) {
      return reply.status(404).send({ success: false, error: { message: 'Not found' } })
    }

    await prisma.sysNotification.update({
      where: { id },
      data: { readAt: new Date() },
    })

    return reply.send(buildSuccessResponse({ id }))
  })

  // PATCH /notifications/read-all
  app.patch('/read-all', async (request, reply) => {
    const { tenantId, userId } = request as any

    await prisma.sysNotification.updateMany({
      where: { tenantId, userId, readAt: null, deletedAt: null },
      data: { readAt: new Date() },
    })

    return reply.send(buildSuccessResponse({ ok: true }))
  })
}
