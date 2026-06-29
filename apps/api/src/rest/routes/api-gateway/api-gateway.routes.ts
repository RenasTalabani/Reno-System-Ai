import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { createHash, randomBytes } from 'crypto'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

function hashKey(key: string) {
  return createHash('sha256').update(key).digest('hex')
}

export async function apiGatewayRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── API Keys ───────────────────────────────────────────────────────────────

  app.get('/keys', async (request, reply) => {
    const { tenantId } = request as any
    const keys = await prisma.apigwApiKey.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, keyPrefix: true, status: true, scopes: true, rateLimit: true, rateWindow: true, expiresAt: true, lastUsedAt: true, totalCalls: true, createdAt: true } })
    return reply.send(buildSuccessResponse(keys))
  })

  app.post('/keys', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any
    const rawKey = `reno_${randomBytes(32).toString('hex')}`
    const prefix = rawKey.slice(0, 10)
    const keyHash = hashKey(rawKey)
    const apiKey = await prisma.apigwApiKey.create({
      data: { tenantId, createdBy: userId, name: body.name, keyPrefix: prefix, keyHash, scopes: body.scopes ?? [], rateLimit: body.rateLimit ?? 1000, rateWindow: body.rateWindow ?? '1h', expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined },
    })
    // Return raw key ONCE — never stored in plaintext
    return reply.status(201).send(buildSuccessResponse({ ...apiKey, rawKey, keyHash: undefined }))
  })

  app.patch('/keys/:id/revoke', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    await prisma.apigwApiKey.updateMany({ where: { id, tenantId }, data: { status: 'revoked' } })
    return reply.send(buildSuccessResponse({ revoked: true }))
  })

  // POST /api-gateway/keys/verify — validate key (used by middleware)
  app.post('/keys/verify', async (request, reply) => {
    const { tenantId } = request as any
    const { key } = request.body as any
    const keyHash = hashKey(key)
    const apiKey = await prisma.apigwApiKey.findFirst({ where: { keyHash, tenantId, status: 'active' } })
    if (!apiKey) throw new RenoError(ErrorCode.UNAUTHORIZED, 'Invalid API key', 401)
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) throw new RenoError(ErrorCode.UNAUTHORIZED, 'API key expired', 401)
    await prisma.apigwApiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date(), totalCalls: { increment: 1 } } })
    return reply.send(buildSuccessResponse({ valid: true, scopes: apiKey.scopes, rateLimit: apiKey.rateLimit }))
  })

  // ── Webhooks ───────────────────────────────────────────────────────────────

  app.get('/webhooks', async (request, reply) => {
    const { tenantId } = request as any
    const webhooks = await prisma.apigwWebhook.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } })
    return reply.send(buildSuccessResponse(webhooks))
  })

  app.post('/webhooks', async (request, reply) => {
    const { tenantId } = request as any
    const body = request.body as any
    const secret = randomBytes(32).toString('hex')
    const webhook = await prisma.apigwWebhook.create({ data: { tenantId, name: body.name, url: body.url, events: body.events ?? [], secret, headers: body.headers ?? {}, retryCount: body.retryCount ?? 3 } })
    return reply.status(201).send(buildSuccessResponse({ ...webhook }))
  })

  app.patch('/webhooks/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const body = request.body as any
    await prisma.apigwWebhook.updateMany({ where: { id, tenantId }, data: { name: body.name, url: body.url, events: body.events, status: body.status, headers: body.headers, retryCount: body.retryCount } })
    return reply.send(buildSuccessResponse({ updated: true }))
  })

  app.delete('/webhooks/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    await prisma.apigwWebhook.deleteMany({ where: { id, tenantId } })
    return reply.send(buildSuccessResponse({ deleted: true }))
  })

  // POST /webhooks/:id/test — fire test payload
  app.post('/webhooks/:id/test', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const webhook = await prisma.apigwWebhook.findFirst({ where: { id, tenantId } })
    if (!webhook) throw new RenoError(ErrorCode.NOT_FOUND, 'Webhook not found', 404)
    // Fire async; don't wait
    setImmediate(async () => {
      try {
        const res = await fetch(webhook.url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Reno-Event': 'test', ...(webhook.headers as any) }, body: JSON.stringify({ event: 'test', tenantId, timestamp: new Date().toISOString() }) })
        await prisma.apigwWebhook.update({ where: { id }, data: { lastFired: new Date(), lastStatus: res.status } })
      } catch { await prisma.apigwWebhook.update({ where: { id }, data: { lastFired: new Date(), lastStatus: 0 } }) }
    })
    return reply.send(buildSuccessResponse({ fired: true }))
  })

  // ── Usage Analytics ────────────────────────────────────────────────────────

  app.get('/usage', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000)
    const [totalCalls, errorRate, avgLatency, topPaths] = await Promise.all([
      prisma.apigwUsageLog.count({ where: { tenantId, occurredAt: { gte: since } } }),
      prisma.apigwUsageLog.count({ where: { tenantId, occurredAt: { gte: since }, statusCode: { gte: 400 } } }),
      prisma.apigwUsageLog.aggregate({ where: { tenantId, occurredAt: { gte: since } }, _avg: { durationMs: true } }),
      prisma.apigwUsageLog.groupBy({ by: ['path'], where: { tenantId, occurredAt: { gte: since } }, _count: { path: true }, orderBy: { _count: { path: 'desc' } }, take: 10 }),
    ])
    return reply.send(buildSuccessResponse({ totalCalls, errorCount: errorRate, errorRate: totalCalls > 0 ? Math.round((errorRate / totalCalls) * 100) : 0, avgLatencyMs: Math.round(avgLatency._avg.durationMs ?? 0), topPaths }))
  })

  // ── Dashboard ──────────────────────────────────────────────────────────────

  app.get('/dashboard', async (request, reply) => {
    const { tenantId } = request as any
    const [activeKeys, webhooks, totalCalls] = await Promise.all([
      prisma.apigwApiKey.count({ where: { tenantId, status: 'active' } }),
      prisma.apigwWebhook.count({ where: { tenantId, status: 'active' } }),
      prisma.apigwApiKey.aggregate({ where: { tenantId }, _sum: { totalCalls: true } }),
    ])
    return reply.send(buildSuccessResponse({ activeKeys, activeWebhooks: webhooks, totalCalls: Number(totalCalls._sum.totalCalls ?? 0) }))
  })
}
