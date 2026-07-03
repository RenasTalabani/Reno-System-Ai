import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'
import { createHash, randomBytes } from 'node:crypto'

// API keys: full key shown ONCE at creation; only prefix + SHA-256 hash stored.
function makeKey(): { full: string; prefix: string; hash: string } {
  const raw = 'rk_' + randomBytes(24).toString('hex')
  return { full: raw, prefix: raw.slice(0, 10), hash: createHash('sha256').update(raw).digest('hex') }
}

export async function publicApiRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // T1: registry
  app.get('/registry', async () => ({
    clientTypes: ['server', 'browser', 'mobile', 'cli'],
    tiers: ['free', 'starter', 'pro', 'enterprise'],
    quotaTypes: ['requests-per-day', 'requests-per-minute', 'bandwidth-mb-per-day'],
    docCategories: ['getting-started', 'guides', 'reference', 'changelog'],
    incidentSeverities: ['minor', 'major', 'critical'],
    incidentStatuses: ['investigating', 'identified', 'monitoring', 'resolved'],
  }))

  // T2: register client
  app.post('/clients', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { name, clientType = 'server', contactEmail, tier = 'free', metadata } = req.body as any
    const client = await prisma.pubApiClient.create({
      data: { tenantId: r.tenantId, name, clientType, contactEmail, tier, status: 'active', metadata: metadata as never },
    })
    const defaults: Record<string, number> = { free: 1000, starter: 10000, pro: 100000, enterprise: 1000000 }
    await prisma.pubQuota.create({
      data: { tenantId: r.tenantId, clientId: client.id, quotaType: 'requests-per-day', limitValue: defaults[tier] ?? 1000, resetsAt: new Date(Date.now() + 86400000) },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'CREATE', module: 'public-api', entityType: 'PubApiClient', entityId: client.id, newValues: { name, tier } as never } as never }).catch(() => null)
    return client
  })

  // T3: list clients
  app.get('/clients', async (req) => {
    const r = req as unknown as { tenantId: string }
    const clients = await prisma.pubApiClient.findMany({ where: { tenantId: r.tenantId }, include: { _count: { select: { keys: true, usageRecords: true } } } })
    return { clients, total: clients.length }
  })

  // T4: update client (tier change adjusts quota)
  app.patch('/clients/:cid', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { cid } = req.params as any
    const data = req.body as any
    const client = await prisma.pubApiClient.update({ where: { id: cid }, data: { ...data, metadata: data.metadata as never } })
    if (data.tier) {
      const defaults: Record<string, number> = { free: 1000, starter: 10000, pro: 100000, enterprise: 1000000 }
      await prisma.pubQuota.updateMany({ where: { clientId: cid, quotaType: 'requests-per-day' }, data: { limitValue: defaults[data.tier] ?? 1000 } })
    }
    return client
  })

  // T5: issue API key (full key returned ONCE)
  app.post('/clients/:cid/keys', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { cid } = req.params as any
    const { label, scopes, expiresAt } = req.body as any
    const { full, prefix, hash } = makeKey()
    const key = await prisma.pubApiKey.create({
      data: { tenantId: r.tenantId, clientId: cid, keyPrefix: prefix, keyHash: hash, label, scopes: scopes as never, isActive: true, expiresAt: expiresAt ? new Date(expiresAt) : null },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'ISSUE_KEY', module: 'public-api', entityType: 'PubApiKey', entityId: key.id, newValues: { prefix, label } as never } as never }).catch(() => null)
    return { id: key.id, apiKey: full, keyPrefix: prefix, note: 'Store this key now — it will not be shown again.' }
  })

  // T6: list keys (prefix only, never hash or full key)
  app.get('/clients/:cid/keys', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { cid } = req.params as any
    const keys = await prisma.pubApiKey.findMany({
      where: { clientId: cid, tenantId: r.tenantId },
      select: { id: true, keyPrefix: true, label: true, scopes: true, isActive: true, lastUsedAt: true, expiresAt: true, createdAt: true },
    })
    return { keys, total: keys.length }
  })

  // T7: verify key (hash comparison)
  app.post('/keys/verify', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { apiKey } = req.body as any
    const hash = createHash('sha256').update(apiKey ?? '').digest('hex')
    const key = await prisma.pubApiKey.findFirst({
      where: { tenantId: r.tenantId, keyHash: hash, isActive: true },
      include: { client: { select: { name: true, status: true, tier: true } } },
    })
    if (!key) return { valid: false }
    if (key.expiresAt && key.expiresAt < new Date()) return { valid: false, reason: 'expired' }
    if (key.client.status !== 'active') return { valid: false, reason: 'client-suspended' }
    await prisma.pubApiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    return { valid: true, client: key.client.name, tier: key.client.tier, scopes: key.scopes }
  })

  // T8: revoke key
  app.post('/keys/:kid/revoke', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { kid } = req.params as any
    await prisma.pubApiKey.update({ where: { id: kid }, data: { isActive: false } })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'REVOKE_KEY', module: 'public-api', entityType: 'PubApiKey', entityId: kid, newValues: { revoked: true } as never } as never }).catch(() => null)
    return { success: true }
  })

  // T9: record usage (consumes quota)
  app.post('/clients/:cid/usage', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { cid } = req.params as any
    const { endpoint, method = 'GET', statusCode = 200, latencyMs = 0 } = req.body as any
    const quota = await prisma.pubQuota.findFirst({ where: { clientId: cid, quotaType: 'requests-per-day' } })
    if (quota && quota.usedValue >= quota.limitValue) {
      return { error: 'quota exceeded', limit: quota.limitValue, used: quota.usedValue }
    }
    const record = await prisma.pubUsageRecord.create({
      data: { tenantId: r.tenantId, clientId: cid, endpoint, method, statusCode, latencyMs },
    })
    if (quota) await prisma.pubQuota.update({ where: { id: quota.id }, data: { usedValue: { increment: 1 } } })
    return record
  })

  // T10: usage analytics per client
  app.get('/clients/:cid/usage', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { cid } = req.params as any
    const records = await prisma.pubUsageRecord.findMany({ where: { clientId: cid, tenantId: r.tenantId }, orderBy: { recordedAt: 'desc' }, take: 500 })
    const byEndpoint: Record<string, number> = {}
    let errors = 0, totalLatency = 0
    for (const u of records) {
      byEndpoint[u.endpoint] = (byEndpoint[u.endpoint] ?? 0) + 1
      if (u.statusCode >= 400) errors++
      totalLatency += u.latencyMs
    }
    return {
      total: records.length, byEndpoint, errorRate: records.length ? Number((errors / records.length).toFixed(3)) : 0,
      avgLatencyMs: records.length ? Math.round(totalLatency / records.length) : 0,
    }
  })

  // T11: quota status
  app.get('/clients/:cid/quotas', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { cid } = req.params as any
    const quotas = await prisma.pubQuota.findMany({ where: { clientId: cid, tenantId: r.tenantId } })
    return { quotas: quotas.map(q => ({ ...q, remainingValue: Math.max(0, q.limitValue - q.usedValue), pctUsed: Number(((q.usedValue / q.limitValue) * 100).toFixed(1)) })), total: quotas.length }
  })

  // T12: set custom quota
  app.post('/clients/:cid/quotas', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { cid } = req.params as any
    const { quotaType, limitValue } = req.body as any
    return prisma.pubQuota.upsert({
      where: { clientId_quotaType: { clientId: cid, quotaType } },
      update: { limitValue },
      create: { tenantId: r.tenantId, clientId: cid, quotaType, limitValue, resetsAt: new Date(Date.now() + 86400000) },
    })
  })

  // T13: reset quota
  app.post('/clients/:cid/quotas/reset', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { cid } = req.params as any
    const result = await prisma.pubQuota.updateMany({
      where: { clientId: cid, tenantId: r.tenantId },
      data: { usedValue: 0, resetsAt: new Date(Date.now() + 86400000) },
    })
    return { success: true, reset: result.count }
  })

  // T14: create doc page
  app.post('/docs', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { title, slug, content, category = 'guides', position = 0 } = req.body as any
    return prisma.pubDocPage.create({
      data: { tenantId: r.tenantId, title, slug, content, category, position, isPublished: false },
    })
  })

  // T15: list docs
  app.get('/docs', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { category, published } = req.query as any
    const where: any = { tenantId: r.tenantId }
    if (category) where.category = category
    if (published === 'true') where.isPublished = true
    const pages = await prisma.pubDocPage.findMany({ where, orderBy: [{ category: 'asc' }, { position: 'asc' }], select: { id: true, title: true, slug: true, category: true, position: true, isPublished: true } })
    return { pages, total: pages.length }
  })

  // T16: get doc by slug
  app.get('/docs/:slug', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { slug } = req.params as any
    return prisma.pubDocPage.findFirstOrThrow({ where: { slug, tenantId: r.tenantId } })
  })

  // T17: publish doc
  app.post('/docs/:did/publish', async (req) => {
    const { did } = req.params as any
    return prisma.pubDocPage.update({ where: { id: did }, data: { isPublished: true } })
  })

  // T18: update doc
  app.patch('/docs/:did', async (req) => {
    const { did } = req.params as any
    const data = req.body as any
    return prisma.pubDocPage.update({ where: { id: did }, data })
  })

  // T19: create status incident
  app.post('/status/incidents', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { title, severity = 'minor', affectedApis = [] } = req.body as any
    return prisma.pubStatusIncident.create({
      data: { tenantId: r.tenantId, title, severity, status: 'investigating', affectedApis: affectedApis as never, updates: [{ at: new Date().toISOString(), status: 'investigating', note: 'Incident opened' }] as never },
    })
  })

  // T20: post incident update
  app.post('/status/incidents/:iid/update', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { iid } = req.params as any
    const { status, note } = req.body as any
    const incident = await prisma.pubStatusIncident.findFirstOrThrow({ where: { id: iid, tenantId: r.tenantId } })
    const updates = [...((incident.updates as any[]) ?? []), { at: new Date().toISOString(), status, note }]
    return prisma.pubStatusIncident.update({
      where: { id: iid },
      data: { status, updates: updates as never, resolvedAt: status === 'resolved' ? new Date() : null },
    })
  })

  // T21: public status page
  app.get('/status', async (req) => {
    const r = req as unknown as { tenantId: string }
    const open = await prisma.pubStatusIncident.findMany({ where: { tenantId: r.tenantId, status: { not: 'resolved' } }, orderBy: { startedAt: 'desc' } })
    const recent = await prisma.pubStatusIncident.findMany({ where: { tenantId: r.tenantId, status: 'resolved' }, orderBy: { resolvedAt: 'desc' }, take: 5 })
    const overall = open.some(i => i.severity === 'critical') ? 'major-outage' : open.some(i => i.severity === 'major') ? 'partial-outage' : open.length > 0 ? 'degraded' : 'operational'
    return { overall, openIncidents: open, recentResolved: recent }
  })

  // T22: suspend client
  app.post('/clients/:cid/suspend', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { cid } = req.params as any
    const client = await prisma.pubApiClient.update({ where: { id: cid }, data: { status: 'suspended' } })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'SUSPEND', module: 'public-api', entityType: 'PubApiClient', entityId: cid, newValues: { status: 'suspended' } as never } as never }).catch(() => null)
    return client
  })

  // T23: reactivate client
  app.post('/clients/:cid/reactivate', async (req) => {
    const { cid } = req.params as any
    return prisma.pubApiClient.update({ where: { id: cid }, data: { status: 'active' } })
  })

  // T24: stats
  app.get('/stats', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [clients, keys, usage, quotas, docs, incidents] = await Promise.all([
      prisma.pubApiClient.count({ where: { tenantId: r.tenantId } }),
      prisma.pubApiKey.count({ where: { tenantId: r.tenantId } }),
      prisma.pubUsageRecord.count({ where: { tenantId: r.tenantId } }),
      prisma.pubQuota.count({ where: { tenantId: r.tenantId } }),
      prisma.pubDocPage.count({ where: { tenantId: r.tenantId } }),
      prisma.pubStatusIncident.count({ where: { tenantId: r.tenantId } }),
    ])
    return { clients, keys, usageRecords: usage, quotas, docPages: docs, incidents }
  })

  // T25: simulate traffic (usage records for testing)
  app.post('/clients/:cid/simulate-traffic', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { cid } = req.params as any
    const { count = 10 } = req.body as any
    const endpoints = ['/v1/users', '/v1/crm/contacts', '/v1/finance/invoices', '/v1/reports']
    let created = 0
    for (let i = 0; i < Math.min(count, 50); i++) {
      await prisma.pubUsageRecord.create({
        data: {
          tenantId: r.tenantId, clientId: cid,
          endpoint: endpoints[i % endpoints.length], method: 'GET',
          statusCode: Math.random() > 0.95 ? 500 : 200, latencyMs: Math.floor(Math.random() * 300) + 10,
        },
      })
      created++
    }
    await prisma.pubQuota.updateMany({ where: { clientId: cid, quotaType: 'requests-per-day' }, data: { usedValue: { increment: created } } })
    return { created }
  })

  // T26: delete doc
  app.delete('/docs/:did', async (req) => {
    const { did } = req.params as any
    await prisma.pubDocPage.delete({ where: { id: did } })
    return { success: true }
  })

  // T27: delete key
  app.delete('/keys/:kid', async (req) => {
    const { kid } = req.params as any
    await prisma.pubApiKey.delete({ where: { id: kid } })
    return { success: true }
  })

  // T28: delete client
  app.delete('/clients/:cid', async (req) => {
    const { cid } = req.params as any
    await prisma.pubApiClient.delete({ where: { id: cid } })
    return { success: true }
  })
}
