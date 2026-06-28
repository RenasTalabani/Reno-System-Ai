import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { eventBus } from '@reno/events'

// Server-Sent Events — real-time stream per authenticated tenant
export async function sseRoutes(app: FastifyInstance) {

  // GET /v1/events/stream — SSE endpoint for live events
  app.get('/stream', {
    preHandler: requireAuth as any,
  }, async (request, reply) => {
    const { tenantId, userId } = request as any

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    })

    const send = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    }

    // heartbeat every 25s to keep connection alive through proxies
    const heartbeat = setInterval(() => {
      reply.raw.write(': heartbeat\n\n')
    }, 25000)

    // send connected confirmation
    send('connected', { tenantId, userId, ts: new Date().toISOString() })

    // subscribe to tenant events
    const unsubscribe = eventBus.subscribe(`${tenantId}:*` as any, (event: any) => {
      send(event.type ?? 'event', event)
    })

    // also subscribe to wildcard for all tenant events
    const wildcardHandler = (event: any) => {
      if (event.tenantId === tenantId) {
        send(event.type ?? 'event', event)
      }
    }
    eventBus.on('*', wildcardHandler)

    request.raw.on('close', () => {
      clearInterval(heartbeat)
      unsubscribe()
      eventBus.off('*', wildcardHandler)
      reply.raw.end()
    })

    // keep the request open
    await new Promise<void>((resolve) => {
      request.raw.on('close', resolve)
      request.raw.on('error', resolve)
    })
  })

  // GET /v1/events/recent — last 50 events for current tenant (from audit log)
  app.get('/recent', {
    preHandler: requireAuth as any,
  }, async (request, reply) => {
    const { tenantId } = request as any
    const { prisma } = await import('@reno/database')
    const logs = await prisma.sysAuditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, action: true, module: true, entityType: true,
        entityId: true, createdAt: true, userId: true,
        newValues: true,
      },
    })
    reply.send({ ok: true, data: logs })
  })
}
