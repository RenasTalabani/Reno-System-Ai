import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse } from '@reno/core'
import { requireAuth } from '../middleware/auth.js'

export async function auditRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/', async (request, reply) => {
    const query = request.query as {
      module?: string
      entityType?: string
      entityId?: string
      userId?: string
      from?: string
      to?: string
      limit?: string
      cursor?: string
    }

    const limit = Math.min(parseInt(query.limit ?? '50', 10), 200)

    const logs = await prisma.sysAuditLog.findMany({
      where: {
        tenantId: request.tenantId,
        ...(query.module && { module: query.module }),
        ...(query.entityType && { entityType: query.entityType }),
        ...(query.entityId && { entityId: query.entityId }),
        ...(query.userId && { userId: query.userId }),
        ...(query.from || query.to
          ? {
              occurredAt: {
                ...(query.from && { gte: new Date(query.from) }),
                ...(query.to && { lte: new Date(query.to) }),
              },
            }
          : {}),
      },
      include: {
        // Include user info
      },
      take: limit + 1,
      orderBy: { occurredAt: 'desc' },
    })

    const hasMore = logs.length > limit
    const nodes = hasMore ? logs.slice(0, -1) : logs

    return reply.send(buildSuccessResponse(nodes, {
      pagination: {
        total: nodes.length,
        page: 1,
        perPage: limit,
        totalPages: 1,
        nextCursor: hasMore ? nodes[nodes.length - 1]?.id : null,
      },
    }))
  })
}
