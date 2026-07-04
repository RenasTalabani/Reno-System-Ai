import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function explainabilityRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // T1: registry
  app.get('/registry', async () => ({
    decisionTypes: ['classification', 'scoring', 'recommendation', 'ranking', 'generation'],
    factorDirections: ['positive', 'negative', 'neutral'],
    reportTypes: ['transparency', 'model-card', 'audit', 'regulatory'],
    explainMethods: ['feature-attribution', 'counterfactual', 'reasoning-trace'],
  }))

  // T2: log a decision (with factors + trace in one call)
  app.post('/decisions', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { modelRef, decisionType = 'classification', inputSummary, outcome, confidence = 0, subjectRef, factors = [], trace = [], metadata } = req.body as any
    const decision = await prisma.xaiDecision.create({
      data: { tenantId: r.tenantId, modelRef, decisionType, inputSummary, outcome, confidence, subjectRef, metadata: metadata as never },
    })
    for (const f of factors) {
      await prisma.xaiFactor.create({
        data: { tenantId: r.tenantId, decisionId: decision.id, featureName: f.featureName, contribution: f.contribution, direction: f.direction ?? (f.contribution >= 0 ? 'positive' : 'negative'), value: f.value != null ? String(f.value) : null },
      })
    }
    for (let i = 0; i < trace.length; i++) {
      await prisma.xaiTrace.create({ data: { tenantId: r.tenantId, decisionId: decision.id, stepOrder: i, stepName: trace[i].stepName ?? `step-${i + 1}`, detail: trace[i].detail } })
    }
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'LOG_DECISION', module: 'explainability', entityType: 'XaiDecision', entityId: decision.id, newValues: { modelRef, outcome } as never } as never }).catch(() => null)
    return decision
  })

  // T3: list decisions
  app.get('/decisions', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { modelRef } = req.query as any
    const where: any = { tenantId: r.tenantId }
    if (modelRef) where.modelRef = modelRef
    const decisions = await prisma.xaiDecision.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100, include: { _count: { select: { factors: true, counterfactuals: true } } } })
    return { decisions, total: decisions.length }
  })

  // T4: full explanation for a decision
  app.get('/decisions/:did/explain', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { did } = req.params as any
    const decision = await prisma.xaiDecision.findFirstOrThrow({
      where: { id: did, tenantId: r.tenantId },
      include: { factors: { orderBy: { contribution: 'desc' } }, traces: { orderBy: { stepOrder: 'asc' } }, counterfactuals: true },
    })
    const topPositive = decision.factors.filter(f => f.direction === 'positive').slice(0, 3)
    const topNegative = decision.factors.filter(f => f.direction === 'negative').slice(0, 3)
    const summary = `Outcome "${decision.outcome}" (confidence ${(decision.confidence * 100).toFixed(0)}%) driven mainly by ${topPositive.map(f => f.featureName).join(', ') || 'no strong positive factors'}${topNegative.length ? '; countered by ' + topNegative.map(f => f.featureName).join(', ') : ''}.`
    return { decision, summary, topPositive, topNegative }
  })

  // T5: add factor to existing decision
  app.post('/decisions/:did/factors', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { did } = req.params as any
    const { featureName, contribution, value } = req.body as any
    return prisma.xaiFactor.create({
      data: { tenantId: r.tenantId, decisionId: did, featureName, contribution, direction: contribution >= 0 ? 'positive' : 'negative', value: value != null ? String(value) : null },
    })
  })

  // T6: add trace step
  app.post('/decisions/:did/trace', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { did } = req.params as any
    const { stepName, detail } = req.body as any
    const count = await prisma.xaiTrace.count({ where: { decisionId: did } })
    return prisma.xaiTrace.create({ data: { tenantId: r.tenantId, decisionId: did, stepOrder: count, stepName, detail } })
  })

  // T7: generate counterfactual
  app.post('/decisions/:did/counterfactuals', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { did } = req.params as any
    const { change, wouldChangeOutcome = false, newOutcome } = req.body as any
    return prisma.xaiCounterfactual.create({
      data: { tenantId: r.tenantId, decisionId: did, change, wouldChangeOutcome, newOutcome },
    })
  })

  // T8: auto-generate counterfactuals from top factors
  app.post('/decisions/:did/counterfactuals/auto', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { did } = req.params as any
    const decision = await prisma.xaiDecision.findFirstOrThrow({ where: { id: did, tenantId: r.tenantId }, include: { factors: { orderBy: { contribution: 'desc' } } } })
    const created = []
    for (const f of decision.factors.slice(0, 3)) {
      const flips = Math.abs(f.contribution) > 0.3
      created.push(await prisma.xaiCounterfactual.create({
        data: { tenantId: r.tenantId, decisionId: did, change: `If "${f.featureName}" were different`, wouldChangeOutcome: flips, newOutcome: flips ? 'alternative outcome' : null },
      }))
    }
    return { generated: created.length, counterfactuals: created }
  })

  // T9: list counterfactuals
  app.get('/decisions/:did/counterfactuals', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { did } = req.params as any
    const counterfactuals = await prisma.xaiCounterfactual.findMany({ where: { decisionId: did, tenantId: r.tenantId } })
    return { counterfactuals, total: counterfactuals.length }
  })

  // T10: set feature importance for a model
  app.post('/feature-importance', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { modelRef, features = [] } = req.body as any
    const sorted = [...features].sort((a: any, b: any) => b.importance - a.importance)
    const created = []
    for (let i = 0; i < sorted.length; i++) {
      const f = sorted[i]
      created.push(await prisma.xaiFeatureImportance.upsert({
        where: { tenantId_modelRef_featureName: { tenantId: r.tenantId, modelRef, featureName: f.featureName } },
        update: { importance: f.importance, rank: i },
        create: { tenantId: r.tenantId, modelRef, featureName: f.featureName, importance: f.importance, rank: i },
      }))
    }
    return { updated: created.length }
  })

  // T11: get feature importance for a model
  app.get('/feature-importance/:modelRef', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { modelRef } = req.params as any
    const features = await prisma.xaiFeatureImportance.findMany({ where: { tenantId: r.tenantId, modelRef }, orderBy: { rank: 'asc' } })
    return { modelRef, features, total: features.length }
  })

  // T12: model transparency card (aggregates model behavior)
  app.get('/models/:modelRef/card', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { modelRef } = req.params as any
    const [decisions, features, avgConf] = await Promise.all([
      prisma.xaiDecision.count({ where: { tenantId: r.tenantId, modelRef } }),
      prisma.xaiFeatureImportance.findMany({ where: { tenantId: r.tenantId, modelRef }, orderBy: { rank: 'asc' }, take: 5 }),
      prisma.xaiDecision.aggregate({ where: { tenantId: r.tenantId, modelRef }, _avg: { confidence: true } }),
    ])
    return { modelRef, decisionsExplained: decisions, topFeatures: features.map(f => ({ name: f.featureName, importance: f.importance })), avgConfidence: Number((avgConf._avg.confidence ?? 0).toFixed(3)) }
  })

  // T13: create report
  app.post('/reports', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { modelRef, reportType = 'transparency', content = {} } = req.body as any
    const report = await prisma.xaiReport.create({
      data: { tenantId: r.tenantId, modelRef, reportType, content: content as never, status: 'draft' },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'CREATE_REPORT', module: 'explainability', entityType: 'XaiReport', entityId: report.id, newValues: { modelRef, reportType } as never } as never }).catch(() => null)
    return report
  })

  // T14: auto-generate transparency report
  app.post('/reports/generate', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { modelRef } = req.body as any
    const [decisions, features, avgConf, lowConfCount] = await Promise.all([
      prisma.xaiDecision.count({ where: { tenantId: r.tenantId, modelRef } }),
      prisma.xaiFeatureImportance.findMany({ where: { tenantId: r.tenantId, modelRef }, orderBy: { rank: 'asc' }, take: 10 }),
      prisma.xaiDecision.aggregate({ where: { tenantId: r.tenantId, modelRef }, _avg: { confidence: true } }),
      prisma.xaiDecision.count({ where: { tenantId: r.tenantId, modelRef, confidence: { lt: 0.5 } } }),
    ])
    const content = {
      modelRef, generatedAt: new Date().toISOString(),
      decisionsAnalyzed: decisions, avgConfidence: Number((avgConf._avg.confidence ?? 0).toFixed(3)),
      lowConfidenceDecisions: lowConfCount,
      keyDrivers: features.map(f => ({ feature: f.featureName, importance: f.importance })),
      notes: 'Auto-generated transparency report summarizing model decision drivers.',
    }
    return prisma.xaiReport.create({ data: { tenantId: r.tenantId, modelRef, reportType: 'transparency', content: content as never, status: 'generated' } })
  })

  // T15: list reports
  app.get('/reports', async (req) => {
    const r = req as unknown as { tenantId: string }
    const reports = await prisma.xaiReport.findMany({ where: { tenantId: r.tenantId }, orderBy: { createdAt: 'desc' } })
    return { reports, total: reports.length }
  })

  // T16: get report
  app.get('/reports/:rid', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { rid } = req.params as any
    return prisma.xaiReport.findFirstOrThrow({ where: { id: rid, tenantId: r.tenantId } })
  })

  // T17: publish report
  app.post('/reports/:rid/publish', async (req) => {
    const { rid } = req.params as any
    return prisma.xaiReport.update({ where: { id: rid }, data: { status: 'published' } })
  })

  // T18: confidence distribution for a model
  app.get('/models/:modelRef/confidence', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { modelRef } = req.params as any
    const decisions = await prisma.xaiDecision.findMany({ where: { tenantId: r.tenantId, modelRef }, select: { confidence: true } })
    const buckets = { '0-25': 0, '25-50': 0, '50-75': 0, '75-100': 0 }
    for (const d of decisions) {
      const c = d.confidence * 100
      if (c < 25) buckets['0-25']++
      else if (c < 50) buckets['25-50']++
      else if (c < 75) buckets['50-75']++
      else buckets['75-100']++
    }
    return { modelRef, distribution: buckets, total: decisions.length }
  })

  // T19: subject decision history (all decisions affecting a subject — "right to explanation")
  app.get('/subjects/:subjectRef/decisions', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { subjectRef } = req.params as any
    const decisions = await prisma.xaiDecision.findMany({ where: { tenantId: r.tenantId, subjectRef }, orderBy: { createdAt: 'desc' }, include: { factors: { orderBy: { contribution: 'desc' }, take: 3 } } })
    return { subjectRef, decisions, total: decisions.length }
  })

  // T20: simulate a scored decision (demo generator)
  app.post('/simulate/decision', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { modelRef = 'reno-brain-credit', subjectRef } = req.body as any
    const confidence = Number((0.5 + Math.random() * 0.45).toFixed(3))
    const outcome = confidence > 0.7 ? 'approved' : 'review-required'
    const decision = await prisma.xaiDecision.create({
      data: { tenantId: r.tenantId, modelRef, decisionType: 'scoring', inputSummary: 'Simulated application', outcome, confidence, subjectRef },
    })
    const feats = [
      { featureName: 'account_age', contribution: 0.4, value: '5y' },
      { featureName: 'transaction_history', contribution: 0.3, value: 'good' },
      { featureName: 'recent_disputes', contribution: -0.2, value: '1' },
    ]
    for (const f of feats) {
      await prisma.xaiFactor.create({ data: { tenantId: r.tenantId, decisionId: decision.id, featureName: f.featureName, contribution: f.contribution, direction: f.contribution >= 0 ? 'positive' : 'negative', value: f.value } })
    }
    return { decision, factorsCreated: feats.length }
  })

  // T21: stats
  app.get('/stats', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [decisions, factors, traces, counterfactuals, features, reports] = await Promise.all([
      prisma.xaiDecision.count({ where: { tenantId: r.tenantId } }),
      prisma.xaiFactor.count({ where: { tenantId: r.tenantId } }),
      prisma.xaiTrace.count({ where: { tenantId: r.tenantId } }),
      prisma.xaiCounterfactual.count({ where: { tenantId: r.tenantId } }),
      prisma.xaiFeatureImportance.count({ where: { tenantId: r.tenantId } }),
      prisma.xaiReport.count({ where: { tenantId: r.tenantId } }),
    ])
    return { decisions, factors, traces, counterfactuals, featureImportances: features, reports }
  })

  // T22: models overview (distinct model refs with decision counts)
  app.get('/models', async (req) => {
    const r = req as unknown as { tenantId: string }
    const grouped = await prisma.xaiDecision.groupBy({ by: ['modelRef'], where: { tenantId: r.tenantId }, _count: { _all: true }, _avg: { confidence: true } })
    return { models: grouped.map(g => ({ modelRef: g.modelRef, decisions: g._count._all, avgConfidence: Number((g._avg.confidence ?? 0).toFixed(3)) })) }
  })

  // T23: delete factor
  app.delete('/factors/:fid', async (req) => {
    const { fid } = req.params as any
    await prisma.xaiFactor.delete({ where: { id: fid } })
    return { success: true }
  })

  // T24: delete report
  app.delete('/reports/:rid', async (req) => {
    const { rid } = req.params as any
    await prisma.xaiReport.delete({ where: { id: rid } })
    return { success: true }
  })

  // T25: delete feature importance
  app.delete('/feature-importance/:fid', async (req) => {
    const { fid } = req.params as any
    await prisma.xaiFeatureImportance.delete({ where: { id: fid } })
    return { success: true }
  })

  // T26: delete decision
  app.delete('/decisions/:did', async (req) => {
    const { did } = req.params as any
    await prisma.xaiDecision.delete({ where: { id: did } })
    return { success: true }
  })

  // T27: get trace for a decision
  app.get('/decisions/:did/trace', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { did } = req.params as any
    const traces = await prisma.xaiTrace.findMany({ where: { decisionId: did, tenantId: r.tenantId }, orderBy: { stepOrder: 'asc' } })
    return { traces, total: traces.length }
  })

  // T28: get factors for a decision
  app.get('/decisions/:did/factors', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { did } = req.params as any
    const factors = await prisma.xaiFactor.findMany({ where: { decisionId: did, tenantId: r.tenantId }, orderBy: { contribution: 'desc' } })
    return { factors, total: factors.length }
  })
}
