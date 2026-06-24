import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function commPresenceRoutes(app: FastifyInstance) {
  // GET /comm/presence — all users' presence for tenant
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const presences = await prisma.commPresence.findMany({ where: { tenantId } })
    return reply.send({ success: true, data: presences })
  })

  // PUT /comm/presence — update my status
  app.put('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { status, statusMessage } = req.body as any
    const validStatuses = ['online', 'away', 'busy', 'offline', 'do_not_disturb']
    if (status && !validStatuses.includes(status)) {
      return reply.code(400).send({ success: false, error: `status must be one of: ${validStatuses.join(', ')}` })
    }

    const presence = await prisma.commPresence.upsert({
      where: { tenantId_userId: { tenantId, userId } },
      create: { tenantId, userId, status: status ?? 'online', statusMessage, lastSeenAt: new Date() },
      update: { status: status ?? 'online', statusMessage, lastSeenAt: new Date() },
    })
    return reply.send({ success: true, data: presence })
  })

  // GET /comm/presence/:userId
  app.get('/:userId', async (req, reply) => {
    const { tenantId } = req as any
    const { userId } = req.params as any
    const presence = await prisma.commPresence.findUnique({ where: { tenantId_userId: { tenantId, userId } } })
    return reply.send({ success: true, data: presence ?? { userId, status: 'offline' } })
  })
}
