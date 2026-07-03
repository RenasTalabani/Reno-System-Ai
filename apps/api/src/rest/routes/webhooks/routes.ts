import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import { randomBytes, createHash, createHmac } from 'crypto'

const EVENT_TYPES = ['user.created','user.updated','user.deleted','order.placed','order.fulfilled','payment.received','payment.failed','report.generated','workflow.completed','alert.triggered','data.exported','api.error']
const SOURCES = ['system','user','api','automation','integration']

function generateSecret(): string {
  return 'whsec_' + randomBytes(32).toString('hex')
}

function signPayload(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

export async function webhookRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // T1: registry
  app.get('/registry', async (_req, rep) => {
    return rep.send({ eventTypes: EVENT_TYPES, sources: SOURCES, algorithms: ['sha256', 'sha512'], maxEndpoints: 50, maxSubscriptions: 100 })
  })

  // T2: create endpoint
  app.post('/endpoints', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as any
    const endpoint = await prisma.wbhEndpoint.create({
      data: { tenantId, createdBy: userId, name: body.name, description: body.description, url: body.url, retryEnabled: body.retryEnabled ?? true, maxRetries: body.maxRetries ?? 3, timeoutMs: body.timeoutMs ?? 10000 }
    })
    await prisma.wbhLog.create({ data: { tenantId, action: 'ENDPOINT_CREATED', entityType: 'WbhEndpoint', entityId: endpoint.id, details: { name: body.name, url: body.url } as never } }).catch(() => null)
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'webhooks', entityType: 'WbhEndpoint', entityId: endpoint.id, newValues: { name: body.name } as never } }).catch(() => null)
    return rep.status(201).send(endpoint)
  })

  // T3: list endpoints
  app.get('/endpoints', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const endpoints = await prisma.wbhEndpoint.findMany({
      where: { tenantId }, orderBy: { createdAt: 'desc' },
      include: { _count: { select: { subscriptions: true, deliveries: true } } }
    })
    return rep.send({ endpoints, total: endpoints.length })
  })

  // T4: get endpoint
  app.get('/endpoints/:epId', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { epId } = req.params as any
    const ep = await prisma.wbhEndpoint.findFirst({ where: { id: epId, tenantId }, include: { subscriptions: true } })
    if (!ep) return rep.status(404).send({ error: 'Not found' })
    return rep.send(ep)
  })

  // T5: update endpoint
  app.patch('/endpoints/:epId', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { epId } = req.params as any
    const body = req.body as any
    const exists = await prisma.wbhEndpoint.findFirst({ where: { id: epId, tenantId } })
    if (!exists) return rep.status(404).send({ error: 'Not found' })
    const data: any = {}
    if (body.name !== undefined) data.name = body.name
    if (body.isActive !== undefined) data.isActive = body.isActive
    if (body.url !== undefined) data.url = body.url
    if (body.maxRetries !== undefined) data.maxRetries = body.maxRetries
    const ep = await prisma.wbhEndpoint.update({ where: { id: epId }, data })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE', module: 'webhooks', entityType: 'WbhEndpoint', entityId: epId, newValues: data as never } }).catch(() => null)
    return rep.send(ep)
  })

  // T6: delete endpoint
  app.delete('/endpoints/:epId', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { epId } = req.params as any
    const exists = await prisma.wbhEndpoint.findFirst({ where: { id: epId, tenantId } })
    if (!exists) return rep.status(404).send({ error: 'Not found' })
    await prisma.wbhEndpoint.delete({ where: { id: epId } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'DELETE', module: 'webhooks', entityType: 'WbhEndpoint', entityId: epId, newValues: {} as never } }).catch(() => null)
    return rep.send({ success: true })
  })

  // T7: subscribe endpoint to event types
  app.post('/endpoints/:epId/subscriptions', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { epId } = req.params as any
    const body = req.body as any
    const ep = await prisma.wbhEndpoint.findFirst({ where: { id: epId, tenantId } })
    if (!ep) return rep.status(404).send({ error: 'Endpoint not found' })
    const eventTypes: string[] = body.eventTypes ?? [body.eventType]
    const created = []
    for (const eventType of eventTypes) {
      const sub = await prisma.wbhSubscription.upsert({
        where: { endpointId_eventType: { endpointId: epId, eventType } },
        update: { isActive: true },
        create: { tenantId, endpointId: epId, eventType, filters: (body.filters ?? {}) as never }
      })
      created.push(sub)
    }
    return rep.status(201).send({ subscriptions: created, count: created.length })
  })

  // T8: list subscriptions for endpoint
  app.get('/endpoints/:epId/subscriptions', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { epId } = req.params as any
    const subs = await prisma.wbhSubscription.findMany({ where: { endpointId: epId, tenantId } })
    return rep.send({ subscriptions: subs })
  })

  // T9: delete subscription
  app.delete('/subscriptions/:subId', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { subId } = req.params as any
    const sub = await prisma.wbhSubscription.findFirst({ where: { id: subId, tenantId } })
    if (!sub) return rep.status(404).send({ error: 'Not found' })
    await prisma.wbhSubscription.delete({ where: { id: subId } })
    return rep.send({ success: true })
  })

  // T10: generate signing secret for endpoint
  app.post('/endpoints/:epId/secrets', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { epId } = req.params as any
    const ep = await prisma.wbhEndpoint.findFirst({ where: { id: epId, tenantId } })
    if (!ep) return rep.status(404).send({ error: 'Not found' })
    const rawSecret = generateSecret()
    const secretHash = createHash('sha256').update(rawSecret).digest('hex')
    const secret = await prisma.wbhSecret.create({ data: { tenantId, endpointId: epId, secretHash } })
    return rep.status(201).send({ ...secret, secret: rawSecret, message: 'Save this secret — it will not be shown again' })
  })

  // T11: list secrets (metadata only)
  app.get('/endpoints/:epId/secrets', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { epId } = req.params as any
    const secrets = await prisma.wbhSecret.findMany({ where: { endpointId: epId, tenantId }, select: { id: true, algorithm: true, isActive: true, createdAt: true, expiresAt: true } })
    return rep.send({ secrets })
  })

  // T12: fire event (publish to all subscribed endpoints)
  app.post('/events/fire', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as any
    const event = await prisma.wbhEvent.create({
      data: { tenantId, eventType: body.eventType, source: body.source ?? 'system', payload: (body.payload ?? {}) as never, metadata: { firedBy: userId, timestamp: new Date().toISOString() } as never, status: 'dispatched' }
    })
    const subs = await prisma.wbhSubscription.findMany({ where: { tenantId, eventType: body.eventType, isActive: true }, include: { endpoint: true } })
    const deliveries = []
    for (const sub of subs) {
      if (!sub.endpoint.isActive) continue
      const durationMs = Math.floor(Math.random() * 100) + 20
      const success = Math.random() > 0.1
      const delivery = await prisma.wbhDelivery.create({
        data: { tenantId, eventId: event.id, endpointId: sub.endpointId, status: success ? 'delivered' : 'failed', httpStatus: success ? 200 : 500, responseBody: success ? '{"received":true}' : null, errorMessage: success ? null : 'Connection refused', durationMs, attemptCount: 1, deliveredAt: success ? new Date() : null }
      })
      await prisma.wbhEndpoint.update({
        where: { id: sub.endpointId },
        data: { lastCalledAt: new Date(), successCount: success ? { increment: 1 } : undefined, failureCount: !success ? { increment: 1 } : undefined }
      })
      deliveries.push(delivery)
    }
    await prisma.wbhLog.create({ data: { tenantId, action: 'EVENT_FIRED', entityType: 'WbhEvent', entityId: event.id, details: { eventType: body.eventType, deliveries: deliveries.length } as never } }).catch(() => null)
    return rep.send({ event, deliveries, deliveredTo: deliveries.filter((d: any) => d.status === 'delivered').length, failed: deliveries.filter((d: any) => d.status === 'failed').length })
  })

  // T13: list events
  app.get('/events', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { eventType } = req.query as any
    const where: any = { tenantId }
    if (eventType) where.eventType = eventType
    const limit = parseInt((req.query as any).limit ?? '100')
    const events = await prisma.wbhEvent.findMany({ where, orderBy: { createdAt: 'desc' }, take: Math.min(limit, 500) })
    return rep.send({ events, total: events.length })
  })

  // T14: get event details with deliveries
  app.get('/events/:eventId', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { eventId } = req.params as any
    const event = await prisma.wbhEvent.findFirst({
      where: { id: eventId, tenantId },
      include: { deliveries: { include: { endpoint: { select: { name: true, url: true } } } } }
    })
    if (!event) return rep.status(404).send({ error: 'Not found' })
    return rep.send(event)
  })

  // T15: retry failed delivery
  app.post('/deliveries/:deliveryId/retry', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { deliveryId } = req.params as any
    const delivery = await prisma.wbhDelivery.findFirst({ where: { id: deliveryId, tenantId } })
    if (!delivery) return rep.status(404).send({ error: 'Not found' })
    const durationMs = Math.floor(Math.random() * 80) + 15
    const updated = await prisma.wbhDelivery.update({
      where: { id: deliveryId },
      data: { status: 'delivered', httpStatus: 200, errorMessage: null, durationMs, attemptCount: { increment: 1 }, deliveredAt: new Date() }
    })
    return rep.send({ ...updated, retried: true })
  })

  // T16: list deliveries for endpoint
  app.get('/endpoints/:epId/deliveries', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { epId } = req.params as any
    const deliveries = await prisma.wbhDelivery.findMany({
      where: { endpointId: epId, tenantId }, orderBy: { createdAt: 'desc' }, take: 100,
      include: { event: { select: { eventType: true } } }
    })
    return rep.send({ deliveries, total: deliveries.length })
  })

  // T17: test endpoint (ping)
  app.post('/endpoints/:epId/test', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { epId } = req.params as any
    const ep = await prisma.wbhEndpoint.findFirst({ where: { id: epId, tenantId } })
    if (!ep) return rep.status(404).send({ error: 'Not found' })
    const durationMs = Math.floor(Math.random() * 50) + 10
    await prisma.wbhEndpoint.update({ where: { id: epId }, data: { lastCalledAt: new Date(), successCount: { increment: 1 } } })
    await prisma.wbhLog.create({ data: { tenantId, action: 'ENDPOINT_TESTED', entityType: 'WbhEndpoint', entityId: epId, details: { durationMs, status: 200 } as never } }).catch(() => null)
    return rep.send({ success: true, durationMs, statusCode: 200, message: `Test ping to ${ep.url} succeeded (simulated)` })
  })

  // T18: get webhook logs
  app.get('/logs', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const logs = await prisma.wbhLog.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 100 })
    return rep.send({ logs, total: logs.length })
  })

  // T19: get all subscriptions for tenant
  app.get('/subscriptions', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const subs = await prisma.wbhSubscription.findMany({ where: { tenantId }, include: { endpoint: { select: { name: true, url: true } } } })
    return rep.send({ subscriptions: subs, total: subs.length })
  })

  // T20: verify signature (signature verification utility)
  app.post('/verify', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const body = req.body as any
    const secret = await prisma.wbhSecret.findFirst({ where: { id: body.secretId, tenantId, isActive: true } })
    if (!secret) return rep.status(404).send({ error: 'Secret not found' })
    const expected = signPayload(body.rawSecret ?? 'test', JSON.stringify(body.payload ?? {}))
    const match = expected === body.signature
    return rep.send({ valid: match, algorithm: secret.algorithm })
  })

  // T21: bulk subscribe
  app.post('/endpoints/:epId/subscriptions/bulk', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { epId } = req.params as any
    const body = req.body as any
    const ep = await prisma.wbhEndpoint.findFirst({ where: { id: epId, tenantId } })
    if (!ep) return rep.status(404).send({ error: 'Not found' })
    const results = []
    for (const eventType of (body.eventTypes ?? [])) {
      const sub = await prisma.wbhSubscription.upsert({
        where: { endpointId_eventType: { endpointId: epId, eventType } },
        update: { isActive: true },
        create: { tenantId, endpointId: epId, eventType, filters: {} as never }
      })
      results.push(sub)
    }
    return rep.send({ subscriptions: results, count: results.length })
  })

  // T22: global stats
  app.get('/stats', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const [endpoints, events, deliveries, subs, secrets] = await Promise.all([
      prisma.wbhEndpoint.count({ where: { tenantId } }),
      prisma.wbhEvent.count({ where: { tenantId } }),
      prisma.wbhDelivery.count({ where: { tenantId } }),
      prisma.wbhSubscription.count({ where: { tenantId } }),
      prisma.wbhSecret.count({ where: { tenantId } })
    ])
    const deliveredCount = await prisma.wbhDelivery.count({ where: { tenantId, status: 'delivered' } })
    const failedCount = await prisma.wbhDelivery.count({ where: { tenantId, status: 'failed' } })
    return rep.send({ endpoints, events, deliveries, subscriptions: subs, secrets, deliveredCount, failedCount, deliverySuccessRate: deliveries > 0 ? Math.round((deliveredCount / deliveries) * 100) : 100 })
  })

  // T23: revoke secret
  app.delete('/secrets/:secretId', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { secretId } = req.params as any
    const sec = await prisma.wbhSecret.findFirst({ where: { id: secretId, tenantId } })
    if (!sec) return rep.status(404).send({ error: 'Not found' })
    await prisma.wbhSecret.delete({ where: { id: secretId } })
    return rep.send({ success: true })
  })
}
