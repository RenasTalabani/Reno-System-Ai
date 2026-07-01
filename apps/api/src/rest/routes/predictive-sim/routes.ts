import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import { simulate, compareScenarios } from './ai-engine.js'
import type { ScenarioParams } from './ai-engine.js'

export async function predictiveSimRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Dashboard ──────────────────────────────────────────────────────────────

  app.get('/dashboard', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const [scenarioCount, simCount, comparisonCount] = await Promise.all([
      prisma.apsScenario.count({ where: { tenantId } }),
      prisma.apsSimulation.count({ where: { tenantId } }),
      prisma.apsComparison.count({ where: { tenantId } }),
    ])
    const latestSim = await prisma.apsSimulation.findFirst({
      where: { tenantId },
      orderBy: { ranAt: 'desc' },
      include: { scenario: { select: { name: true, type: true } } },
    })
    return { success: true, data: { scenarios: scenarioCount, simulations: simCount, comparisons: comparisonCount, latestSimulation: latestSim } }
  })

  // ── Scenarios ──────────────────────────────────────────────────────────────

  app.get('/scenarios', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const scenarios = await prisma.apsScenario.findMany({
      where: { tenantId },
      include: { _count: { select: { simulations: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: scenarios }
  })

  app.get('/scenarios/:id', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const scenario = await prisma.apsScenario.findFirst({
      where: { id, tenantId },
      include: {
        simulations: { orderBy: { ranAt: 'desc' }, take: 5 },
        _count: { select: { simulations: true } },
      },
    })
    if (!scenario) return reply.code(404).send({ success: false, error: 'Scenario not found' })
    return { success: true, data: scenario }
  })

  app.post('/scenarios', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as {
      name: string; description?: string; type: string; parameters: Record<string, number>
      baselineRevenue: number; baselineCost: number; baselineHeadcount?: number; timeHorizon?: number
    }

    const scenario = await prisma.apsScenario.create({
      data: {
        tenantId, userId,
        name: body.name,
        description: body.description ?? null,
        type: body.type,
        parameters: body.parameters as never,
        baselineRevenue: body.baselineRevenue,
        baselineCost: body.baselineCost,
        baselineHeadcount: body.baselineHeadcount ?? 0,
        timeHorizon: body.timeHorizon ?? 12,
      },
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'APS_SCENARIO_CREATED', module: 'predictive-sim', entityType: 'ApsScenario', entityId: scenario.id, newValues: { name: body.name, type: body.type } as never },
    }).catch(() => null)

    return { success: true, data: scenario }
  })

  app.put('/scenarios/:id', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const body = req.body as Record<string, unknown>
    const scenario = await prisma.apsScenario.findFirst({ where: { id, tenantId } })
    if (!scenario) return reply.code(404).send({ success: false, error: 'Scenario not found' })

    const allowed = ['name', 'description', 'parameters', 'baselineRevenue', 'baselineCost', 'baselineHeadcount', 'timeHorizon', 'status']
    const data: Record<string, unknown> = {}
    for (const key of allowed) {
      if (body[key] !== undefined) data[key] = body[key]
    }

    const updated = await prisma.apsScenario.update({ where: { id }, data })
    return { success: true, data: updated }
  })

  app.delete('/scenarios/:id', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const scenario = await prisma.apsScenario.findFirst({ where: { id, tenantId } })
    if (!scenario) return reply.code(404).send({ success: false, error: 'Scenario not found' })
    await prisma.apsScenario.delete({ where: { id } })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'APS_SCENARIO_DELETED', module: 'predictive-sim', entityType: 'ApsScenario', entityId: id, newValues: {} as never },
    }).catch(() => null)
    return { success: true, data: { deleted: true } }
  })

  // ── Run Simulation ─────────────────────────────────────────────────────────

  app.post('/scenarios/:id/run', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = req.body as { iterations?: number } | undefined
    const iterations = (body as { iterations?: number } | undefined)?.iterations ?? 1000

    const scenario = await prisma.apsScenario.findFirst({ where: { id, tenantId } })
    if (!scenario) return reply.code(404).send({ success: false, error: 'Scenario not found' })

    const params: ScenarioParams = {
      type: scenario.type as ScenarioParams['type'],
      parameters: scenario.parameters as Record<string, number>,
      baselineRevenue: scenario.baselineRevenue,
      baselineCost: scenario.baselineCost,
      baselineHeadcount: scenario.baselineHeadcount,
      timeHorizon: scenario.timeHorizon,
    }

    const result = simulate(params, iterations)

    const sim = await prisma.apsSimulation.create({
      data: {
        tenantId,
        scenarioId: id,
        iterations,
        baseOutcome: result.base as never,
        pessimisticOutcome: result.pessimistic as never,
        optimisticOutcome: result.optimistic as never,
        monteCarloP10: result.monteCarlo.p10 as never,
        monteCarloP50: result.monteCarlo.p50 as never,
        monteCarloP90: result.monteCarlo.p90 as never,
        successRate: result.monteCarlo.successRate,
        sensitivityData: result.sensitivityAnalysis as never,
        risks: result.risks as never,
        opportunities: result.opportunities as never,
        recommendation: result.recommendation,
        executiveSummary: result.executiveSummary,
        breakEvenMonths: result.breakEvenMonths ?? null,
      },
    })

    // Update scenario status
    await prisma.apsScenario.update({ where: { id }, data: { status: 'simulated' } })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'APS_SIMULATION_RUN', module: 'predictive-sim', entityType: 'ApsSimulation', entityId: sim.id, newValues: { scenarioId: id, iterations, successRate: result.monteCarlo.successRate } as never },
    }).catch(() => null)

    return { success: true, data: { simulation: sim, result } }
  })

  // Quick what-if (no save required)
  app.post('/quick-what-if', async (req) => {
    const body = req.body as ScenarioParams & { iterations?: number }
    const { iterations = 500, ...params } = body
    const result = simulate(params as ScenarioParams, iterations)
    return { success: true, data: result }
  })

  // ── Simulations ────────────────────────────────────────────────────────────

  app.get('/simulations', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const sims = await prisma.apsSimulation.findMany({
      where: { tenantId },
      include: { scenario: { select: { name: true, type: true } } },
      orderBy: { ranAt: 'desc' },
      take: 50,
    })
    return { success: true, data: sims }
  })

  app.get('/simulations/:id', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const sim = await prisma.apsSimulation.findFirst({
      where: { id, tenantId },
      include: { scenario: true },
    })
    if (!sim) return reply.code(404).send({ success: false, error: 'Simulation not found' })
    return { success: true, data: sim }
  })

  // ── Comparisons ────────────────────────────────────────────────────────────

  app.get('/comparisons', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const comparisons = await prisma.apsComparison.findMany({
      where: { tenantId },
      include: { items: { include: { scenario: { select: { name: true, type: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return { success: true, data: comparisons }
  })

  app.post('/comparisons', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { name: string; scenarioIds: string[] }

    if (!body.scenarioIds || body.scenarioIds.length < 2) {
      return { success: false, error: 'At least 2 scenario IDs required for comparison' }
    }

    // Load scenarios
    const scenarios = await prisma.apsScenario.findMany({
      where: { id: { in: body.scenarioIds }, tenantId },
    })
    if (scenarios.length < 2) return { success: false, error: 'Scenarios not found' }

    // Run comparison
    const entries = compareScenarios(scenarios.map(s => ({
      id: s.id,
      name: s.name,
      params: {
        type: s.type as ScenarioParams['type'],
        parameters: s.parameters as Record<string, number>,
        baselineRevenue: s.baselineRevenue,
        baselineCost: s.baselineCost,
        baselineHeadcount: s.baselineHeadcount,
        timeHorizon: s.timeHorizon,
      },
    })))

    const recommended = entries.find(e => e.verdict === 'recommended') ?? entries[0]
    const executiveRec = `Based on ${entries.length} scenarios compared, "${recommended.scenarioName}" is ranked #1 with ${Math.round(recommended.successRate * 100)}% success probability and net impact of ${recommended.base.netImpact >= 0 ? '+' : ''}${recommended.base.netImpact.toLocaleString()}.`

    const comparison = await prisma.apsComparison.create({
      data: {
        tenantId, userId, name: body.name,
        result: { entries, executiveRecommendation: executiveRec } as never,
        items: { create: entries.map(e => ({ scenarioId: e.scenarioId, rank: e.rank, notes: e.notes })) },
      },
      include: { items: { include: { scenario: { select: { name: true, type: true } } } } },
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'APS_COMPARISON_CREATED', module: 'predictive-sim', entityType: 'ApsComparison', entityId: comparison.id, newValues: { name: body.name, count: scenarios.length } as never },
    }).catch(() => null)

    return { success: true, data: { comparison, result: { entries, executiveRecommendation: executiveRec } } }
  })

  app.get('/comparisons/:id', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const comparison = await prisma.apsComparison.findFirst({
      where: { id, tenantId },
      include: { items: { include: { scenario: true } } },
    })
    if (!comparison) return reply.code(404).send({ success: false, error: 'Comparison not found' })
    return { success: true, data: comparison }
  })
}
