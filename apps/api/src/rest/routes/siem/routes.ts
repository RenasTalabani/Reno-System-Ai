import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function siemRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // T1: registry
  app.get('/registry', async () => ({
    sourceTypes: ['application', 'firewall', 'ids', 'endpoint', 'cloud', 'identity', 'database'],
    formats: ['json', 'syslog', 'cef', 'leef'],
    severities: ['debug', 'info', 'warning', 'error', 'critical'],
    detectionStatuses: ['new', 'triaged', 'escalated', 'dismissed'],
    eventTypes: ['auth-failure', 'auth-success', 'privilege-change', 'file-access', 'network-conn', 'malware-detected', 'config-change'],
  }))

  // T2: create log source
  app.post('/sources', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { name, sourceType = 'application', format = 'json', metadata } = req.body as any
    const source = await prisma.siemLogSource.create({
      data: { tenantId: r.tenantId, name, sourceType, format, status: 'active', metadata: metadata as never },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'CREATE', module: 'siem', entityType: 'SiemLogSource', entityId: source.id, newValues: { name, sourceType } as never } as never }).catch(() => null)
    return source
  })

  // T3: list sources
  app.get('/sources', async (req) => {
    const r = req as unknown as { tenantId: string }
    const sources = await prisma.siemLogSource.findMany({ where: { tenantId: r.tenantId }, orderBy: { createdAt: 'desc' }, include: { _count: { select: { events: true } } } })
    return { sources, total: sources.length }
  })

  // T4: update source
  app.patch('/sources/:sid', async (req) => {
    const { sid } = req.params as any
    const data = req.body as any
    return prisma.siemLogSource.update({ where: { id: sid }, data: { ...data, metadata: data.metadata as never } })
  })

  // T5: ingest event
  app.post('/sources/:sid/ingest', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { sid } = req.params as any
    const { eventType, severity = 'info', message, actor, targetRes, sourceIp, raw } = req.body as any
    const event = await prisma.siemEvent.create({
      data: { tenantId: r.tenantId, sourceId: sid, eventType, severity, message, actor, targetRes, sourceIp, raw: raw as never },
    })
    await prisma.siemLogSource.update({ where: { id: sid }, data: { lastEventAt: new Date(), eventsPerDay: { increment: 1 } } })
    return event
  })

  // T6: bulk ingest
  app.post('/sources/:sid/ingest-batch', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { sid } = req.params as any
    const { events = [] } = req.body as any
    let created = 0
    for (const e of events.slice(0, 200)) {
      await prisma.siemEvent.create({
        data: { tenantId: r.tenantId, sourceId: sid, eventType: e.eventType ?? 'generic', severity: e.severity ?? 'info', message: e.message ?? '', actor: e.actor, targetRes: e.targetRes, sourceIp: e.sourceIp, raw: e.raw as never },
      })
      created++
    }
    await prisma.siemLogSource.update({ where: { id: sid }, data: { lastEventAt: new Date(), eventsPerDay: { increment: created } } })
    return { ingested: created }
  })

  // T7: search events
  app.get('/events/search', async (req) => {
    const r = req as unknown as { tenantId: string }
    const q = req.query as any
    const where: any = { tenantId: r.tenantId }
    if (q.eventType) where.eventType = q.eventType
    if (q.severity) where.severity = q.severity
    if (q.actor) where.actor = { contains: q.actor }
    if (q.sourceIp) where.sourceIp = q.sourceIp
    if (q.text) where.message = { contains: q.text, mode: 'insensitive' }
    const limit = Math.min(parseInt(q.limit ?? '100'), 500)
    const events = await prisma.siemEvent.findMany({ where, orderBy: { occurredAt: 'desc' }, take: limit })
    return { events, total: events.length }
  })

  // T8: event aggregation (group by field)
  app.get('/events/aggregate', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { by = 'eventType' } = req.query as any
    const events = await prisma.siemEvent.findMany({ where: { tenantId: r.tenantId }, take: 1000, orderBy: { occurredAt: 'desc' } })
    const counts: Record<string, number> = {}
    for (const e of events) {
      const key = by === 'severity' ? e.severity : by === 'actor' ? (e.actor ?? 'unknown') : by === 'sourceIp' ? (e.sourceIp ?? 'unknown') : e.eventType
      counts[key] = (counts[key] ?? 0) + 1
    }
    return { by, counts, sampled: events.length }
  })

  // T9: create correlation rule
  app.post('/rules', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { name, description, eventType, threshold = 5, windowMinutes = 10, severity = 'high', metadata } = req.body as any
    return prisma.siemCorrelationRule.create({
      data: { tenantId: r.tenantId, name, description, eventType, threshold, windowMinutes, severity, isActive: true, metadata: metadata as never },
    })
  })

  // T10: list rules
  app.get('/rules', async (req) => {
    const r = req as unknown as { tenantId: string }
    const rules = await prisma.siemCorrelationRule.findMany({ where: { tenantId: r.tenantId }, include: { _count: { select: { detections: true } } } })
    return { rules, total: rules.length }
  })

  // T11: update rule
  app.patch('/rules/:rid', async (req) => {
    const { rid } = req.params as any
    const data = req.body as any
    return prisma.siemCorrelationRule.update({ where: { id: rid }, data: { ...data, metadata: data.metadata as never } })
  })

  // T12: run correlation engine (evaluates all active rules)
  app.post('/correlate', async (req) => {
    const r = req as unknown as { tenantId: string }
    const rules = await prisma.siemCorrelationRule.findMany({ where: { tenantId: r.tenantId, isActive: true } })
    const detections = []
    for (const rule of rules) {
      const windowStart = new Date(Date.now() - rule.windowMinutes * 60000)
      const count = await prisma.siemEvent.count({
        where: { tenantId: r.tenantId, eventType: rule.eventType, occurredAt: { gte: windowStart } },
      })
      if (count >= rule.threshold) {
        const detection = await prisma.siemDetection.create({
          data: {
            tenantId: r.tenantId, ruleId: rule.id, matchCount: count, severity: rule.severity,
            status: 'new', summary: `Rule "${rule.name}": ${count} × ${rule.eventType} in ${rule.windowMinutes}min (threshold ${rule.threshold})`,
            evidence: { eventType: rule.eventType, count, windowMinutes: rule.windowMinutes } as never,
          },
        })
        detections.push(detection)
      }
    }
    return { rulesEvaluated: rules.length, detections: detections.length, results: detections }
  })

  // T13: list detections
  app.get('/detections', async (req) => {
    const r = req as unknown as { tenantId: string }
    const detections = await prisma.siemDetection.findMany({ where: { tenantId: r.tenantId }, orderBy: { detectedAt: 'desc' }, take: 100, include: { rule: { select: { name: true } } } })
    return { detections, total: detections.length }
  })

  // T14: update detection status (triage)
  app.patch('/detections/:did', async (req) => {
    const { did } = req.params as any
    const { status } = req.body as any
    return prisma.siemDetection.update({ where: { id: did }, data: { status } })
  })

  // T15: save query
  app.post('/queries', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { name, query, metadata } = req.body as any
    return prisma.siemSavedQuery.create({
      data: { tenantId: r.tenantId, name, query: query as never, createdBy: r.userId, metadata: metadata as never },
    })
  })

  // T16: list saved queries
  app.get('/queries', async (req) => {
    const r = req as unknown as { tenantId: string }
    const queries = await prisma.siemSavedQuery.findMany({ where: { tenantId: r.tenantId } })
    return { queries, total: queries.length }
  })

  // T17: run saved query
  app.post('/queries/:qid/run', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { qid } = req.params as any
    const saved = await prisma.siemSavedQuery.findFirstOrThrow({ where: { id: qid, tenantId: r.tenantId } })
    const q = saved.query as any
    const where: any = { tenantId: r.tenantId }
    if (q.eventType) where.eventType = q.eventType
    if (q.severity) where.severity = q.severity
    if (q.actor) where.actor = { contains: q.actor }
    const events = await prisma.siemEvent.findMany({ where, orderBy: { occurredAt: 'desc' }, take: 100 })
    await prisma.siemSavedQuery.update({ where: { id: qid }, data: { runCount: { increment: 1 }, lastRunAt: new Date() } })
    return { events, total: events.length, query: saved.name }
  })

  // T18: create retention policy
  app.post('/retention-policies', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { name, sourceType = 'all', retentionDays = 90, archiveEnabled = false, metadata } = req.body as any
    return prisma.siemRetentionPolicy.create({
      data: { tenantId: r.tenantId, name, sourceType, retentionDays, archiveEnabled, isActive: true, metadata: metadata as never },
    })
  })

  // T19: list retention policies
  app.get('/retention-policies', async (req) => {
    const r = req as unknown as { tenantId: string }
    const policies = await prisma.siemRetentionPolicy.findMany({ where: { tenantId: r.tenantId } })
    return { policies, total: policies.length }
  })

  // T20: apply retention (dry-run supported)
  app.post('/retention-policies/:rpid/apply', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { rpid } = req.params as any
    const { dryRun = true } = req.body as any
    const policy = await prisma.siemRetentionPolicy.findFirstOrThrow({ where: { id: rpid, tenantId: r.tenantId } })
    const cutoff = new Date(Date.now() - policy.retentionDays * 86400000)
    const count = await prisma.siemEvent.count({ where: { tenantId: r.tenantId, occurredAt: { lt: cutoff } } })
    if (!dryRun && count > 0) {
      await prisma.siemEvent.deleteMany({ where: { tenantId: r.tenantId, occurredAt: { lt: cutoff } } })
      await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'RETENTION_APPLY', module: 'siem', entityType: 'SiemRetentionPolicy', entityId: rpid, newValues: { deleted: count } as never } as never }).catch(() => null)
    }
    return { dryRun, affectedEvents: count, cutoff: cutoff.toISOString() }
  })

  // T21: SIEM overview
  app.get('/overview', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [sources, events, rules, detections] = await Promise.all([
      prisma.siemLogSource.count({ where: { tenantId: r.tenantId } }),
      prisma.siemEvent.count({ where: { tenantId: r.tenantId } }),
      prisma.siemCorrelationRule.count({ where: { tenantId: r.tenantId, isActive: true } }),
      prisma.siemDetection.findMany({ where: { tenantId: r.tenantId }, take: 200, orderBy: { detectedAt: 'desc' } }),
    ])
    const newDetections = detections.filter(d => d.status === 'new').length
    const last24h = await prisma.siemEvent.count({ where: { tenantId: r.tenantId, occurredAt: { gte: new Date(Date.now() - 86400000) } } })
    return { sources, totalEvents: events, eventsLast24h: last24h, activeRules: rules, totalDetections: detections.length, newDetections }
  })

  // T22: stats
  app.get('/stats', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [sources, events, rules, detections, queries, policies] = await Promise.all([
      prisma.siemLogSource.count({ where: { tenantId: r.tenantId } }),
      prisma.siemEvent.count({ where: { tenantId: r.tenantId } }),
      prisma.siemCorrelationRule.count({ where: { tenantId: r.tenantId } }),
      prisma.siemDetection.count({ where: { tenantId: r.tenantId } }),
      prisma.siemSavedQuery.count({ where: { tenantId: r.tenantId } }),
      prisma.siemRetentionPolicy.count({ where: { tenantId: r.tenantId } }),
    ])
    return { sources, events, rules, detections, savedQueries: queries, retentionPolicies: policies }
  })

  // T23: event timeline (hourly buckets)
  app.get('/events/timeline', async (req) => {
    const r = req as unknown as { tenantId: string }
    const events = await prisma.siemEvent.findMany({ where: { tenantId: r.tenantId, occurredAt: { gte: new Date(Date.now() - 86400000) } }, select: { occurredAt: true, severity: true } })
    const buckets: Record<string, number> = {}
    for (const e of events) {
      const hour = new Date(e.occurredAt).toISOString().slice(0, 13)
      buckets[hour] = (buckets[hour] ?? 0) + 1
    }
    return { buckets, total: events.length }
  })

  // T24: simulate event storm (for testing correlation)
  app.post('/simulate/storm', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { sourceId, eventType = 'auth-failure', count = 10 } = req.body as any
    let created = 0
    for (let i = 0; i < Math.min(count, 50); i++) {
      await prisma.siemEvent.create({
        data: { tenantId: r.tenantId, sourceId, eventType, severity: 'warning', message: `Simulated ${eventType} #${i + 1}`, actor: 'sim-user', sourceIp: '198.51.100.' + (i % 255), raw: { simulated: true } as never },
      })
      created++
    }
    return { created, eventType }
  })

  // T25: delete rule
  app.delete('/rules/:rid', async (req) => {
    const { rid } = req.params as any
    await prisma.siemCorrelationRule.delete({ where: { id: rid } })
    return { success: true }
  })

  // T26: delete saved query
  app.delete('/queries/:qid', async (req) => {
    const { qid } = req.params as any
    await prisma.siemSavedQuery.delete({ where: { id: qid } })
    return { success: true }
  })

  // T27: delete retention policy
  app.delete('/retention-policies/:rpid', async (req) => {
    const { rpid } = req.params as any
    await prisma.siemRetentionPolicy.delete({ where: { id: rpid } })
    return { success: true }
  })

  // T28: delete source
  app.delete('/sources/:sid', async (req) => {
    const { sid } = req.params as any
    await prisma.siemLogSource.delete({ where: { id: sid } })
    return { success: true }
  })
}
