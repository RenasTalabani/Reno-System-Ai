import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

export async function evsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Append Event ───────────────────────────────────────────────────────────

  app.post('/append', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any
    // Get next version for aggregate
    const lastEvent = await prisma.evsEvent.findFirst({ where: { tenantId, aggregateId: body.aggregateId }, orderBy: { version: 'desc' }, select: { version: true } })
    const version = (lastEvent?.version ?? 0) + 1
    const event = await prisma.evsEvent.create({
      data: { tenantId, stream: body.stream ?? `${body.aggregateType}-${body.aggregateId}`, type: body.type, aggregateId: body.aggregateId, aggregateType: body.aggregateType, version, payload: body.payload ?? {}, metadata: body.metadata ?? {}, actorId: body.actorId ?? userId, actorType: body.actorType ?? 'user' },
    })
    return reply.status(201).send(buildSuccessResponse(event))
  })

  // ── Read Aggregate Stream ──────────────────────────────────────────────────

  app.get('/stream/:aggregateId', async (request, reply) => {
    const { tenantId } = request as any
    const { aggregateId } = request.params as any
    const q = request.query as any
    const fromVersion = parseInt(q.fromVersion ?? '1')
    // Try snapshot first
    const snapshot = await prisma.evsSnapshot.findFirst({ where: { tenantId, aggregateId, version: { lte: fromVersion } }, orderBy: { version: 'desc' } })
    const fromV = snapshot ? snapshot.version + 1 : fromVersion
    const events = await prisma.evsEvent.findMany({ where: { tenantId, aggregateId, version: { gte: fromV } }, orderBy: { version: 'asc' } })
    return reply.send(buildSuccessResponse({ snapshot: snapshot ?? null, events }))
  })

  // ── Query Events ───────────────────────────────────────────────────────────

  app.get('/events', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const where: any = { tenantId }
    if (q.type) where.type = q.type
    if (q.aggregateType) where.aggregateType = q.aggregateType
    if (q.stream) where.stream = q.stream
    if (q.actorId) where.actorId = q.actorId
    if (q.since) where.occurredAt = { gte: new Date(q.since) }
    const events = await prisma.evsEvent.findMany({ where, orderBy: { occurredAt: 'desc' }, take: parseInt(q.limit ?? '100') })
    return reply.send(buildSuccessResponse(events))
  })

  // ── Snapshots ──────────────────────────────────────────────────────────────

  app.post('/snapshots', async (request, reply) => {
    const { tenantId } = request as any
    const body = request.body as any
    const snapshot = await prisma.evsSnapshot.upsert({
      where: { tenantId_aggregateId_version: { tenantId, aggregateId: body.aggregateId, version: body.version } },
      create: { tenantId, aggregateId: body.aggregateId, aggregateType: body.aggregateType, version: body.version, state: body.state },
      update: { state: body.state },
    })
    return reply.send(buildSuccessResponse(snapshot))
  })

  // ── Projections ────────────────────────────────────────────────────────────

  app.get('/projections', async (request, reply) => {
    const { tenantId } = request as any
    const projections = await prisma.evsProjection.findMany({ where: { tenantId }, orderBy: { name: 'asc' } })
    return reply.send(buildSuccessResponse(projections))
  })

  app.post('/projections', async (request, reply) => {
    const { tenantId } = request as any
    const body = request.body as any
    const proj = await prisma.evsProjection.upsert({
      where: { tenantId_name: { tenantId, name: body.name } },
      create: { tenantId, name: body.name, stream: body.stream },
      update: { stream: body.stream, status: 'active', error: null },
    })
    return reply.send(buildSuccessResponse(proj))
  })

  app.patch('/projections/:name/checkpoint', async (request, reply) => {
    const { tenantId } = request as any
    const { name } = request.params as any
    const { lastEvent, checkpoint } = request.body as any
    await prisma.evsProjection.updateMany({ where: { tenantId, name }, data: { lastEvent, checkpoint: checkpoint ? new Date(checkpoint) : new Date() } })
    return reply.send(buildSuccessResponse({ updated: true }))
  })

  // ── Timeline (audit view) ──────────────────────────────────────────────────

  app.get('/timeline', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const since = q.since ? new Date(q.since) : new Date(Date.now() - 24 * 3600 * 1000)
    const [events, byType, byActor] = await Promise.all([
      prisma.evsEvent.findMany({ where: { tenantId, occurredAt: { gte: since } }, orderBy: { occurredAt: 'desc' }, take: 50 }),
      prisma.evsEvent.groupBy({ by: ['type'], where: { tenantId, occurredAt: { gte: since } }, _count: { type: true }, orderBy: { _count: { type: 'desc' } }, take: 10 }),
      prisma.evsEvent.groupBy({ by: ['actorId'], where: { tenantId, occurredAt: { gte: since } }, _count: { actorId: true }, orderBy: { _count: { actorId: 'desc' } }, take: 5 }),
    ])
    return reply.send(buildSuccessResponse({ events, byType, byActor, totalEvents: events.length }))
  })
}
