import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import {
  runAllHealthChecks, computeResilienceScore, evaluateCircuitBreaker,
  simulateFailover, simulateDrScenario, testCacheHealth, simulateDeployment,
  runChaosExperiment, generateResilienceReport,
} from './resilience-engine.js'

const DEFAULT_CACHE_KEYS = ['session', 'user_profile', 'tenant_config', 'ai_responses', 'dashboard_metrics']

export async function resilienceRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Summary dashboard ────────────────────────────────────────────────────────
  app.get('/summary', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const now = new Date()
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const [snapshots, alerts, cbs, reports] = await Promise.all([
      prisma.hrspHealthSnapshot.findMany({
        where: { tenantId, checkedAt: { gte: since } },
        orderBy: { checkedAt: 'desc' },
        take: 50,
      }),
      prisma.hrspComponentAlert.count({ where: { tenantId, isResolved: false } }),
      prisma.hrspCircuitBreaker.findMany({ where: { tenantId } }),
      prisma.hrspResilienceReport.findMany({ where: { tenantId }, orderBy: { generatedAt: 'desc' }, take: 1 }),
    ])

    // latest snapshot per component
    const latest: Record<string, typeof snapshots[0]> = {}
    for (const s of snapshots) {
      if (!latest[s.component] || s.checkedAt > latest[s.component].checkedAt) latest[s.component] = s
    }

    const components = Object.values(latest)
    const overallScore = components.length > 0 ? computeResilienceScore(
      components.map(c => ({
        component: c.component,
        status: c.status as 'healthy' | 'degraded' | 'down',
        latencyMs: c.latencyMs ?? 0,
        errorRate: c.errorRate ?? 0,
        resilienceScore: c.resilienceScore ?? 0,
        details: c.details as Record<string, unknown>,
      }))
    ) : null

    return {
      overallScore,
      activeAlerts: alerts,
      openCircuitBreakers: cbs.filter(c => c.state === 'open').length,
      totalCircuitBreakers: cbs.length,
      componentCount: components.length,
      healthyCount: components.filter(c => c.status === 'healthy').length,
      degradedCount: components.filter(c => c.status === 'degraded').length,
      downCount: components.filter(c => c.status === 'down').length,
      lastHealthRun: components[0]?.checkedAt ?? null,
      latestReport: reports[0] ?? null,
      components: Object.entries(latest).map(([k, v]) => ({ component: k, status: v.status, latencyMs: v.latencyMs, resilienceScore: v.resilienceScore })),
    }
  })

  // ── Health snapshots ──────────────────────────────────────────────────────────
  app.get('/health', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const snapshots = await prisma.hrspHealthSnapshot.findMany({
      where: { tenantId, checkedAt: { gte: since } },
      orderBy: { checkedAt: 'desc' },
      take: 200,
    })
    return { snapshots }
  })

  app.post('/health/run', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const results = runAllHealthChecks()
    const overallScore = computeResilienceScore(results)
    const now = new Date()

    // Upsert circuit breakers and create snapshots
    const snapshots = await Promise.all(results.map(async r => {
      const snap = await prisma.hrspHealthSnapshot.create({
        data: {
          tenantId,
          component: r.component,
          status: r.status,
          latencyMs: r.latencyMs,
          errorRate: r.errorRate,
          details: r.details as never,
          resilienceScore: r.resilienceScore,
          checkedAt: now,
        },
      })

      // circuit breaker upsert
      const cb = await prisma.hrspCircuitBreaker.upsert({
        where: { tenantId_serviceName: { tenantId, serviceName: r.component } },
        create: {
          tenantId, serviceName: r.component, state: 'closed',
          failureCount: 0, successCount: 0, failureThreshold: 5, recoveryTimeoutSec: 60,
        },
        update: {},
      })

      const eval_ = evaluateCircuitBreaker(
        { state: cb.state, failureCount: cb.failureCount, failureThreshold: cb.failureThreshold, nextRetryAt: cb.nextRetryAt },
        r.status
      )
      await prisma.hrspCircuitBreaker.update({
        where: { id: cb.id },
        data: {
          state: eval_.newState,
          failureCount: eval_.newFailureCount,
          successCount: eval_.newSuccessCount,
          lastFailureAt: r.status === 'down' ? now : cb.lastFailureAt,
          lastFailureReason: r.status === 'down' ? `Component ${r.component} reported DOWN during health check` : cb.lastFailureReason,
          openedAt: eval_.openedAt ?? cb.openedAt,
          nextRetryAt: eval_.nextRetryAt,
        },
      })

      // Create alert for degraded/down
      if (r.status !== 'healthy') {
        await prisma.hrspComponentAlert.create({
          data: {
            tenantId, snapshotId: snap.id,
            component: r.component,
            severity: r.status === 'down' ? 'critical' : 'warning',
            title: `${r.component.toUpperCase()} ${r.status === 'down' ? 'DOWN' : 'DEGRADED'}`,
            message: `Component ${r.component} is ${r.status}. Latency: ${r.latencyMs}ms, Error rate: ${(r.errorRate * 100).toFixed(1)}%`,
          },
        })
      }

      return snap
    }))

    // Seed default cache strategies
    await Promise.all(DEFAULT_CACHE_KEYS.map(key =>
      prisma.hrspCacheStrategy.upsert({
        where: { tenantId_strategyKey: { tenantId, strategyKey: key } },
        create: {
          tenantId, strategyKey: key, cacheLayer: 'redis',
          ttlSeconds: key === 'session' ? 1800 : key === 'ai_responses' ? 600 : 300,
          invalidationPolicy: key === 'session' ? 'event' : 'ttl',
          cacheHealth: results.find(r => r.component === 'redis')?.status ?? 'unknown',
          lastHealthCheck: now,
        },
        update: { cacheHealth: results.find(r => r.component === 'redis')?.status ?? 'unknown', lastHealthCheck: now },
      })
    ))

    // Generate resilience report
    const alertCount = await prisma.hrspComponentAlert.count({ where: { tenantId, isResolved: false } })
    const openCbs = await prisma.hrspCircuitBreaker.count({ where: { tenantId, state: 'open' } })
    const insight = generateResilienceReport(results, alertCount, openCbs)

    const report = await prisma.hrspResilienceReport.create({
      data: {
        tenantId, reportType: 'on_demand', overallScore,
        components: Object.fromEntries(results.map(r => [r.component, { status: r.status, score: r.resilienceScore }])) as never,
        findings: insight.findings as never,
        recommendations: insight.recommendations as never,
        executiveSummary: insight.executiveSummary,
      },
    })

    prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'HEALTH_RUN', module: 'resilience', entityType: 'HrspHealthSnapshot', entityId: snapshots[0]?.id, newValues: { overallScore } as never } as never }).catch(() => null)

    return { overallScore, snapshots: snapshots.length, report, results }
  })

  // ── Alerts ───────────────────────────────────────────────────────────────────
  app.get('/alerts', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { resolved } = req.query as { resolved?: string }
    const alerts = await prisma.hrspComponentAlert.findMany({
      where: { tenantId, isResolved: resolved === 'true' ? true : false },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return { alerts }
  })

  app.post('/alerts/:id/resolve', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const alert = await prisma.hrspComponentAlert.findFirst({ where: { id, tenantId } })
    if (!alert) return rep.status(404).send({ error: 'Alert not found' })
    const updated = await prisma.hrspComponentAlert.update({
      where: { id },
      data: { isResolved: true, resolvedAt: new Date(), resolvedBy: userId },
    })
    return updated
  })

  // ── Circuit Breakers ──────────────────────────────────────────────────────────
  app.get('/circuit-breakers', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const cbs = await prisma.hrspCircuitBreaker.findMany({
      where: { tenantId }, orderBy: { serviceName: 'asc' },
    })
    return { circuitBreakers: cbs }
  })

  app.post('/circuit-breakers/:id/reset', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const cb = await prisma.hrspCircuitBreaker.findFirst({ where: { id, tenantId } })
    if (!cb) return rep.status(404).send({ error: 'Circuit breaker not found' })
    const updated = await prisma.hrspCircuitBreaker.update({
      where: { id },
      data: { state: 'closed', failureCount: 0, openedAt: null, nextRetryAt: null },
    })
    prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CIRCUIT_BREAKER_RESET', module: 'resilience', entityType: 'HrspCircuitBreaker', entityId: id, newValues: { service: cb.serviceName } as never } as never }).catch(() => null)
    return updated
  })

  // ── Failover Plans ────────────────────────────────────────────────────────────
  app.get('/failover/plans', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const plans = await prisma.hrspFailoverPlan.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } })
    return { plans }
  })

  app.post('/failover/plans', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as {
      planName: string; targetService: string; strategy?: string
      primaryTarget: string; secondaryTarget?: string
      estimatedRtoSec?: number; estimatedRpoSec?: number; steps?: unknown[]
    }
    const plan = await prisma.hrspFailoverPlan.create({
      data: {
        tenantId, planName: body.planName, targetService: body.targetService,
        strategy: body.strategy ?? 'manual',
        primaryTarget: body.primaryTarget, secondaryTarget: body.secondaryTarget ?? null,
        estimatedRtoSec: body.estimatedRtoSec ?? 300,
        estimatedRpoSec: body.estimatedRpoSec ?? 60,
        steps: (body.steps ?? []) as never,
      },
    })
    prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'resilience', entityType: 'HrspFailoverPlan', entityId: plan.id, newValues: body as never } as never }).catch(() => null)
    return plan
  })

  app.post('/failover/simulate', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { planId?: string; targetService?: string; strategy?: string; primaryTarget?: string; secondaryTarget?: string }

    let plan: { id: string; targetService: string; strategy: string; primaryTarget: string; secondaryTarget: string | null; estimatedRtoSec: number; estimatedRpoSec: number; steps: unknown[] } | null = null

    if (body.planId) {
      const found = await prisma.hrspFailoverPlan.findFirst({ where: { id: body.planId, tenantId } })
      if (!found) return rep.status(404).send({ error: 'Plan not found' })
      plan = { ...found, steps: found.steps as unknown[] }
    } else {
      plan = {
        id: 'adhoc', targetService: body.targetService ?? 'database',
        strategy: body.strategy ?? 'manual',
        primaryTarget: body.primaryTarget ?? 'primary-db',
        secondaryTarget: body.secondaryTarget ?? 'replica-db',
        estimatedRtoSec: 300, estimatedRpoSec: 60, steps: [],
      }
    }

    const result = simulateFailover(plan)

    if (body.planId) {
      await prisma.hrspFailoverPlan.update({
        where: { id: body.planId },
        data: { lastSimulatedAt: new Date(), lastScore: result.score },
      })
    }

    prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'SIMULATE_FAILOVER', module: 'resilience', entityType: 'HrspFailoverPlan', entityId: body.planId ?? 'adhoc', newValues: { score: result.score } as never } as never }).catch(() => null)
    return result
  })

  // ── Disaster Recovery ─────────────────────────────────────────────────────────
  app.get('/dr/simulations', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const sims = await prisma.hrspDrSimulation.findMany({
      where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 50,
      include: { scenario: true },
    })
    return { simulations: sims }
  })

  app.post('/dr/simulate', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as {
      scenarioType: string; name?: string; severity?: string
      estimatedRtoSec?: number; estimatedRpoSec?: number
    }

    // Auto-upsert scenario by type
    const scenarioData = {
      tenantId, name: body.name ?? `${body.scenarioType.replace(/_/g, ' ')} scenario`,
      scenarioType: body.scenarioType, severity: body.severity ?? 'high',
      estimatedRtoSec: body.estimatedRtoSec ?? 3600,
      estimatedRpoSec: body.estimatedRpoSec ?? 900,
      recoverySteps: [] as never,
    }

    const existing = await prisma.hrspDrScenario.findFirst({ where: { tenantId, scenarioType: body.scenarioType } })
    const scenario = existing ?? await prisma.hrspDrScenario.create({ data: scenarioData })

    const now = new Date()
    const sim = await prisma.hrspDrSimulation.create({
      data: { tenantId, scenarioId: scenario.id, status: 'running', startedAt: now },
    })

    const result = simulateDrScenario({
      scenarioType: scenario.scenarioType, name: scenario.name,
      severity: scenario.severity, estimatedRtoSec: scenario.estimatedRtoSec,
      estimatedRpoSec: scenario.estimatedRpoSec,
    })

    const updated = await prisma.hrspDrSimulation.update({
      where: { id: sim.id },
      data: {
        status: 'completed', completedAt: new Date(),
        actualRtoSec: result.actualRtoSec, actualRpoSec: result.actualRpoSec,
        rtoMet: result.rtoMet, rpoMet: result.rpoMet,
        resilienceScore: result.resilienceScore,
        findings: result.findings as never,
        recommendations: result.recommendations as never,
        report: result.report as never,
      },
      include: { scenario: true },
    })

    prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'DR_SIMULATE', module: 'resilience', entityType: 'HrspDrSimulation', entityId: sim.id, newValues: { scenarioType: body.scenarioType, score: result.resilienceScore } as never } as never }).catch(() => null)
    return updated
  })

  // ── Distributed Cache ──────────────────────────────────────────────────────────
  app.get('/cache', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const strategies = await prisma.hrspCacheStrategy.findMany({ where: { tenantId }, orderBy: { strategyKey: 'asc' } })
    const totalHits = strategies.reduce((s, c) => s + c.hitCount, 0)
    const totalMisses = strategies.reduce((s, c) => s + c.missCount, 0)
    const hitRate = totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : null
    return { strategies, summary: { totalHits, totalMisses, hitRate } }
  })

  app.post('/cache/test', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { strategyKey } = req.body as { strategyKey?: string }
    const key = strategyKey ?? 'session'
    const result = testCacheHealth(key)

    await prisma.hrspCacheStrategy.upsert({
      where: { tenantId_strategyKey: { tenantId, strategyKey: key } },
      create: {
        tenantId, strategyKey: key, cacheLayer: 'redis',
        hitCount: result.hitRate > 0 ? 100 : 0, missCount: 100 - (result.hitRate > 0 ? Math.round(result.hitRate * 100) : 0),
        cacheHealth: result.health, lastHealthCheck: new Date(),
      },
      update: {
        cacheHealth: result.health, lastHealthCheck: new Date(),
        hitCount: { increment: result.hitRate > 0 ? 10 : 0 },
        missCount: { increment: result.hitRate < 1 ? 2 : 0 },
        degradedModeHits: { increment: result.degradedModeActive ? 1 : 0 },
      },
    })

    return result
  })

  // ── Deployment Simulation ──────────────────────────────────────────────────────
  app.get('/deploy/simulations', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const sims = await prisma.hrspDeploymentSimulation.findMany({
      where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 50,
    })
    return { simulations: sims }
  })

  app.post('/deploy/simulate', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { strategy: string; version: string; targetEnvironment?: string }
    const now = new Date()

    const sim = await prisma.hrspDeploymentSimulation.create({
      data: {
        tenantId, strategy: body.strategy, version: body.version,
        targetEnvironment: body.targetEnvironment ?? 'production',
        status: 'running', startedAt: now,
      },
    })

    const result = simulateDeployment(body.strategy, body.version)
    const updated = await prisma.hrspDeploymentSimulation.update({
      where: { id: sim.id },
      data: {
        status: result.rollbackRecommended ? 'failed' : 'completed',
        completedAt: new Date(),
        readinessScore: result.readinessScore,
        healthGates: result.healthGates as never,
        rollbackRecommended: result.rollbackRecommended,
        rollbackReason: result.rollbackReason,
        simulationSteps: result.steps as never,
        findings: result.findings as never,
      },
    })

    prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'DEPLOY_SIMULATE', module: 'resilience', entityType: 'HrspDeploymentSimulation', entityId: sim.id, newValues: { strategy: body.strategy, version: body.version, readinessScore: result.readinessScore } as never } as never }).catch(() => null)
    return updated
  })

  // ── Chaos Engineering ─────────────────────────────────────────────────────────
  app.get('/chaos/experiments', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const experiments = await prisma.hrspChaosExperiment.findMany({
      where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 50,
    })
    return { experiments }
  })

  app.post('/chaos/run', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as {
      experimentType: string; targetComponent: string
      intensity?: string; durationSeconds?: number
    }

    const now = new Date()
    const exp = await prisma.hrspChaosExperiment.create({
      data: {
        tenantId,
        experimentType: body.experimentType,
        targetComponent: body.targetComponent,
        intensity: body.intensity ?? 'low',
        durationSeconds: body.durationSeconds ?? 30,
        status: 'running', isSafeMode: true, startedAt: now,
      },
    })

    const result = runChaosExperiment(body.experimentType, body.targetComponent, body.intensity ?? 'low', body.durationSeconds ?? 30)

    const updated = await prisma.hrspChaosExperiment.update({
      where: { id: exp.id },
      data: {
        status: 'completed', completedAt: new Date(),
        systemResponse: result.systemResponse as never,
        recommendations: result.recommendations as never,
        resilienceScore: result.resilienceScore,
      },
    })

    prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CHAOS_RUN', module: 'resilience', entityType: 'HrspChaosExperiment', entityId: exp.id, newValues: { type: body.experimentType, intensity: body.intensity, score: result.resilienceScore } as never } as never }).catch(() => null)
    return updated
  })

  // ── Resilience Reports ────────────────────────────────────────────────────────
  app.get('/reports', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const reports = await prisma.hrspResilienceReport.findMany({
      where: { tenantId }, orderBy: { generatedAt: 'desc' }, take: 50,
    })
    return { reports }
  })
}
