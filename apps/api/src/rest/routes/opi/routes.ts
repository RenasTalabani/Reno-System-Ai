import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import { analyzeProcess, detectBottlenecks, predictKpi, generateEfficiencyInsights, computeOpsKpis } from './ai-engine.js'

export async function opiRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Dashboard ─────────────────────────────────────────────────────────────
  app.get('/dashboard', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const [processes, kpis, insights, bottlenecks] = await Promise.all([
      prisma.opiProcess.findMany({ where: { tenantId }, orderBy: { aiEfficiencyScore: 'asc' }, take: 20 }),
      prisma.opiKpi.findMany({ where: { tenantId }, orderBy: { updatedAt: 'desc' }, take: 10 }),
      prisma.opiEfficiencyInsight.findMany({ where: { tenantId }, orderBy: { generatedAt: 'desc' }, take: 5 }),
      prisma.opiBottleneck.findMany({ where: { tenantId, resolved: false }, orderBy: { createdAt: 'desc' }, take: 5 }),
    ])
    const kpis2 = computeOpsKpis(processes as any[])
    return { kpis: kpis2, processes: processes.slice(0, 5), operationalKpis: kpis, insights, openBottlenecks: bottlenecks }
  })

  // ── Processes ─────────────────────────────────────────────────────────────
  app.get('/processes', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    return prisma.opiProcess.findMany({ where: { tenantId }, include: { bottlenecks: true }, orderBy: { createdAt: 'desc' } })
  })

  app.post('/processes', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as any
    const analysis = analyzeProcess({ cycleDays: body.cycleDays ?? 0, automationPct: body.automationPct ?? 0, errorRate: body.errorRate ?? 0, throughput: body.throughput ?? 0 })
    const process = await prisma.opiProcess.create({
      data: { tenantId, name: body.name, department: body.department, owner: body.owner, cycleDays: body.cycleDays ?? 0, automationPct: body.automationPct ?? 0, errorRate: body.errorRate ?? 0, throughput: body.throughput ?? 0, aiEfficiencyScore: analysis.aiEfficiencyScore, aiMaturityLevel: analysis.aiMaturityLevel, aiRecommendations: analysis.recommendations as never, status: body.status ?? 'active', metadata: (body.metadata ?? {}) as never },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'opi', entityType: 'OpiProcess', entityId: process.id, newValues: process as never } as never }).catch(() => null)
    return reply.code(201).send(process)
  })

  app.get('/processes/:id', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    return prisma.opiProcess.findFirst({ where: { id, tenantId }, include: { bottlenecks: true } })
  })

  app.patch('/processes/:id', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = req.body as any
    const existing = await prisma.opiProcess.findFirst({ where: { id, tenantId } })
    if (!existing) return { error: 'NOT_FOUND' }
    const merged = { cycleDays: body.cycleDays ?? existing.cycleDays, automationPct: body.automationPct ?? existing.automationPct, errorRate: body.errorRate ?? existing.errorRate, throughput: body.throughput ?? existing.throughput }
    const analysis = analyzeProcess(merged as any)
    const proc = await prisma.opiProcess.update({ where: { id }, data: { ...body, aiEfficiencyScore: analysis.aiEfficiencyScore, aiMaturityLevel: analysis.aiMaturityLevel, aiRecommendations: analysis.recommendations as never } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE', module: 'opi', entityType: 'OpiProcess', entityId: id, newValues: body as never } as never }).catch(() => null)
    return proc
  })

  app.delete('/processes/:id', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    await prisma.opiProcess.deleteMany({ where: { id, tenantId } })
    return reply.code(204).send()
  })

  app.post('/processes/:id/analyze', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const proc = await prisma.opiProcess.findFirst({ where: { id, tenantId } })
    if (!proc) return { error: 'NOT_FOUND' }
    const analysis = analyzeProcess({ cycleDays: proc.cycleDays, automationPct: proc.automationPct, errorRate: proc.errorRate, throughput: proc.throughput })
    const updated = await prisma.opiProcess.update({ where: { id }, data: { aiEfficiencyScore: analysis.aiEfficiencyScore, aiMaturityLevel: analysis.aiMaturityLevel, aiRecommendations: analysis.recommendations as never } })
    // Detect bottlenecks
    const bns = detectBottlenecks({ name: proc.name, cycleDays: proc.cycleDays, errorRate: proc.errorRate, automationPct: proc.automationPct, throughput: proc.throughput })
    if (bns.length > 0) {
      await Promise.all(bns.map(b => prisma.opiBottleneck.create({ data: { tenantId, processId: id, step: b.step, severity: b.severity, aiRootCause: b.aiRootCause, aiSolution: b.aiSolution } })))
    }
    return { process: updated, bottlenecksDetected: bns.length }
  })

  // ── Bottlenecks ───────────────────────────────────────────────────────────
  app.get('/bottlenecks', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    return prisma.opiBottleneck.findMany({ where: { tenantId }, include: { process: true }, orderBy: { createdAt: 'desc' } })
  })

  app.patch('/bottlenecks/:id/resolve', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    return prisma.opiBottleneck.updateMany({ where: { id, tenantId }, data: { resolved: true } })
  })

  // ── KPIs ──────────────────────────────────────────────────────────────────
  app.get('/kpis', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    return prisma.opiKpi.findMany({ where: { tenantId }, orderBy: { updatedAt: 'desc' } })
  })

  app.post('/kpis/upsert', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as any
    const period = body.period ?? new Date().toISOString().slice(0, 7)
    const kpiData = body.kpis ?? [
      { kpiCode: 'OEE', kpiName: 'Overall Equipment Effectiveness', actual: 72, target: 85 },
      { kpiCode: 'CYCLE_TIME', kpiName: 'Average Cycle Time (days)', actual: 4.5, target: 3 },
      { kpiCode: 'ERROR_RATE', kpiName: 'Process Error Rate (%)', actual: 2.1, target: 1 },
      { kpiCode: 'THROUGHPUT', kpiName: 'Daily Throughput', actual: 145, target: 200 },
    ]
    const results = []
    for (const kpi of kpiData) {
      const prediction = predictKpi({ kpiCode: kpi.kpiCode, kpiName: kpi.kpiName, actual: kpi.actual, target: kpi.target })
      const record = await prisma.opiKpi.upsert({
        where: { tenantId_kpiCode_period: { tenantId, kpiCode: kpi.kpiCode, period } },
        create: { tenantId, kpiCode: kpi.kpiCode, kpiName: kpi.kpiName, period, actual: kpi.actual, target: kpi.target, ...prediction },
        update: { kpiName: kpi.kpiName, actual: kpi.actual, target: kpi.target, ...prediction },
      })
      results.push(record)
    }
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPSERT', module: 'opi', entityType: 'OpiKpi', entityId: period, newValues: { count: results.length } as never } as never }).catch(() => null)
    return reply.code(201).send(results)
  })

  // ── Insights ──────────────────────────────────────────────────────────────
  app.get('/insights', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    return prisma.opiEfficiencyInsight.findMany({ where: { tenantId }, orderBy: { generatedAt: 'desc' } })
  })

  app.post('/insights/generate', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const [processes, kpis] = await Promise.all([
      prisma.opiProcess.findMany({ where: { tenantId } }),
      prisma.opiKpi.findMany({ where: { tenantId } }),
    ])
    const insightData = generateEfficiencyInsights(processes as any[], kpis as any[])
    const created = await Promise.all(
      insightData.map(i => prisma.opiEfficiencyInsight.create({
        data: { tenantId, type: i.type, title: i.title, summary: i.summary, savingsEst: i.savingsEst, priority: i.priority, actionItems: i.actionItems as never },
      }))
    )
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'AI_GENERATE', module: 'opi', entityType: 'OpiEfficiencyInsight', entityId: 'batch', newValues: { count: created.length } as never } as never }).catch(() => null)
    return reply.code(201).send(created)
  })
}
