import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import {
  listProviderRegistry,
  grantConsent,
  revokeConsent,
  saveProviderApiKey,
  logProviderAudit,
} from '../../../brain/ai-provider.service.js'
import { getClaudeAvailability, getClaudeUsageStats } from '../../../brain/claude.service.js'

export async function adminAiProviderRoutes(app: FastifyInstance) {
  // GET /admin/ai/registry — list all available provider types
  app.get('/registry', async (req, reply) => {
    const providers = await listProviderRegistry()
    return reply.send({ success: true, data: providers })
  })

  // GET /admin/ai/providers — list tenant's configured providers (no keys exposed)
  app.get('/providers', async (req, reply) => {
    const { tenantId } = req as any
    const configs = await prisma.brainProviderConfig.findMany({
      where: { tenantId },
      select: {
        id: true, provider: true, name: true, model: true, baseUrl: true,
        isDefault: true, isActive: true, consentVerified: true,
        status: true, statusReason: true, fallbackProvider: true, fallbackEnabled: true,
        moduleOverrides: true, keyHint: true,
        createdAt: true, updatedAt: true,
        // Never expose apiKey or encryptedApiKey
        apiKey: false, encryptedApiKey: false,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    })
    return reply.send({ success: true, data: configs })
  })

  // POST /admin/ai/providers — create provider config (without key — use separate key endpoint)
  app.post('/providers', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any

    if (body.isDefault) {
      await prisma.brainProviderConfig.updateMany({ where: { tenantId }, data: { isDefault: false } })
    }

    const config = await prisma.brainProviderConfig.create({
      data: {
        tenantId,
        provider: body.provider,
        name: body.name,
        model: body.model,
        baseUrl: body.baseUrl,
        isDefault: body.isDefault ?? false,
        fallbackProvider: body.fallbackProvider ?? 'reno_brain',
        fallbackEnabled: body.fallbackEnabled ?? true,
        moduleOverrides: body.moduleOverrides,
        config: body.config,
        status: 'pending_key',
        createdBy: userId,
      },
      select: {
        id: true, provider: true, name: true, model: true, baseUrl: true,
        isDefault: true, isActive: true, status: true,
        fallbackProvider: true, fallbackEnabled: true, createdAt: true,
      },
    })

    await logProviderAudit({ tenantId, userId, providerSlug: body.provider, action: 'create', status: 'success' })
    return reply.code(201).send({ success: true, data: config })
  })

  // PUT /admin/ai/providers/:id/key — set/update API key (encrypted)
  app.put('/providers/:id/key', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any

    if (!body.apiKey?.trim()) {
      return reply.code(400).send({ success: false, error: 'apiKey is required' })
    }

    const existing = await prisma.brainProviderConfig.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Provider config not found' })

    const { hint } = await saveProviderApiKey(id, body.apiKey)

    await prisma.brainProviderConfig.update({
      where: { id },
      data: { status: 'active', isActive: true },
    })

    await logProviderAudit({ tenantId, userId, providerSlug: existing.provider, action: 'key_update', status: 'success' })
    return reply.send({ success: true, data: { hint, status: 'active' } })
  })

  // PATCH /admin/ai/providers/:id — update settings (not key)
  app.patch('/providers/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any

    const existing = await prisma.brainProviderConfig.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Provider config not found' })

    if (body.isDefault) {
      await prisma.brainProviderConfig.updateMany({ where: { tenantId, id: { not: id } }, data: { isDefault: false } })
    }

    const updated = await prisma.brainProviderConfig.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name : existing.name,
        model: body.model !== undefined ? body.model : existing.model,
        baseUrl: body.baseUrl !== undefined ? body.baseUrl : existing.baseUrl,
        isDefault: body.isDefault !== undefined ? body.isDefault : existing.isDefault,
        isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
        fallbackProvider: body.fallbackProvider !== undefined ? body.fallbackProvider : existing.fallbackProvider,
        fallbackEnabled: body.fallbackEnabled !== undefined ? body.fallbackEnabled : existing.fallbackEnabled,
        moduleOverrides: body.moduleOverrides !== undefined ? body.moduleOverrides : existing.moduleOverrides,
        config: body.config !== undefined ? body.config : existing.config,
      },
      select: {
        id: true, provider: true, name: true, model: true, baseUrl: true,
        isDefault: true, isActive: true, status: true, keyHint: true,
        fallbackProvider: true, fallbackEnabled: true, moduleOverrides: true, updatedAt: true,
      },
    })

    await logProviderAudit({ tenantId, userId, providerSlug: existing.provider, action: 'update', status: 'success' })
    return reply.send({ success: true, data: updated })
  })

  // DELETE /admin/ai/providers/:id
  app.delete('/providers/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any

    const existing = await prisma.brainProviderConfig.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Provider config not found' })

    await prisma.brainProviderConfig.delete({ where: { id } })
    await logProviderAudit({ tenantId, userId, providerSlug: existing.provider, action: 'delete', status: 'success' })
    return reply.send({ success: true })
  })

  // POST /admin/ai/providers/:id/test — test connection
  app.post('/providers/:id/test', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any

    const config = await prisma.brainProviderConfig.findFirst({ where: { id, tenantId } })
    if (!config) return reply.code(404).send({ success: false, error: 'Provider config not found' })

    if (!config.encryptedApiKey && !config.apiKey) {
      return reply.send({ success: false, data: { status: 'no_key', message: 'No API key configured' } })
    }

    let apiKey: string
    try {
      const { decryptApiKey } = await import('../../../brain/crypto.service.js')
      apiKey = config.encryptedApiKey ? decryptApiKey(config.encryptedApiKey) : (config.apiKey ?? '')
    } catch {
      return reply.send({ success: false, data: { status: 'decrypt_error', message: 'Failed to decrypt API key' } })
    }

    try {
      const { callAI } = await import('../../../brain/provider.js')
      const response = await callAI(
        [{ role: 'user', content: 'Say "OK" and nothing else.' }],
        { maxTokens: 10 },
        { provider: config.provider as any, apiKey, baseUrl: config.baseUrl ?? undefined, model: config.model }
      )

      await logProviderAudit({
        tenantId, userId, providerSlug: config.provider,
        action: 'test', status: 'success',
        latencyMs: response.latencyMs,
      })

      return reply.send({ success: true, data: { status: 'connected', model: response.model, latencyMs: response.latencyMs } })
    } catch (err: any) {
      await logProviderAudit({
        tenantId, userId, providerSlug: config.provider,
        action: 'test', status: 'error', errorMessage: err.message,
      })
      return reply.send({ success: false, data: { status: 'error', message: err.message } })
    }
  })

  // GET /admin/ai/consent — get consent status for all external providers
  app.get('/consent', async (req, reply) => {
    const { tenantId } = req as any
    const consents = await prisma.tenantAiConsent.findMany({ where: { tenantId } })
    return reply.send({ success: true, data: consents })
  })

  // POST /admin/ai/consent — grant consent for a provider
  app.post('/consent', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any

    if (!body.providerSlug) return reply.code(400).send({ success: false, error: 'providerSlug is required' })
    if (!body.consentText) return reply.code(400).send({ success: false, error: 'consentText is required (must confirm you read the terms)' })

    // Verify provider requires consent
    const registry = await prisma.aiProviderRegistry.findUnique({ where: { slug: body.providerSlug } })
    if (!registry) return reply.code(404).send({ success: false, error: 'Provider not found in registry' })
    if (!registry.requiresConsent) {
      return reply.code(400).send({ success: false, error: 'This provider does not require consent' })
    }

    await grantConsent(tenantId, body.providerSlug, userId, body.consentText)
    return reply.send({ success: true, data: { providerSlug: body.providerSlug, consentGiven: true } })
  })

  // DELETE /admin/ai/consent/:providerSlug — revoke consent
  app.delete('/consent/:providerSlug', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { providerSlug } = req.params as any

    await revokeConsent(tenantId, providerSlug, userId, (req.body as any)?.reason)
    return reply.send({ success: true, data: { providerSlug, consentRevoked: true } })
  })

  // GET /admin/ai/audit — provider audit logs
  app.get('/audit', async (req, reply) => {
    const { tenantId } = req as any
    const { providerSlug, action, page = '1', limit = '50' } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = { tenantId }
    if (providerSlug) where.providerSlug = providerSlug
    if (action) where.action = action

    const [logs, total] = await Promise.all([
      prisma.aiProviderAuditLog.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.aiProviderAuditLog.count({ where }),
    ])

    return reply.send({
      success: true,
      data: logs,
      meta: { pagination: { total, page: Number(page), limit: Number(limit) } },
    })
  })

  // GET /admin/ai/status — overall AI provider status for this tenant
  app.get('/status', async (req, reply) => {
    const { tenantId } = req as any

    const [configs, consents, registry, recentAudit] = await Promise.all([
      prisma.brainProviderConfig.findMany({
        where: { tenantId },
        select: { id: true, provider: true, name: true, isDefault: true, isActive: true, status: true, keyHint: true },
      }),
      prisma.tenantAiConsent.findMany({ where: { tenantId } }),
      listProviderRegistry(),
      prisma.aiProviderAuditLog.findMany({
        where: { tenantId },
        orderBy: { occurredAt: 'desc' },
        take: 5,
      }),
    ])

    const activeConfig = configs.find(c => c.isDefault && c.isActive)
    const claudeAvailability = await getClaudeAvailability(tenantId)

    return reply.send({
      success: true,
      data: {
        activeProvider: activeConfig?.provider ?? 'reno_brain',
        activeProviderName: activeConfig?.name ?? 'Reno Brain (Default)',
        configs,
        consents,
        availableProviders: registry,
        recentActivity: recentAudit,
        claudeAvailability,
      },
    })
  })

  // GET /admin/ai/claude/availability — check if Claude is ready for this tenant
  app.get('/claude/availability', async (req, reply) => {
    const { tenantId } = req as any
    const availability = await getClaudeAvailability(tenantId)
    return reply.send({ success: true, data: availability })
  })

  // GET /admin/ai/claude/usage — Claude token & cost statistics
  app.get('/claude/usage', async (req, reply) => {
    const { tenantId } = req as any
    const { days = '30' } = req.query as any
    const stats = await getClaudeUsageStats(tenantId, Number(days))
    return reply.send({ success: true, data: stats })
  })
}
