import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import crypto from 'node:crypto'
import {
  generateWebhookSecret,
  hashWebhookSecret,
  signPayload,
  type WebhookEventType,
} from '../../../developer/webhook.service.js'

const SUPPORTED_EVENTS: WebhookEventType[] = [
  'user.created', 'user.updated', 'user.deleted',
  'tenant.created', 'tenant.updated',
  'invoice.created', 'invoice.paid', 'invoice.overdue',
  'ticket.created', 'ticket.resolved', 'ticket.escalated',
  'employee.created', 'employee.terminated',
  'leave.requested', 'leave.approved', 'leave.rejected',
  'backup.completed', 'backup.failed',
  'deployment.completed', 'deployment.failed', 'deployment.rolledback',
  'dr.readiness_changed', 'ai_sre.incident_detected',
]

export async function developerRoutes(app: FastifyInstance) {
  // ── API Keys ──────────────────────────────────────────────────────────────

  app.get('/api-keys', {
    schema: { tags: ['Developer'], summary: 'List API keys for tenant' },
  }, async (request, reply) => {
    const tenantId = (request.headers['x-tenant-id'] as string) ?? ''
    if (!tenantId) return reply.status(400).send({ error: 'X-Tenant-ID header required' })

    const keys = await prisma.sysApiKey.findMany({
      where: { tenantId, revokedAt: null },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return { keys }
  })

  app.post('/api-keys', {
    schema: { tags: ['Developer'], summary: 'Create a new API key' },
  }, async (request, reply) => {
    const tenantId = (request.headers['x-tenant-id'] as string) ?? ''
    if (!tenantId) return reply.status(400).send({ error: 'X-Tenant-ID header required' })

    const body = request.body as {
      name: string
      scopes?: string[]
      expiresInDays?: number
    }

    if (!body.name) return reply.status(400).send({ error: 'name is required' })

    const rawKey = `reno_${crypto.randomBytes(32).toString('base64url')}`
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
    const keyPrefix = rawKey.slice(0, 12)
    const expiresAt = body.expiresInDays
      ? new Date(Date.now() + body.expiresInDays * 86_400_000)
      : null

    const key = await prisma.sysApiKey.create({
      data: {
        tenantId,
        name: body.name,
        keyHash,
        keyPrefix,
        scopes: (body.scopes ?? ['read']) as never,
        expiresAt,
      },
    })

    return reply.status(201).send({
      id: key.id,
      name: key.name,
      keyPrefix,
      key: rawKey, // Only returned once — never stored in plaintext
      scopes: key.scopes,
      expiresAt: key.expiresAt,
      warning: 'Store this key securely. It will not be shown again.',
    })
  })

  app.delete('/api-keys/:id', {
    schema: { tags: ['Developer'], summary: 'Revoke an API key' },
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const tenantId = (request.headers['x-tenant-id'] as string) ?? ''

    const key = await prisma.sysApiKey.findFirst({ where: { id, tenantId } })
    if (!key) return reply.status(404).send({ error: 'API key not found' })

    await prisma.sysApiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    })
    return { revoked: true, id }
  })

  // ── Webhooks ──────────────────────────────────────────────────────────────

  app.get('/webhooks', {
    schema: { tags: ['Developer'], summary: 'List registered webhooks' },
  }, async (request, reply) => {
    const tenantId = (request.headers['x-tenant-id'] as string) ?? ''
    if (!tenantId) return reply.status(400).send({ error: 'X-Tenant-ID header required' })

    const webhooks = await prisma.devWebhook.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        failureCount: true,
        lastDeliveryAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return { webhooks }
  })

  app.post('/webhooks', {
    schema: { tags: ['Developer'], summary: 'Register a new webhook' },
  }, async (request, reply) => {
    const tenantId = (request.headers['x-tenant-id'] as string) ?? ''
    if (!tenantId) return reply.status(400).send({ error: 'X-Tenant-ID header required' })

    const body = request.body as {
      name: string
      url: string
      events?: string[]
    }

    if (!body.name || !body.url) return reply.status(400).send({ error: 'name and url are required' })

    try { new URL(body.url) } catch {
      return reply.status(400).send({ error: 'url must be a valid URL' })
    }

    const secret = generateWebhookSecret()
    const secretHash = hashWebhookSecret(secret)

    const webhook = await prisma.devWebhook.create({
      data: {
        tenantId,
        name: body.name,
        url: body.url,
        secret: secretHash,
        events: (body.events ?? []) as never,
      },
    })

    return reply.status(201).send({
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      secret, // Only returned once
      warning: 'Store this secret securely. It will not be shown again. Use it to verify webhook signatures.',
    })
  })

  app.patch('/webhooks/:id', {
    schema: { tags: ['Developer'], summary: 'Update webhook (toggle active, change events)' },
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const tenantId = (request.headers['x-tenant-id'] as string) ?? ''
    const body = request.body as { isActive?: boolean; events?: string[]; name?: string }

    const wh = await prisma.devWebhook.findFirst({ where: { id, tenantId } })
    if (!wh) return reply.status(404).send({ error: 'Webhook not found' })

    const updated = await prisma.devWebhook.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.isActive !== undefined && { isActive: body.isActive, ...(body.isActive && { failureCount: 0 }) }),
        ...(body.events !== undefined && { events: body.events as never }),
      },
    })
    return { updated: true, webhook: { id: updated.id, name: updated.name, isActive: updated.isActive } }
  })

  app.delete('/webhooks/:id', {
    schema: { tags: ['Developer'], summary: 'Delete a webhook' },
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const tenantId = (request.headers['x-tenant-id'] as string) ?? ''

    const wh = await prisma.devWebhook.findFirst({ where: { id, tenantId } })
    if (!wh) return reply.status(404).send({ error: 'Webhook not found' })

    await prisma.devWebhook.delete({ where: { id } })
    return { deleted: true, id }
  })

  app.get('/webhooks/:id/deliveries', {
    schema: { tags: ['Developer'], summary: 'Get webhook delivery history' },
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const tenantId = (request.headers['x-tenant-id'] as string) ?? ''
    const { limit = '20' } = request.query as { limit?: string }

    const wh = await prisma.devWebhook.findFirst({ where: { id, tenantId } })
    if (!wh) return reply.status(404).send({ error: 'Webhook not found' })

    const deliveries = await prisma.devWebhookDelivery.findMany({
      where: { webhookId: id },
      orderBy: { deliveredAt: 'desc' },
      take: Math.min(Number(limit), 100),
    })
    return { webhookId: id, deliveries }
  })

  app.post('/webhooks/:id/test', {
    schema: { tags: ['Developer'], summary: 'Send a test event to a webhook' },
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const tenantId = (request.headers['x-tenant-id'] as string) ?? ''

    const wh = await prisma.devWebhook.findFirst({ where: { id, tenantId } })
    if (!wh) return reply.status(404).send({ error: 'Webhook not found' })

    const payload = {
      id: crypto.randomUUID(),
      event: 'webhook.test',
      tenantId,
      data: { message: 'This is a test event from Reno.', webhookId: id },
      timestamp: new Date().toISOString(),
    }
    const body = JSON.stringify(payload)
    const sig = signPayload(wh.secret, body)

    let statusCode: number | undefined
    let success = false
    try {
      const res = await fetch(wh.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Reno-Signature': `sha256=${sig}`,
          'X-Reno-Event': 'webhook.test',
          'User-Agent': 'Reno-Webhook/1.0',
        },
        body,
        signal: AbortSignal.timeout(10_000),
      })
      statusCode = res.status
      success = res.ok
    } catch {
      statusCode = 0
    }

    return { tested: true, statusCode, success }
  })

  // ── Sandbox ───────────────────────────────────────────────────────────────

  app.get('/sandbox', {
    schema: { tags: ['Developer'], summary: 'Get sandbox environment info' },
  }, async (_request, reply) => {
    return {
      environment: 'sandbox',
      apiBase: '/v1',
      docsUrl: '/docs',
      openApiUrl: '/docs/json',
      rateLimits: {
        requestsPerWindow: 1000,
        windowMs: 900_000,
      },
      supportedWebhookEvents: SUPPORTED_EVENTS,
      authentication: {
        methods: ['BearerToken', 'ApiKey'],
        headerBearer: 'Authorization: Bearer <token>',
        headerApiKey: 'X-API-Key: <key>',
      },
      sdkPackages: {
        typescript: '@reno/sdk',
        installCommand: 'pnpm add @reno/sdk',
        npmRegistry: 'https://registry.npmjs.org',
      },
    }
  })

  // ── Event types catalog ───────────────────────────────────────────────────

  app.get('/events', {
    schema: { tags: ['Developer'], summary: 'List all supported webhook event types' },
  }, async () => {
    return {
      events: SUPPORTED_EVENTS.map((e) => ({
        type: e,
        category: e.split('.')[0],
        action: e.split('.')[1],
      })),
    }
  })
}
