import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import { randomBytes, createHash } from 'crypto'

const POLICY_TYPES = ['rate_limit','ip_whitelist','ip_blacklist','cors','auth','transform','cache','logging','circuit_breaker']
const AUTH_TYPES = ['api_key','jwt','oauth2','basic','none']

function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = 'rk_' + randomBytes(32).toString('hex')
  const hash = createHash('sha256').update(raw).digest('hex')
  const prefix = raw.substring(0, 12)
  return { raw, hash, prefix }
}

export async function apiGatewayRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // T1: registry
  app.get('/registry', async (_req, rep) => {
    return rep.send({ policyTypes: POLICY_TYPES, authTypes: AUTH_TYPES, ratePeriods: ['second','minute','hour','day'], methods: ['GET','POST','PUT','PATCH','DELETE','*'] })
  })

  // T2: create API
  app.post('/apis', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const b = req.body as any
    const api = await prisma.agwApi.create({
      data: { tenantId, createdBy: userId, name: b.name, description: b.description, basePath: b.basePath, version: b.version ?? 'v1', upstreamUrl: b.upstreamUrl, authType: b.authType ?? 'api_key', rateLimit: b.rateLimit ?? 1000, ratePeriod: b.ratePeriod ?? 'hour', tags: (b.tags ?? []) as never }
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'api_gateway', entityType: 'AgwApi', entityId: api.id, newValues: { name: api.name } as never } }).catch(() => null)
    return rep.status(201).send(api)
  })

  // T3: list APIs
  app.get('/apis', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const apis = await prisma.agwApi.findMany({
      where: { tenantId }, orderBy: { createdAt: 'desc' },
      include: { _count: { select: { routes: true, consumers: true } } }
    })
    return rep.send({ apis, total: apis.length })
  })

  // T4: get API
  app.get('/apis/:apiId', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { apiId } = req.params as any
    const api = await prisma.agwApi.findFirst({ where: { id: apiId, tenantId }, include: { routes: true, policies: { orderBy: { order: 'asc' } } } })
    if (!api) return rep.status(404).send({ error: 'Not found' })
    return rep.send(api)
  })

  // T5: update API
  app.patch('/apis/:apiId', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { apiId } = req.params as any
    const b = req.body as any
    const exists = await prisma.agwApi.findFirst({ where: { id: apiId, tenantId } })
    if (!exists) return rep.status(404).send({ error: 'Not found' })
    const data: any = {}
    if (b.name !== undefined) data.name = b.name
    if (b.isActive !== undefined) data.isActive = b.isActive
    if (b.rateLimit !== undefined) data.rateLimit = b.rateLimit
    if (b.upstreamUrl !== undefined) data.upstreamUrl = b.upstreamUrl
    const api = await prisma.agwApi.update({ where: { id: apiId }, data })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE', module: 'api_gateway', entityType: 'AgwApi', entityId: apiId, newValues: data as never } }).catch(() => null)
    return rep.send(api)
  })

  // T6: delete API
  app.delete('/apis/:apiId', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { apiId } = req.params as any
    const exists = await prisma.agwApi.findFirst({ where: { id: apiId, tenantId } })
    if (!exists) return rep.status(404).send({ error: 'Not found' })
    await prisma.agwApi.delete({ where: { id: apiId } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'DELETE', module: 'api_gateway', entityType: 'AgwApi', entityId: apiId, newValues: {} as never } }).catch(() => null)
    return rep.send({ success: true })
  })

  // T7: create route
  app.post('/apis/:apiId/routes', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { apiId } = req.params as any
    const b = req.body as any
    const api = await prisma.agwApi.findFirst({ where: { id: apiId, tenantId } })
    if (!api) return rep.status(404).send({ error: 'API not found' })
    const route = await prisma.agwRoute.create({
      data: { tenantId, apiId, method: b.method ?? 'GET', path: b.path, upstream: b.upstream ?? api.upstreamUrl + b.path, stripPath: b.stripPath ?? false, cacheEnabled: b.cacheEnabled ?? false, cacheTtl: b.cacheTtl ?? 300, timeout: b.timeout ?? 30000 }
    })
    return rep.status(201).send(route)
  })

  // T8: list routes
  app.get('/apis/:apiId/routes', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { apiId } = req.params as any
    const routes = await prisma.agwRoute.findMany({ where: { apiId, tenantId }, orderBy: { createdAt: 'asc' } })
    return rep.send({ routes })
  })

  // T9: update route
  app.patch('/apis/:apiId/routes/:routeId', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { routeId } = req.params as any
    const b = req.body as any
    const exists = await prisma.agwRoute.findFirst({ where: { id: routeId, tenantId } })
    if (!exists) return rep.status(404).send({ error: 'Not found' })
    const data: any = {}
    if (b.isActive !== undefined) data.isActive = b.isActive
    if (b.cacheEnabled !== undefined) data.cacheEnabled = b.cacheEnabled
    if (b.timeout !== undefined) data.timeout = b.timeout
    const route = await prisma.agwRoute.update({ where: { id: routeId }, data })
    return rep.send(route)
  })

  // T10: delete route
  app.delete('/apis/:apiId/routes/:routeId', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { routeId } = req.params as any
    const exists = await prisma.agwRoute.findFirst({ where: { id: routeId, tenantId } })
    if (!exists) return rep.status(404).send({ error: 'Not found' })
    await prisma.agwRoute.delete({ where: { id: routeId } })
    return rep.send({ success: true })
  })

  // T11: create consumer
  app.post('/apis/:apiId/consumers', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { apiId } = req.params as any
    const b = req.body as any
    const api = await prisma.agwApi.findFirst({ where: { id: apiId, tenantId } })
    if (!api) return rep.status(404).send({ error: 'API not found' })
    const consumer = await prisma.agwConsumer.create({
      data: { tenantId, apiId, name: b.name, description: b.description, quota: b.quota ?? 10000, quotaPeriod: b.quotaPeriod ?? 'month' }
    })
    return rep.status(201).send(consumer)
  })

  // T12: list consumers
  app.get('/apis/:apiId/consumers', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { apiId } = req.params as any
    const consumers = await prisma.agwConsumer.findMany({ where: { apiId, tenantId }, include: { _count: { select: { keys: true } } } })
    return rep.send({ consumers })
  })

  // T13: create API key
  app.post('/consumers/:consumerId/keys', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { consumerId } = req.params as any
    const b = req.body as any
    const consumer = await prisma.agwConsumer.findFirst({ where: { id: consumerId, tenantId } })
    if (!consumer) return rep.status(404).send({ error: 'Consumer not found' })
    const { raw, hash, prefix } = generateApiKey()
    const key = await prisma.agwKey.create({
      data: { tenantId, consumerId, keyHash: hash, keyPrefix: prefix, name: b.name ?? 'API Key', scopes: (b.scopes ?? ['read']) as never, expiresAt: b.expiresAt ? new Date(b.expiresAt) : null }
    })
    return rep.status(201).send({ ...key, rawKey: raw, message: 'Save this key — it will not be shown again' })
  })

  // T14: list keys
  app.get('/consumers/:consumerId/keys', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { consumerId } = req.params as any
    const keys = await prisma.agwKey.findMany({ where: { consumerId, tenantId }, select: { id: true, keyPrefix: true, name: true, scopes: true, expiresAt: true, hitCount: true, lastUsedAt: true, isActive: true, createdAt: true } })
    return rep.send({ keys })
  })

  // T15: revoke key
  app.delete('/keys/:keyId', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { keyId } = req.params as any
    const key = await prisma.agwKey.findFirst({ where: { id: keyId, tenantId } })
    if (!key) return rep.status(404).send({ error: 'Not found' })
    await prisma.agwKey.delete({ where: { id: keyId } })
    return rep.send({ success: true })
  })

  // T16: simulate request (log an API call)
  app.post('/apis/:apiId/simulate', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { apiId } = req.params as any
    const b = req.body as any
    const api = await prisma.agwApi.findFirst({ where: { id: apiId, tenantId } })
    if (!api) return rep.status(404).send({ error: 'Not found' })
    const durationMs = Math.floor(Math.random() * 80) + 20
    const log = await prisma.agwLog.create({
      data: { tenantId, apiId, method: b.method ?? 'GET', path: b.path ?? '/test', statusCode: b.statusCode ?? 200, durationMs, requestSize: b.requestSize ?? 256, responseSize: b.responseSize ?? 1024, ip: '127.0.0.1', userAgent: 'Reno/1.0' }
    })
    return rep.send({ ...log, simulated: true, upstream: api.upstreamUrl })
  })

  // T17: get logs
  app.get('/apis/:apiId/logs', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { apiId } = req.params as any
    const logs = await prisma.agwLog.findMany({ where: { apiId, tenantId }, orderBy: { createdAt: 'desc' }, take: 100 })
    return rep.send({ logs, total: logs.length })
  })

  // T18: create policy
  app.post('/apis/:apiId/policies', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { apiId } = req.params as any
    const b = req.body as any
    const api = await prisma.agwApi.findFirst({ where: { id: apiId, tenantId } })
    if (!api) return rep.status(404).send({ error: 'Not found' })
    const policy = await prisma.agwPolicy.create({
      data: { tenantId, apiId, name: b.name, policyType: b.policyType, config: (b.config ?? {}) as never, order: b.order ?? 0 }
    })
    return rep.status(201).send(policy)
  })

  // T19: list policies
  app.get('/apis/:apiId/policies', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { apiId } = req.params as any
    const policies = await prisma.agwPolicy.findMany({ where: { apiId, tenantId }, orderBy: { order: 'asc' } })
    return rep.send({ policies })
  })

  // T20: delete policy
  app.delete('/policies/:policyId', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { policyId } = req.params as any
    const policy = await prisma.agwPolicy.findFirst({ where: { id: policyId, tenantId } })
    if (!policy) return rep.status(404).send({ error: 'Not found' })
    await prisma.agwPolicy.delete({ where: { id: policyId } })
    return rep.send({ success: true })
  })

  // T21: global logs
  app.get('/logs', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { limit } = req.query as any
    const logs = await prisma.agwLog.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: Math.min(Number(limit) || 50, 500) })
    return rep.send({ logs, total: logs.length })
  })

  // T22: analytics for API
  app.get('/apis/:apiId/analytics', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { apiId } = req.params as any
    const logs = await prisma.agwLog.findMany({ where: { apiId, tenantId } })
    const total = logs.length
    const success = logs.filter((l: any) => l.statusCode < 400).length
    const errors = total - success
    const avgDuration = total > 0 ? Math.round(logs.reduce((s: number, l: any) => s + l.durationMs, 0) / total) : 0
    const p99 = total > 0 ? logs.sort((a: any, b: any) => b.durationMs - a.durationMs)[Math.floor(total * 0.01)]?.durationMs ?? 0 : 0
    return rep.send({ totalRequests: total, successRequests: success, errorRequests: errors, successRate: total > 0 ? Math.round((success / total) * 100) : 100, avgDurationMs: avgDuration, p99DurationMs: p99 })
  })

  // T23: global stats
  app.get('/stats', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const [apis, routes, consumers, keys, logs, policies] = await Promise.all([
      prisma.agwApi.count({ where: { tenantId } }),
      prisma.agwRoute.count({ where: { tenantId } }),
      prisma.agwConsumer.count({ where: { tenantId } }),
      prisma.agwKey.count({ where: { tenantId } }),
      prisma.agwLog.count({ where: { tenantId } }),
      prisma.agwPolicy.count({ where: { tenantId } })
    ])
    const activeApis = await prisma.agwApi.count({ where: { tenantId, isActive: true } })
    return rep.send({ apis, activeApis, routes, consumers, keys, logs, policies })
  })

  // T24: delete consumer
  app.delete('/consumers/:consumerId', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { consumerId } = req.params as any
    const c = await prisma.agwConsumer.findFirst({ where: { id: consumerId, tenantId } })
    if (!c) return rep.status(404).send({ error: 'Not found' })
    await prisma.agwConsumer.delete({ where: { id: consumerId } })
    return rep.send({ success: true })
  })
}
