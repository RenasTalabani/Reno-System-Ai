import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function aiBenchmarkingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // T1: registry
  app.get('/registry', async () => ({
    categories: ['quality', 'safety', 'latency', 'cost', 'robustness'],
    metricTypes: ['accuracy', 'f1', 'bleu', 'exact-match', 'latency-ms', 'helpfulness'],
    regressionSeverities: ['minor', 'moderate', 'severe'],
    defaultModel: 'reno-brain-base',
  }))

  // T2: create suite
  app.post('/suites', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { name, category = 'quality', description, metricType = 'accuracy', higherIsBetter = true, metadata } = req.body as any
    const suite = await prisma.bnSuite.create({
      data: { tenantId: r.tenantId, name, category, description, metricType, higherIsBetter, metadata: metadata as never },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'CREATE', module: 'ai-benchmarking', entityType: 'BnSuite', entityId: suite.id, newValues: { name, category } as never } as never }).catch(() => null)
    return suite
  })

  // T3: list suites
  app.get('/suites', async (req) => {
    const r = req as unknown as { tenantId: string }
    const suites = await prisma.bnSuite.findMany({ where: { tenantId: r.tenantId }, include: { _count: { select: { cases: true, runs: true } } } })
    return { suites, total: suites.length }
  })

  // T4: add cases (batch)
  app.post('/suites/:sid/cases', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { sid } = req.params as any
    const { cases = [] } = req.body as any
    let created = 0
    for (const c of cases.slice(0, 200)) {
      await prisma.bnCase.create({
        data: { tenantId: r.tenantId, suiteId: sid, name: c.name, input: c.input as never, expected: c.expected as never, weight: c.weight ?? 1 },
      })
      created++
    }
    return { created }
  })

  // T5: list cases
  app.get('/suites/:sid/cases', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { sid } = req.params as any
    const cases = await prisma.bnCase.findMany({ where: { suiteId: sid, tenantId: r.tenantId } })
    return { cases, total: cases.length }
  })

  // T6: seed demo suite with cases
  app.post('/suites/seed-demo', async (req) => {
    const r = req as unknown as { tenantId: string }
    const suite = await prisma.bnSuite.create({
      data: { tenantId: r.tenantId, name: `QA-benchmark-${Date.now()}`, category: 'quality', metricType: 'accuracy', higherIsBetter: true, description: 'Demo Q&A accuracy benchmark' },
    })
    const cases = [
      { name: 'capital-france', input: { q: 'Capital of France?' }, expected: { a: 'Paris' } },
      { name: 'math-add', input: { q: '2+2?' }, expected: { a: '4' } },
      { name: 'refund-policy', input: { q: 'Refund window?' }, expected: { a: '30 days' } },
      { name: 'support-hours', input: { q: 'Support hours?' }, expected: { a: 'Mon-Fri 9-6' } },
      { name: 'sla', input: { q: 'SLA uptime?' }, expected: { a: '99.9%' } },
    ]
    for (const c of cases) await prisma.bnCase.create({ data: { tenantId: r.tenantId, suiteId: suite.id, name: c.name, input: c.input as never, expected: c.expected as never, weight: 1 } })
    return { suite, casesCreated: cases.length }
  })

  // T7: run benchmark (simulation — scores each case)
  app.post('/suites/:sid/run', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { sid } = req.params as any
    const { modelRef = 'reno-brain-base', quality = 0.85 } = req.body as any
    const cases = await prisma.bnCase.findMany({ where: { suiteId: sid, tenantId: r.tenantId } })
    if (cases.length === 0) return { error: 'suite has no cases' }
    const run = await prisma.bnRun.create({
      data: { tenantId: r.tenantId, suiteId: sid, modelRef, status: 'running', totalCases: cases.length },
    })
    let totalScore = 0, passed = 0, totalLatency = 0
    for (const c of cases) {
      const caseScore = Math.min(1, Math.max(0, quality + (Math.random() * 0.3 - 0.15)))
      const pass = caseScore >= 0.6
      const latency = 50 + Math.floor(Math.random() * 200)
      totalScore += caseScore * c.weight
      totalLatency += latency
      if (pass) passed++
      await prisma.bnResult.create({
        data: { tenantId: r.tenantId, runId: run.id, caseId: c.id, passed: pass, score: Number(caseScore.toFixed(3)), latencyMs: latency, output: { simulated: true } as never },
      })
    }
    const weightSum = cases.reduce((s, c) => s + c.weight, 0)
    const score = Number((totalScore / weightSum).toFixed(3))
    const passRate = Number((passed / cases.length).toFixed(3))
    const updated = await prisma.bnRun.update({
      where: { id: run.id },
      data: { status: 'completed', score, passRate, latencyMsAvg: Math.round(totalLatency / cases.length), finishedAt: new Date() },
    })

    // regression detection vs baseline
    const baseline = await prisma.bnBaseline.findFirst({ where: { tenantId: r.tenantId, suiteId: sid, modelRef } })
    let regression = null
    if (baseline) {
      const deltaPct = Number((((score - baseline.score) / baseline.score) * 100).toFixed(2))
      if (deltaPct < -1) {
        const severity = deltaPct < -10 ? 'severe' : deltaPct < -5 ? 'moderate' : 'minor'
        regression = await prisma.bnRegression.create({
          data: { tenantId: r.tenantId, runId: run.id, suiteRef: sid, baselineScore: baseline.score, currentScore: score, deltaPct, severity },
        })
      }
    }
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'RUN_BENCHMARK', module: 'ai-benchmarking', entityType: 'BnRun', entityId: run.id, newValues: { modelRef, score } as never } as never }).catch(() => null)
    return { run: updated, regression }
  })

  // T8: list runs
  app.get('/runs', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { suiteId, modelRef } = req.query as any
    const where: any = { tenantId: r.tenantId }
    if (suiteId) where.suiteId = suiteId
    if (modelRef) where.modelRef = modelRef
    const runs = await prisma.bnRun.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100, include: { suite: { select: { name: true } } } })
    return { runs, total: runs.length }
  })

  // T9: get run with results
  app.get('/runs/:rid', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { rid } = req.params as any
    return prisma.bnRun.findFirstOrThrow({ where: { id: rid, tenantId: r.tenantId }, include: { results: { include: { case: { select: { name: true } } } }, suite: true } })
  })

  // T10: set baseline (from a run)
  app.post('/runs/:rid/set-baseline', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { rid } = req.params as any
    const run = await prisma.bnRun.findFirstOrThrow({ where: { id: rid, tenantId: r.tenantId } })
    if (run.score == null) return { error: 'run has no score' }
    const baseline = await prisma.bnBaseline.upsert({
      where: { tenantId_suiteId_modelRef: { tenantId: r.tenantId, suiteId: run.suiteId, modelRef: run.modelRef } },
      update: { score: run.score, passRate: run.passRate ?? 0, setBy: r.userId },
      create: { tenantId: r.tenantId, suiteId: run.suiteId, modelRef: run.modelRef, score: run.score, passRate: run.passRate ?? 0, setBy: r.userId },
    })
    return baseline
  })

  // T11: list baselines
  app.get('/baselines', async (req) => {
    const r = req as unknown as { tenantId: string }
    const baselines = await prisma.bnBaseline.findMany({ where: { tenantId: r.tenantId }, include: { suite: { select: { name: true } } } })
    return { baselines, total: baselines.length }
  })

  // T12: list regressions
  app.get('/regressions', async (req) => {
    const r = req as unknown as { tenantId: string }
    const regressions = await prisma.bnRegression.findMany({ where: { tenantId: r.tenantId }, orderBy: { createdAt: 'desc' }, take: 100 })
    return { regressions, total: regressions.length }
  })

  // T13: acknowledge regression
  app.post('/regressions/:regid/acknowledge', async (req) => {
    const { regid } = req.params as any
    return prisma.bnRegression.update({ where: { id: regid }, data: { acknowledged: true } })
  })

  // T14: model comparison (latest run per model on a suite)
  app.get('/suites/:sid/compare', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { sid } = req.params as any
    const runs = await prisma.bnRun.findMany({ where: { suiteId: sid, tenantId: r.tenantId, status: 'completed' }, orderBy: { createdAt: 'desc' } })
    const byModel: Record<string, any> = {}
    for (const run of runs) {
      if (!byModel[run.modelRef]) byModel[run.modelRef] = { modelRef: run.modelRef, score: run.score, passRate: run.passRate, latencyMsAvg: run.latencyMsAvg, runAt: run.finishedAt }
    }
    const comparison = Object.values(byModel).sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0))
    return { comparison, models: comparison.length }
  })

  // T15: leaderboard across suites
  app.get('/leaderboard', async (req) => {
    const r = req as unknown as { tenantId: string }
    const runs = await prisma.bnRun.findMany({ where: { tenantId: r.tenantId, status: 'completed' } })
    const byModel: Record<string, { modelRef: string; totalScore: number; runs: number }> = {}
    for (const run of runs) {
      if (!byModel[run.modelRef]) byModel[run.modelRef] = { modelRef: run.modelRef, totalScore: 0, runs: 0 }
      byModel[run.modelRef].totalScore += run.score ?? 0
      byModel[run.modelRef].runs++
    }
    const leaderboard = Object.values(byModel)
      .map(m => ({ modelRef: m.modelRef, avgScore: Number((m.totalScore / m.runs).toFixed(3)), runs: m.runs }))
      .sort((a, b) => b.avgScore - a.avgScore)
    return { leaderboard }
  })

  // T16: trend for a suite+model over time
  app.get('/suites/:sid/trend', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { sid } = req.params as any
    const { modelRef = 'reno-brain-base' } = req.query as any
    const runs = await prisma.bnRun.findMany({ where: { suiteId: sid, tenantId: r.tenantId, modelRef, status: 'completed' }, orderBy: { createdAt: 'asc' }, select: { score: true, passRate: true, finishedAt: true } })
    return { modelRef, trend: runs, points: runs.length }
  })

  // T17: A/B compare two models on a suite
  app.post('/suites/:sid/ab-test', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { sid } = req.params as any
    const { modelA, modelB } = req.body as any
    const [aRun, bRun] = await Promise.all([
      prisma.bnRun.findFirst({ where: { suiteId: sid, tenantId: r.tenantId, modelRef: modelA, status: 'completed' }, orderBy: { createdAt: 'desc' } }),
      prisma.bnRun.findFirst({ where: { suiteId: sid, tenantId: r.tenantId, modelRef: modelB, status: 'completed' }, orderBy: { createdAt: 'desc' } }),
    ])
    if (!aRun || !bRun) return { error: 'both models need a completed run on this suite' }
    const winner = (aRun.score ?? 0) >= (bRun.score ?? 0) ? modelA : modelB
    return { modelA: { ref: modelA, score: aRun.score }, modelB: { ref: modelB, score: bRun.score }, winner, delta: Number((((aRun.score ?? 0) - (bRun.score ?? 0))).toFixed(3)) }
  })

  // T18: run all suites for a model (regression sweep)
  app.post('/sweep', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { modelRef = 'reno-brain-base', quality = 0.85 } = req.body as any
    const suites = await prisma.bnSuite.findMany({ where: { tenantId: r.tenantId } })
    const results = []
    for (const suite of suites) {
      const cases = await prisma.bnCase.findMany({ where: { suiteId: suite.id } })
      if (cases.length === 0) continue
      const run = await prisma.bnRun.create({ data: { tenantId: r.tenantId, suiteId: suite.id, modelRef, status: 'completed', totalCases: cases.length } })
      let totalScore = 0, passed = 0
      for (const c of cases) {
        const caseScore = Math.min(1, Math.max(0, quality + (Math.random() * 0.3 - 0.15)))
        totalScore += caseScore
        if (caseScore >= 0.6) passed++
        await prisma.bnResult.create({ data: { tenantId: r.tenantId, runId: run.id, caseId: c.id, passed: caseScore >= 0.6, score: Number(caseScore.toFixed(3)), latencyMs: 100 } })
      }
      const score = Number((totalScore / cases.length).toFixed(3))
      await prisma.bnRun.update({ where: { id: run.id }, data: { score, passRate: Number((passed / cases.length).toFixed(3)), latencyMsAvg: 100, finishedAt: new Date() } })
      results.push({ suite: suite.name, score })
    }
    return { swept: results.length, results }
  })

  // T19: stats
  app.get('/stats', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [suites, cases, runs, results, baselines, regressions] = await Promise.all([
      prisma.bnSuite.count({ where: { tenantId: r.tenantId } }),
      prisma.bnCase.count({ where: { tenantId: r.tenantId } }),
      prisma.bnRun.count({ where: { tenantId: r.tenantId } }),
      prisma.bnResult.count({ where: { tenantId: r.tenantId } }),
      prisma.bnBaseline.count({ where: { tenantId: r.tenantId } }),
      prisma.bnRegression.count({ where: { tenantId: r.tenantId, acknowledged: false } }),
    ])
    return { suites, cases, runs, results, baselines, openRegressions: regressions }
  })

  // T20: dashboard
  app.get('/dashboard', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [suites, recentRuns, openRegressions] = await Promise.all([
      prisma.bnSuite.count({ where: { tenantId: r.tenantId } }),
      prisma.bnRun.findMany({ where: { tenantId: r.tenantId, status: 'completed' }, orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.bnRegression.count({ where: { tenantId: r.tenantId, acknowledged: false } }),
    ])
    const avgScore = recentRuns.length ? Number((recentRuns.reduce((s, run) => s + (run.score ?? 0), 0) / recentRuns.length).toFixed(3)) : 0
    return { suites, recentRuns: recentRuns.length, avgScore, openRegressions, health: openRegressions > 0 ? 'regressions-detected' : 'stable' }
  })

  // T21: delete case
  app.delete('/cases/:cid', async (req) => {
    const { cid } = req.params as any
    await prisma.bnCase.delete({ where: { id: cid } })
    return { success: true }
  })

  // T22: delete run
  app.delete('/runs/:rid', async (req) => {
    const { rid } = req.params as any
    await prisma.bnRun.delete({ where: { id: rid } })
    return { success: true }
  })

  // T23: delete baseline
  app.delete('/baselines/:bid', async (req) => {
    const { bid } = req.params as any
    await prisma.bnBaseline.delete({ where: { id: bid } })
    return { success: true }
  })

  // T24: delete suite
  app.delete('/suites/:sid', async (req) => {
    const { sid } = req.params as any
    await prisma.bnSuite.delete({ where: { id: sid } })
    return { success: true }
  })

  // T25: get suite
  app.get('/suites/:sid', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { sid } = req.params as any
    return prisma.bnSuite.findFirstOrThrow({ where: { id: sid, tenantId: r.tenantId }, include: { _count: { select: { cases: true, runs: true } } } })
  })

  // T26: run results summary
  app.get('/runs/:rid/summary', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { rid } = req.params as any
    const results = await prisma.bnResult.findMany({ where: { runId: rid, tenantId: r.tenantId } })
    return { total: results.length, passed: results.filter(x => x.passed).length, failed: results.filter(x => !x.passed).length, avgScore: results.length ? Number((results.reduce((s, x) => s + x.score, 0) / results.length).toFixed(3)) : 0 }
  })

  // T27: update suite
  app.patch('/suites/:sid', async (req) => {
    const { sid } = req.params as any
    const data = req.body as any
    return prisma.bnSuite.update({ where: { id: sid }, data: { ...data, metadata: data.metadata as never } })
  })

  // T28: acknowledge all regressions
  app.post('/regressions/acknowledge-all', async (req) => {
    const r = req as unknown as { tenantId: string }
    const result = await prisma.bnRegression.updateMany({ where: { tenantId: r.tenantId, acknowledged: false }, data: { acknowledged: true } })
    return { acknowledged: result.count }
  })
}
