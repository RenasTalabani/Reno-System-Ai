import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function cdnRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // T1: registry
  app.get('/registry', async () => ({
    sslModes: ['off', 'flexible', 'full', 'strict'],
    cacheLevels: ['bypass', 'basic', 'standard', 'aggressive'],
    purgeTypes: ['url', 'prefix', 'tag', 'everything'],
    edgeStatuses: ['online', 'offline', 'maintenance'],
  }))

  // T2: create zone
  app.post('/zones', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { name, domain, sslMode = 'full', cacheLevel = 'standard', metadata } = req.body as any
    const zone = await prisma.cdnZone.create({
      data: { tenantId: r.tenantId, name, domain, sslMode, cacheLevel, status: 'active', metadata: metadata as never },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'CREATE', module: 'cdn', entityType: 'CdnZone', entityId: zone.id, newValues: { name, domain } as never } as never }).catch(() => null)
    return zone
  })

  // T3: list zones
  app.get('/zones', async (req) => {
    const r = req as unknown as { tenantId: string }
    const zones = await prisma.cdnZone.findMany({ where: { tenantId: r.tenantId }, orderBy: { createdAt: 'desc' }, include: { _count: { select: { origins: true, cacheRules: true, purgeRequests: true } } } })
    return { zones, total: zones.length }
  })

  // T4: get zone
  app.get('/zones/:zid', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { zid } = req.params as any
    return prisma.cdnZone.findFirstOrThrow({ where: { id: zid, tenantId: r.tenantId }, include: { origins: true, cacheRules: { orderBy: { priority: 'desc' } } } })
  })

  // T5: update zone
  app.patch('/zones/:zid', async (req) => {
    const { zid } = req.params as any
    const data = req.body as any
    return prisma.cdnZone.update({ where: { id: zid }, data: { ...data, metadata: data.metadata as never } })
  })

  // T6: create origin
  app.post('/zones/:zid/origins', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { zid } = req.params as any
    const { name, originUrl, weight = 100, isBackup = false, metadata } = req.body as any
    return prisma.cdnOrigin.create({
      data: { tenantId: r.tenantId, zoneId: zid, name, originUrl, weight, isBackup, status: 'healthy', metadata: metadata as never },
    })
  })

  // T7: list origins
  app.get('/zones/:zid/origins', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { zid } = req.params as any
    const origins = await prisma.cdnOrigin.findMany({ where: { zoneId: zid, tenantId: r.tenantId } })
    return { origins, total: origins.length }
  })

  // T8: update origin
  app.patch('/zones/:zid/origins/:oid', async (req) => {
    const { oid } = req.params as any
    const data = req.body as any
    return prisma.cdnOrigin.update({ where: { id: oid }, data: { ...data, metadata: data.metadata as never } })
  })

  // T9: origin health check (simulation)
  app.post('/zones/:zid/origins/:oid/health-check', async (req) => {
    const { oid } = req.params as any
    const latencyMs = Math.floor(Math.random() * 100) + 10
    const status = latencyMs < 80 ? 'healthy' : 'degraded'
    await prisma.cdnOrigin.update({ where: { id: oid }, data: { status } })
    return { originId: oid, status, latencyMs, checkedAt: new Date().toISOString() }
  })

  // T10: create cache rule
  app.post('/zones/:zid/cache-rules', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { zid } = req.params as any
    const { name, pathPattern, ttlSeconds = 3600, cacheable = true, priority = 0, metadata } = req.body as any
    return prisma.cdnCacheRule.create({
      data: { tenantId: r.tenantId, zoneId: zid, name, pathPattern, ttlSeconds, cacheable, priority, isActive: true, metadata: metadata as never },
    })
  })

  // T11: list cache rules
  app.get('/zones/:zid/cache-rules', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { zid } = req.params as any
    const rules = await prisma.cdnCacheRule.findMany({ where: { zoneId: zid, tenantId: r.tenantId }, orderBy: { priority: 'desc' } })
    return { rules, total: rules.length }
  })

  // T12: update cache rule
  app.patch('/zones/:zid/cache-rules/:crid', async (req) => {
    const { crid } = req.params as any
    const data = req.body as any
    return prisma.cdnCacheRule.update({ where: { id: crid }, data: { ...data, metadata: data.metadata as never } })
  })

  // T13: test cache rule matching
  app.post('/zones/:zid/test-path', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { zid } = req.params as any
    const { path } = req.body as any
    const rules = await prisma.cdnCacheRule.findMany({ where: { zoneId: zid, tenantId: r.tenantId, isActive: true }, orderBy: { priority: 'desc' } })
    for (const rule of rules) {
      const regex = new RegExp('^' + rule.pathPattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$')
      if (regex.test(path)) {
        return { matched: true, rule: { id: rule.id, name: rule.name, pathPattern: rule.pathPattern, ttlSeconds: rule.ttlSeconds, cacheable: rule.cacheable } }
      }
    }
    return { matched: false, defaultTtl: 3600 }
  })

  // T14: seed edge locations
  app.post('/edge-locations/seed', async (req) => {
    const r = req as unknown as { tenantId: string }
    const defaults = [
      { code: 'iad', city: 'Washington DC', country: 'US' },
      { code: 'lhr', city: 'London', country: 'GB' },
      { code: 'fra', city: 'Frankfurt', country: 'DE' },
      { code: 'sin', city: 'Singapore', country: 'SG' },
      { code: 'nrt', city: 'Tokyo', country: 'JP' },
      { code: 'syd', city: 'Sydney', country: 'AU' },
      { code: 'dxb', city: 'Dubai', country: 'AE' },
      { code: 'gru', city: 'São Paulo', country: 'BR' },
    ]
    let created = 0
    for (const loc of defaults) {
      const existing = await prisma.cdnEdgeLocation.findFirst({ where: { tenantId: r.tenantId, code: loc.code } })
      if (!existing) {
        await prisma.cdnEdgeLocation.create({
          data: { tenantId: r.tenantId, ...loc, status: 'online', capacityGbps: 100 + Math.floor(Math.random() * 400), hitRate: 80 + Math.random() * 18 },
        })
        created++
      }
    }
    return { created, total: defaults.length }
  })

  // T15: list edge locations
  app.get('/edge-locations', async (req) => {
    const r = req as unknown as { tenantId: string }
    const locations = await prisma.cdnEdgeLocation.findMany({ where: { tenantId: r.tenantId }, orderBy: { code: 'asc' } })
    return { locations, total: locations.length }
  })

  // T16: update edge location
  app.patch('/edge-locations/:eid', async (req) => {
    const { eid } = req.params as any
    const data = req.body as any
    return prisma.cdnEdgeLocation.update({ where: { id: eid }, data: { ...data, metadata: data.metadata as never } })
  })

  // T17: purge cache (audited)
  app.post('/zones/:zid/purge', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { zid } = req.params as any
    const { purgeType = 'url', paths = [] } = req.body as any
    const purge = await prisma.cdnPurgeRequest.create({
      data: { tenantId: r.tenantId, zoneId: zid, purgeType, paths: paths as never, status: 'completed', requestedBy: r.userId },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'PURGE', module: 'cdn', entityType: 'CdnZone', entityId: zid, newValues: { purgeType, pathCount: paths.length } as never } as never }).catch(() => null)
    return purge
  })

  // T18: list purge requests
  app.get('/zones/:zid/purge-requests', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { zid } = req.params as any
    const requests = await prisma.cdnPurgeRequest.findMany({ where: { zoneId: zid, tenantId: r.tenantId }, orderBy: { createdAt: 'desc' }, take: 50 })
    return { requests, total: requests.length }
  })

  // T19: record analytics sample (simulation)
  app.post('/zones/:zid/analytics/simulate', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { zid } = req.params as any
    const requests = Math.floor(Math.random() * 100000) + 1000
    const hits = Math.floor(requests * (0.7 + Math.random() * 0.25))
    return prisma.cdnAnalytic.create({
      data: {
        tenantId: r.tenantId, zoneId: zid,
        requests, bandwidth: Math.random() * 500,
        cacheHits: hits, cacheMisses: requests - hits,
        errors4xx: Math.floor(requests * 0.01), errors5xx: Math.floor(requests * 0.002),
      },
    })
  })

  // T20: zone analytics
  app.get('/zones/:zid/analytics', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { zid } = req.params as any
    const samples = await prisma.cdnAnalytic.findMany({ where: { zoneId: zid, tenantId: r.tenantId }, orderBy: { recordedAt: 'desc' }, take: 50 })
    const totals = samples.reduce((acc, s) => ({
      requests: acc.requests + s.requests, bandwidth: acc.bandwidth + s.bandwidth,
      cacheHits: acc.cacheHits + s.cacheHits, cacheMisses: acc.cacheMisses + s.cacheMisses,
      errors4xx: acc.errors4xx + s.errors4xx, errors5xx: acc.errors5xx + s.errors5xx,
    }), { requests: 0, bandwidth: 0, cacheHits: 0, cacheMisses: 0, errors4xx: 0, errors5xx: 0 })
    const hitRate = totals.cacheHits + totals.cacheMisses > 0 ? (totals.cacheHits / (totals.cacheHits + totals.cacheMisses)) * 100 : 0
    return { samples, totals: { ...totals, hitRate: Number(hitRate.toFixed(1)) } }
  })

  // T21: global CDN health
  app.get('/health', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [zones, edges] = await Promise.all([
      prisma.cdnZone.findMany({ where: { tenantId: r.tenantId } }),
      prisma.cdnEdgeLocation.findMany({ where: { tenantId: r.tenantId } }),
    ])
    return {
      totalZones: zones.length,
      activeZones: zones.filter(z => z.status === 'active').length,
      totalEdges: edges.length,
      onlineEdges: edges.filter(e => e.status === 'online').length,
      avgHitRate: edges.length ? Number((edges.reduce((s, e) => s + e.hitRate, 0) / edges.length).toFixed(1)) : 0,
    }
  })

  // T22: toggle zone (pause/resume)
  app.post('/zones/:zid/toggle', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { zid } = req.params as any
    const zone = await prisma.cdnZone.findFirstOrThrow({ where: { id: zid, tenantId: r.tenantId } })
    const status = zone.status === 'active' ? 'paused' : 'active'
    await prisma.cdnZone.update({ where: { id: zid }, data: { status } })
    return { success: true, status }
  })

  // T23: overall stats
  app.get('/stats', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [zones, origins, rules, edges, purges, analytics] = await Promise.all([
      prisma.cdnZone.count({ where: { tenantId: r.tenantId } }),
      prisma.cdnOrigin.count({ where: { tenantId: r.tenantId } }),
      prisma.cdnCacheRule.count({ where: { tenantId: r.tenantId } }),
      prisma.cdnEdgeLocation.count({ where: { tenantId: r.tenantId } }),
      prisma.cdnPurgeRequest.count({ where: { tenantId: r.tenantId } }),
      prisma.cdnAnalytic.count({ where: { tenantId: r.tenantId } }),
    ])
    return { zones, origins, cacheRules: rules, edgeLocations: edges, purgeRequests: purges, analyticsSamples: analytics }
  })

  // T24: edge traffic simulation
  app.post('/edge-locations/simulate-traffic', async (req) => {
    const r = req as unknown as { tenantId: string }
    const edges = await prisma.cdnEdgeLocation.findMany({ where: { tenantId: r.tenantId, status: 'online' } })
    const results = []
    for (const e of edges) {
      const hitRate = 70 + Math.random() * 28
      await prisma.cdnEdgeLocation.update({ where: { id: e.id }, data: { hitRate } })
      results.push({ code: e.code, city: e.city, requestsPerSec: Math.floor(Math.random() * 50000), hitRate: Number(hitRate.toFixed(1)) })
    }
    return { results, simulatedAt: new Date().toISOString() }
  })

  // T25: delete cache rule
  app.delete('/zones/:zid/cache-rules/:crid', async (req) => {
    const { crid } = req.params as any
    await prisma.cdnCacheRule.delete({ where: { id: crid } })
    return { success: true }
  })

  // T26: delete origin
  app.delete('/zones/:zid/origins/:oid', async (req) => {
    const { oid } = req.params as any
    await prisma.cdnOrigin.delete({ where: { id: oid } })
    return { success: true }
  })

  // T27: delete edge location
  app.delete('/edge-locations/:eid', async (req) => {
    const { eid } = req.params as any
    await prisma.cdnEdgeLocation.delete({ where: { id: eid } })
    return { success: true }
  })

  // T28: delete zone
  app.delete('/zones/:zid', async (req) => {
    const { zid } = req.params as any
    await prisma.cdnZone.delete({ where: { id: zid } })
    return { success: true }
  })
}
