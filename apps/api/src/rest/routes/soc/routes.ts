import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function socRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // T1: registry
  app.get('/registry', async () => ({
    severities: ['low', 'medium', 'high', 'critical'],
    incidentStatuses: ['open', 'investigating', 'contained', 'resolved', 'closed'],
    categories: ['intrusion', 'malware', 'phishing', 'data-leak', 'dos', 'insider-threat', 'misconfiguration'],
    indicatorTypes: ['ip', 'domain', 'url', 'hash', 'email'],
    shiftTypes: ['day', 'night', 'weekend'],
    playbookTriggers: ['manual', 'incident-created', 'alert-triggered', 'scheduled'],
  }))

  // T2: create incident
  app.post('/incidents', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { title, severity = 'medium', category = 'intrusion', description, assignee, metadata } = req.body as any
    const incident = await prisma.socIncident.create({
      data: { tenantId: r.tenantId, title, severity, category, description, assignee, status: 'open', metadata: metadata as never },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'CREATE', module: 'soc', entityType: 'SocIncident', entityId: incident.id, newValues: { title, severity } as never } as never }).catch(() => null)
    return incident
  })

  // T3: list incidents
  app.get('/incidents', async (req) => {
    const r = req as unknown as { tenantId: string }
    const status = (req.query as any).status
    const where: any = { tenantId: r.tenantId }
    if (status) where.status = status
    const incidents = await prisma.socIncident.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 })
    return { incidents, total: incidents.length }
  })

  // T4: get incident
  app.get('/incidents/:iid', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { iid } = req.params as any
    return prisma.socIncident.findFirstOrThrow({ where: { id: iid, tenantId: r.tenantId }, include: { playbookRuns: true } })
  })

  // T5: update incident (status transitions, assignment)
  app.patch('/incidents/:iid', async (req) => {
    const { iid } = req.params as any
    const data = req.body as any
    return prisma.socIncident.update({ where: { id: iid }, data: { ...data, metadata: data.metadata as never } })
  })

  // T6: resolve incident (computes MTTR)
  app.post('/incidents/:iid/resolve', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { iid } = req.params as any
    const incident = await prisma.socIncident.findFirstOrThrow({ where: { id: iid, tenantId: r.tenantId } })
    const resolvedAt = new Date()
    const mttrMinutes = Math.round((resolvedAt.getTime() - incident.detectedAt.getTime()) / 60000)
    const updated = await prisma.socIncident.update({
      where: { id: iid },
      data: { status: 'resolved', resolvedAt, mttrMinutes },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'RESOLVE', module: 'soc', entityType: 'SocIncident', entityId: iid, newValues: { mttrMinutes } as never } as never }).catch(() => null)
    return updated
  })

  // T7: create alert rule
  app.post('/alert-rules', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { name, source = 'logs', condition, severity = 'medium', metadata } = req.body as any
    return prisma.socAlertRule.create({
      data: { tenantId: r.tenantId, name, source, condition, severity, isActive: true, metadata: metadata as never },
    })
  })

  // T8: list alert rules
  app.get('/alert-rules', async (req) => {
    const r = req as unknown as { tenantId: string }
    const rules = await prisma.socAlertRule.findMany({ where: { tenantId: r.tenantId }, orderBy: { createdAt: 'desc' } })
    return { rules, total: rules.length }
  })

  // T9: update alert rule
  app.patch('/alert-rules/:rid', async (req) => {
    const { rid } = req.params as any
    const data = req.body as any
    return prisma.socAlertRule.update({ where: { id: rid }, data: { ...data, metadata: data.metadata as never } })
  })

  // T10: trigger alert rule (simulation — creates incident if severity high+)
  app.post('/alert-rules/:rid/trigger', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { rid } = req.params as any
    const rule = await prisma.socAlertRule.update({
      where: { id: rid },
      data: { triggerCount: { increment: 1 }, lastTriggeredAt: new Date() },
    })
    let incident = null
    if (rule.severity === 'high' || rule.severity === 'critical') {
      incident = await prisma.socIncident.create({
        data: { tenantId: r.tenantId, title: `Auto: ${rule.name}`, severity: rule.severity, category: 'intrusion', description: `Triggered by alert rule: ${rule.condition}`, status: 'open', metadata: { autoCreated: true, ruleId: rid } as never },
      })
    }
    return { triggered: true, rule, incidentCreated: incident?.id ?? null }
  })

  // T11: add threat intel indicator
  app.post('/threat-intel', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { indicator, indicatorType, threatType, confidence = 0.5, source, expiresAt, metadata } = req.body as any
    return prisma.socThreatIntel.create({
      data: { tenantId: r.tenantId, indicator, indicatorType, threatType, confidence, source, isActive: true, expiresAt: expiresAt ? new Date(expiresAt) : null, metadata: metadata as never },
    })
  })

  // T12: list threat intel
  app.get('/threat-intel', async (req) => {
    const r = req as unknown as { tenantId: string }
    const indicators = await prisma.socThreatIntel.findMany({ where: { tenantId: r.tenantId }, orderBy: { createdAt: 'desc' }, take: 200 })
    return { indicators, total: indicators.length }
  })

  // T13: check indicator (IOC lookup)
  app.post('/threat-intel/check', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { indicator } = req.body as any
    const match = await prisma.socThreatIntel.findFirst({
      where: { tenantId: r.tenantId, indicator, isActive: true },
    })
    return match
      ? { found: true, threat: { threatType: match.threatType, confidence: match.confidence, source: match.source } }
      : { found: false }
  })

  // T14: create playbook
  app.post('/playbooks', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { name, triggerType = 'manual', steps = [], metadata } = req.body as any
    return prisma.socPlaybook.create({
      data: { tenantId: r.tenantId, name, triggerType, steps: steps as never, isActive: true, metadata: metadata as never },
    })
  })

  // T15: list playbooks
  app.get('/playbooks', async (req) => {
    const r = req as unknown as { tenantId: string }
    const playbooks = await prisma.socPlaybook.findMany({ where: { tenantId: r.tenantId }, include: { _count: { select: { runs: true } } } })
    return { playbooks, total: playbooks.length }
  })

  // T16: run playbook (simulation — executes all steps)
  app.post('/playbooks/:pbid/run', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { pbid } = req.params as any
    const { incidentId } = req.body as any
    const playbook = await prisma.socPlaybook.findFirstOrThrow({ where: { id: pbid, tenantId: r.tenantId } })
    const steps = (playbook.steps as any[]) ?? []
    const log = steps.map((s, i) => ({ step: i + 1, action: s.action ?? s.name ?? `step-${i + 1}`, status: 'completed', at: new Date().toISOString() }))
    const run = await prisma.socPlaybookRun.create({
      data: { tenantId: r.tenantId, playbookId: pbid, incidentId, status: 'completed', stepsTotal: steps.length, stepsDone: steps.length, log: log as never, finishedAt: new Date() },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'RUN_PLAYBOOK', module: 'soc', entityType: 'SocPlaybookRun', entityId: run.id, newValues: { playbook: playbook.name, steps: steps.length } as never } as never }).catch(() => null)
    return run
  })

  // T17: list playbook runs
  app.get('/playbooks/:pbid/runs', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { pbid } = req.params as any
    const runs = await prisma.socPlaybookRun.findMany({ where: { playbookId: pbid, tenantId: r.tenantId }, orderBy: { startedAt: 'desc' }, take: 50 })
    return { runs, total: runs.length }
  })

  // T18: create shift
  app.post('/shifts', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { analystName, shiftType = 'day', startsAt, endsAt, handoffNotes, metadata } = req.body as any
    return prisma.socShift.create({
      data: { tenantId: r.tenantId, analystName, shiftType, startsAt: new Date(startsAt), endsAt: new Date(endsAt), status: 'scheduled', handoffNotes, metadata: metadata as never },
    })
  })

  // T19: list shifts
  app.get('/shifts', async (req) => {
    const r = req as unknown as { tenantId: string }
    const shifts = await prisma.socShift.findMany({ where: { tenantId: r.tenantId }, orderBy: { startsAt: 'desc' }, take: 50 })
    return { shifts, total: shifts.length }
  })

  // T20: update shift (handoff)
  app.patch('/shifts/:shid', async (req) => {
    const { shid } = req.params as any
    const data = req.body as any
    return prisma.socShift.update({ where: { id: shid }, data: { ...data, startsAt: data.startsAt ? new Date(data.startsAt) : undefined, endsAt: data.endsAt ? new Date(data.endsAt) : undefined, metadata: data.metadata as never } })
  })

  // T21: SOC overview dashboard
  app.get('/overview', async (req) => {
    const r = req as unknown as { tenantId: string }
    const incidents = await prisma.socIncident.findMany({ where: { tenantId: r.tenantId }, take: 500, orderBy: { createdAt: 'desc' } })
    const open = incidents.filter(i => ['open', 'investigating'].includes(i.status))
    const critical = open.filter(i => i.severity === 'critical').length
    const resolved = incidents.filter(i => i.mttrMinutes != null)
    const avgMttr = resolved.length ? Math.round(resolved.reduce((s, i) => s + (i.mttrMinutes ?? 0), 0) / resolved.length) : 0
    const bySeverity: Record<string, number> = {}
    const byCategory: Record<string, number> = {}
    for (const i of incidents) {
      bySeverity[i.severity] = (bySeverity[i.severity] ?? 0) + 1
      byCategory[i.category] = (byCategory[i.category] ?? 0) + 1
    }
    return {
      totalIncidents: incidents.length, openIncidents: open.length, criticalOpen: critical,
      avgMttrMinutes: avgMttr, bySeverity, byCategory,
      threatLevel: critical > 0 ? 'critical' : open.length > 5 ? 'elevated' : 'normal',
    }
  })

  // T22: stats
  app.get('/stats', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [incidents, rules, intel, playbooks, runs, shifts] = await Promise.all([
      prisma.socIncident.count({ where: { tenantId: r.tenantId } }),
      prisma.socAlertRule.count({ where: { tenantId: r.tenantId } }),
      prisma.socThreatIntel.count({ where: { tenantId: r.tenantId } }),
      prisma.socPlaybook.count({ where: { tenantId: r.tenantId } }),
      prisma.socPlaybookRun.count({ where: { tenantId: r.tenantId } }),
      prisma.socShift.count({ where: { tenantId: r.tenantId } }),
    ])
    return { incidents, alertRules: rules, threatIndicators: intel, playbooks, playbookRuns: runs, shifts }
  })

  // T23: incident timeline (events from metadata + runs)
  app.get('/incidents/:iid/timeline', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { iid } = req.params as any
    const incident = await prisma.socIncident.findFirstOrThrow({ where: { id: iid, tenantId: r.tenantId }, include: { playbookRuns: { include: { playbook: true } } } })
    const timeline = [
      { at: incident.detectedAt, event: 'detected', detail: incident.title },
      ...incident.playbookRuns.map(pr => ({ at: pr.startedAt, event: 'playbook-run', detail: pr.playbook.name })),
    ]
    if (incident.resolvedAt) timeline.push({ at: incident.resolvedAt, event: 'resolved', detail: `MTTR ${incident.mttrMinutes} min` })
    timeline.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    return { timeline }
  })

  // T24: bulk import threat intel
  app.post('/threat-intel/bulk', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { indicators = [] } = req.body as any
    let created = 0
    for (const ind of indicators.slice(0, 100)) {
      await prisma.socThreatIntel.create({
        data: { tenantId: r.tenantId, indicator: ind.indicator, indicatorType: ind.indicatorType ?? 'ip', threatType: ind.threatType ?? 'unknown', confidence: ind.confidence ?? 0.5, source: ind.source, isActive: true },
      })
      created++
    }
    return { created }
  })

  // T25: delete alert rule
  app.delete('/alert-rules/:rid', async (req) => {
    const { rid } = req.params as any
    await prisma.socAlertRule.delete({ where: { id: rid } })
    return { success: true }
  })

  // T26: delete threat intel
  app.delete('/threat-intel/:tid', async (req) => {
    const { tid } = req.params as any
    await prisma.socThreatIntel.delete({ where: { id: tid } })
    return { success: true }
  })

  // T27: delete playbook
  app.delete('/playbooks/:pbid', async (req) => {
    const { pbid } = req.params as any
    await prisma.socPlaybook.delete({ where: { id: pbid } })
    return { success: true }
  })

  // T28: delete shift
  app.delete('/shifts/:shid', async (req) => {
    const { shid } = req.params as any
    await prisma.socShift.delete({ where: { id: shid } })
    return { success: true }
  })
}
