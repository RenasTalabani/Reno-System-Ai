import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import { randomBytes } from 'crypto'
import {
  assessIntegrationHealth, analyseWebhookPayload,
  generateFieldMappings, simulateSyncResult, generateHubSummary,
} from './ai-engine.js'

// ── Authenticated routes ───────────────────────────────────────────────────────

export async function integrationHubRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Dashboard ──────────────────────────────────────────────────────────────

  app.get('/dashboard', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const [total, active, error, pending, syncLogs, webhookEvents, unprocessed] = await Promise.all([
      prisma.eihIntegration.count({ where: { tenantId } }),
      prisma.eihIntegration.count({ where: { tenantId, status: 'active' } }),
      prisma.eihIntegration.count({ where: { tenantId, status: 'error' } }),
      prisma.eihIntegration.count({ where: { tenantId, status: 'pending' } }),
      prisma.eihSyncLog.count({ where: { tenantId } }),
      prisma.eihWebhookEvent.count({ where: { tenantId } }),
      prisma.eihWebhookEvent.count({ where: { tenantId, processed: false } }),
    ])
    const byCategory = await prisma.eihIntegration.findMany({
      where: { tenantId },
      include: { connector: { select: { category: true } } },
    })
    const categories = [...new Set(byCategory.map(i => i.connector.category))]
    const summary = generateHubSummary(total, active, error, unprocessed)
    return {
      success: true,
      data: { total, active, error, pending, syncLogs, webhookEvents, unprocessed, categories, summary },
    }
  })

  // ── Connectors marketplace ─────────────────────────────────────────────────

  app.get('/connectors', async (req) => {
    const q = req.query as Record<string, string>
    const connectors = await prisma.eihConnector.findMany({
      where: {
        isActive: true,
        ...(q.category ? { category: q.category } : {}),
        ...(q.authType ? { authType: q.authType } : {}),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })
    return { success: true, data: connectors }
  })

  // ── Integrations CRUD ──────────────────────────────────────────────────────

  app.get('/integrations', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const q = req.query as Record<string, string>
    const integrations = await prisma.eihIntegration.findMany({
      where: { tenantId, ...(q.status ? { status: q.status } : {}) },
      include: {
        connector: true,
        syncLogs: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: integrations }
  })

  app.get('/integrations/:id', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const integration = await prisma.eihIntegration.findFirst({
      where: { id, tenantId },
      include: {
        connector: true,
        syncLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
        webhookEvents: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    })
    if (!integration) return reply.code(404).send({ success: false, error: 'Integration not found' })
    const health = assessIntegrationHealth(
      integration.syncCount, integration.errorCount,
      integration.lastSyncStatus, integration.lastSyncAt,
    )
    return { success: true, data: { ...integration, health } }
  })

  app.post('/integrations', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as {
      connectorId: string; name: string
      config?: Record<string, unknown>; credentials?: Record<string, unknown>
    }

    const webhookSecret = randomBytes(32).toString('hex')

    const integration = await prisma.eihIntegration.create({
      data: {
        tenantId, userId,
        connectorId: body.connectorId,
        name: body.name,
        status: 'pending',
        config: (body.config ?? {}) as never,
        credentials: (body.credentials ?? {}) as never,
        webhookSecret,
        fieldMappings: [] as never,
      },
      include: { connector: true },
    })

    await prisma.sysAuditLog.create({
      data: {
        tenantId, userId,
        action: 'EIH_INTEGRATION_CREATED',
        module: 'integration-hub',
        entityType: 'EihIntegration',
        entityId: integration.id,
        newValues: { name: body.name, connectorId: body.connectorId } as never,
      },
    }).catch(() => null)

    return { success: true, data: integration }
  })

  app.put('/integrations/:id', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = req.body as Record<string, unknown>
    const existing = await prisma.eihIntegration.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Integration not found' })

    const allowed = ['name', 'status', 'config', 'credentials', 'oauthTokens', 'fieldMappings']
    const data: Record<string, unknown> = {}
    for (const key of allowed) if (body[key] !== undefined) data[key] = body[key]

    const updated = await prisma.eihIntegration.update({
      where: { id },
      data: data as never,
      include: { connector: true },
    })

    await prisma.sysAuditLog.create({
      data: {
        tenantId, userId,
        action: 'EIH_INTEGRATION_UPDATED',
        module: 'integration-hub',
        entityType: 'EihIntegration',
        entityId: id,
        newValues: data as never,
      },
    }).catch(() => null)

    return { success: true, data: updated }
  })

  app.delete('/integrations/:id', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const existing = await prisma.eihIntegration.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Integration not found' })

    await prisma.eihIntegration.update({ where: { id }, data: { status: 'revoked' } })

    await prisma.sysAuditLog.create({
      data: {
        tenantId, userId,
        action: 'EIH_INTEGRATION_REVOKED',
        module: 'integration-hub',
        entityType: 'EihIntegration',
        entityId: id,
        newValues: {} as never,
      },
    }).catch(() => null)

    return { success: true, data: { revoked: true } }
  })

  // ── Test Connection ────────────────────────────────────────────────────────

  app.post('/integrations/:id/test', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const integration = await prisma.eihIntegration.findFirst({
      where: { id, tenantId },
      include: { connector: true },
    })
    if (!integration) return reply.code(404).send({ success: false, error: 'Integration not found' })

    // Simulate connection test — in production would call actual API
    const latencyMs = 80 + Math.floor(Math.random() * 300)
    const connected = Math.random() > 0.1 // 90% success in demo
    const newStatus = connected ? 'active' : 'error'
    await prisma.eihIntegration.update({ where: { id }, data: { status: newStatus } })

    return {
      success: true,
      data: { connected, latencyMs, status: newStatus, testedAt: new Date() },
    }
  })

  // ── Manual Sync ────────────────────────────────────────────────────────────

  app.post('/integrations/:id/sync', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = (req.body ?? {}) as { direction?: string }
    const integration = await prisma.eihIntegration.findFirst({
      where: { id, tenantId },
      include: { connector: true },
    })
    if (!integration) return reply.code(404).send({ success: false, error: 'Integration not found' })

    const direction = (body.direction ?? 'inbound') as 'inbound' | 'outbound'
    const result = simulateSyncResult(integration.connector.slug)
    const syncStatus = result.recordsFailed === 0 ? 'success' : result.recordsSynced > 0 ? 'partial' : 'error'

    const log = await prisma.eihSyncLog.create({
      data: {
        tenantId,
        integrationId: id,
        direction,
        status: syncStatus,
        recordsTotal: result.recordsTotal,
        recordsSynced: result.recordsSynced,
        recordsFailed: result.recordsFailed,
        duration: result.duration,
        triggeredBy: 'manual',
      },
    })

    await prisma.eihIntegration.update({
      where: { id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: syncStatus,
        syncCount: { increment: 1 },
        ...(result.recordsFailed > 0 ? { errorCount: { increment: 1 } } : {}),
        status: integration.status === 'pending' ? 'active' : integration.status,
      },
    })

    await prisma.sysAuditLog.create({
      data: {
        tenantId, userId,
        action: 'EIH_SYNC_TRIGGERED',
        module: 'integration-hub',
        entityType: 'EihSyncLog',
        entityId: log.id,
        newValues: { status: syncStatus, recordsSynced: result.recordsSynced } as never,
      },
    }).catch(() => null)

    return { success: true, data: { log, sampleData: result.sampleData } }
  })

  // ── Sync Logs ──────────────────────────────────────────────────────────────

  app.get('/sync-logs', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const q = req.query as Record<string, string>
    const logs = await prisma.eihSyncLog.findMany({
      where: {
        tenantId,
        ...(q.integrationId ? { integrationId: q.integrationId } : {}),
        ...(q.status ? { status: q.status } : {}),
      },
      include: {
        integration: {
          select: { name: true, connector: { select: { name: true, logoEmoji: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: logs }
  })

  // ── Webhook Events ─────────────────────────────────────────────────────────

  app.get('/webhook-events', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const q = req.query as Record<string, string>
    const events = await prisma.eihWebhookEvent.findMany({
      where: {
        tenantId,
        ...(q.source ? { source: q.source } : {}),
        ...(q.processed !== undefined ? { processed: q.processed === 'true' } : {}),
      },
      include: { integration: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: events }
  })

  app.patch('/webhook-events/:id/process', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const event = await prisma.eihWebhookEvent.findFirst({ where: { id, tenantId } })
    if (!event) return reply.code(404).send({ success: false, error: 'Event not found' })

    const updated = await prisma.eihWebhookEvent.update({
      where: { id },
      data: { processed: true, processedAt: new Date() },
    })
    return { success: true, data: updated }
  })

  // ── Field Mapping Suggestions ──────────────────────────────────────────────

  app.post('/field-mappings/suggest', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const body = req.body as { integrationId: string; targetEntity: string }
    const integration = await prisma.eihIntegration.findFirst({
      where: { id: body.integrationId, tenantId },
      include: { connector: true },
    })
    if (!integration) return reply.code(404).send({ success: false, error: 'Integration not found' })
    const suggestions = generateFieldMappings(integration.connector.slug, body.targetEntity)
    return { success: true, data: suggestions }
  })

  // ── Health ─────────────────────────────────────────────────────────────────

  app.get('/health', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const integrations = await prisma.eihIntegration.findMany({
      where: { tenantId },
      include: { connector: { select: { name: true, logoEmoji: true, category: true } } },
    })
    const reports = integrations.map(i => ({
      id: i.id,
      name: i.name,
      connector: i.connector.name,
      emoji: i.connector.logoEmoji,
      category: i.connector.category,
      status: i.status,
      ...assessIntegrationHealth(i.syncCount, i.errorCount, i.lastSyncStatus, i.lastSyncAt),
    }))
    const overallScore = reports.length > 0
      ? Math.round(reports.reduce((s, r) => s + r.score, 0) / reports.length)
      : 100
    return { success: true, data: { reports, overallScore } }
  })
}

// ── Unauthenticated Webhook Receiver ──────────────────────────────────────────

export async function webhookReceiverRoutes(app: FastifyInstance) {
  app.post('/webhooks/receive/:webhookSecret', async (req, reply) => {
    const { webhookSecret } = req.params as { webhookSecret: string }
    const integration = await prisma.eihIntegration.findFirst({
      where: { webhookSecret },
      include: { connector: true },
    })
    if (!integration) return reply.code(404).send({ error: 'Unknown webhook endpoint' })

    const payload = (req.body ?? {}) as Record<string, unknown>
    const eventType = String(
      (req.headers['x-event-type'] as string) ??
      (req.headers['x-shopify-topic'] as string) ??
      payload.type ??
      payload.event ??
      'unknown',
    )

    const aiAnalysis = analyseWebhookPayload(integration.connector.slug, eventType, payload)

    const event = await prisma.eihWebhookEvent.create({
      data: {
        tenantId: integration.tenantId,
        integrationId: integration.id,
        source: integration.connector.slug,
        eventType,
        payload: payload as never,
        aiAnalysis: aiAnalysis as never,
      },
    })

    return { success: true, data: { eventId: event.id, analysed: true } }
  })
}
