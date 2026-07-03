import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function autoScalingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // T1: registry
  app.get('/registry', async () => ({
    targetTypes: ['deployment', 'service', 'worker-pool', 'database', 'cache'],
    metricTypes: ['cpu', 'memory', 'requests-per-sec', 'queue-depth', 'latency', 'custom'],
    comparisons: ['gt', 'gte', 'lt', 'lte'],
    scaleDirections: ['up', 'down'],
    recommendationTypes: ['rightsize', 'scale-up', 'scale-down', 'schedule'],
  }))

  // T2: create target
  app.post('/targets', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { name, targetType = 'deployment', resourceRef, minReplicas = 1, maxReplicas = 10, currentReplicas = 1, metadata } = req.body as any
    const target = await prisma.asTarget.create({
      data: { tenantId: r.tenantId, name, targetType, resourceRef, minReplicas, maxReplicas, currentReplicas, desiredReplicas: currentReplicas, status: 'active', metadata: metadata as never },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'CREATE', module: 'auto-scaling', entityType: 'AsTarget', entityId: target.id, newValues: { name, resourceRef } as never } as never }).catch(() => null)
    return target
  })

  // T3: list targets
  app.get('/targets', async (req) => {
    const r = req as unknown as { tenantId: string }
    const targets = await prisma.asTarget.findMany({ where: { tenantId: r.tenantId }, orderBy: { createdAt: 'desc' }, include: { _count: { select: { policies: true, scalingEvents: true, schedules: true } } } })
    return { targets, total: targets.length }
  })

  // T4: get target
  app.get('/targets/:tid', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { tid } = req.params as any
    return prisma.asTarget.findFirstOrThrow({ where: { id: tid, tenantId: r.tenantId }, include: { policies: true, schedules: true } })
  })

  // T5: update target
  app.patch('/targets/:tid', async (req) => {
    const { tid } = req.params as any
    const data = req.body as any
    return prisma.asTarget.update({ where: { id: tid }, data: { ...data, metadata: data.metadata as never } })
  })

  // T6: create policy
  app.post('/targets/:tid/policies', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { tid } = req.params as any
    const { name, metricType = 'cpu', threshold = 70, comparison = 'gt', scaleDirection = 'up', stepSize = 1, cooldownSec = 300, metadata } = req.body as any
    return prisma.asPolicy.create({
      data: { tenantId: r.tenantId, targetId: tid, name, metricType, threshold, comparison, scaleDirection, stepSize, cooldownSec, isActive: true, metadata: metadata as never },
    })
  })

  // T7: list policies
  app.get('/targets/:tid/policies', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { tid } = req.params as any
    const policies = await prisma.asPolicy.findMany({ where: { targetId: tid, tenantId: r.tenantId }, orderBy: { createdAt: 'desc' } })
    return { policies, total: policies.length }
  })

  // T8: update policy
  app.patch('/targets/:tid/policies/:pid', async (req) => {
    const { pid } = req.params as any
    const data = req.body as any
    return prisma.asPolicy.update({ where: { id: pid }, data: { ...data, metadata: data.metadata as never } })
  })

  // T9: record metric sample
  app.post('/targets/:tid/metrics', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { tid } = req.params as any
    const { metricType = 'cpu', value } = req.body as any
    return prisma.asMetricSample.create({
      data: { tenantId: r.tenantId, targetId: tid, metricType, value },
    })
  })

  // T10: list metric samples
  app.get('/targets/:tid/metrics', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { tid } = req.params as any
    const metricType = (req.query as any).metricType
    const where: any = { targetId: tid, tenantId: r.tenantId }
    if (metricType) where.metricType = metricType
    const samples = await prisma.asMetricSample.findMany({ where, orderBy: { recordedAt: 'desc' }, take: 100 })
    return { samples, total: samples.length }
  })

  // T11: evaluate policies (simulation — checks metrics against thresholds and scales)
  app.post('/targets/:tid/evaluate', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { tid } = req.params as any
    const target = await prisma.asTarget.findFirstOrThrow({ where: { id: tid, tenantId: r.tenantId } })
    const policies = await prisma.asPolicy.findMany({ where: { targetId: tid, isActive: true } })
    const actions: any[] = []
    for (const policy of policies) {
      const latest = await prisma.asMetricSample.findFirst({ where: { targetId: tid, metricType: policy.metricType }, orderBy: { recordedAt: 'desc' } })
      if (!latest) continue
      const triggered =
        (policy.comparison === 'gt' && latest.value > policy.threshold) ||
        (policy.comparison === 'gte' && latest.value >= policy.threshold) ||
        (policy.comparison === 'lt' && latest.value < policy.threshold) ||
        (policy.comparison === 'lte' && latest.value <= policy.threshold)
      if (!triggered) continue
      const from = target.currentReplicas
      let to = policy.scaleDirection === 'up' ? from + policy.stepSize : from - policy.stepSize
      to = Math.max(target.minReplicas, Math.min(target.maxReplicas, to))
      if (to === from) { actions.push({ policyId: policy.id, triggered: true, action: 'none', reason: 'at-limit' }); continue }
      await prisma.asTarget.update({ where: { id: tid }, data: { currentReplicas: to, desiredReplicas: to } })
      await prisma.asPolicy.update({ where: { id: policy.id }, data: { lastTriggeredAt: new Date() } })
      const event = await prisma.asScalingEvent.create({
        data: { tenantId: r.tenantId, targetId: tid, policyId: policy.id, eventType: policy.scaleDirection === 'up' ? 'scale-up' : 'scale-down', fromReplicas: from, toReplicas: to, reason: `${policy.metricType} ${policy.comparison} ${policy.threshold} (value: ${latest.value})`, triggeredBy: 'policy', status: 'completed' },
      })
      target.currentReplicas = to
      actions.push({ policyId: policy.id, triggered: true, action: policy.scaleDirection, from, to, eventId: event.id })
    }
    return { evaluated: policies.length, actions, currentReplicas: target.currentReplicas }
  })

  // T12: manual scale
  app.post('/targets/:tid/scale', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { tid } = req.params as any
    const { replicas } = req.body as any
    const target = await prisma.asTarget.findFirstOrThrow({ where: { id: tid, tenantId: r.tenantId } })
    const to = Math.max(target.minReplicas, Math.min(target.maxReplicas, replicas))
    await prisma.asTarget.update({ where: { id: tid }, data: { currentReplicas: to, desiredReplicas: to } })
    await prisma.asScalingEvent.create({
      data: { tenantId: r.tenantId, targetId: tid, eventType: to > target.currentReplicas ? 'scale-up' : 'scale-down', fromReplicas: target.currentReplicas, toReplicas: to, reason: 'manual scale', triggeredBy: 'manual', status: 'completed' },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'SCALE', module: 'auto-scaling', entityType: 'AsTarget', entityId: tid, newValues: { replicas: to } as never } as never }).catch(() => null)
    return { success: true, replicas: to }
  })

  // T13: list scaling events
  app.get('/targets/:tid/events', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { tid } = req.params as any
    const events = await prisma.asScalingEvent.findMany({ where: { targetId: tid, tenantId: r.tenantId }, orderBy: { createdAt: 'desc' }, take: 100 })
    return { events, total: events.length }
  })

  // T14: all scaling events
  app.get('/events', async (req) => {
    const r = req as unknown as { tenantId: string }
    const events = await prisma.asScalingEvent.findMany({ where: { tenantId: r.tenantId }, orderBy: { createdAt: 'desc' }, take: 100 })
    return { events, total: events.length }
  })

  // T15: create schedule
  app.post('/targets/:tid/schedules', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { tid } = req.params as any
    const { name, cronExpr, targetReplicas, timezone = 'UTC', metadata } = req.body as any
    return prisma.asSchedule.create({
      data: { tenantId: r.tenantId, targetId: tid, name, cronExpr, targetReplicas, timezone, isActive: true, metadata: metadata as never },
    })
  })

  // T16: list schedules
  app.get('/targets/:tid/schedules', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { tid } = req.params as any
    const schedules = await prisma.asSchedule.findMany({ where: { targetId: tid, tenantId: r.tenantId } })
    return { schedules, total: schedules.length }
  })

  // T17: update schedule
  app.patch('/targets/:tid/schedules/:sid', async (req) => {
    const { sid } = req.params as any
    const data = req.body as any
    return prisma.asSchedule.update({ where: { id: sid }, data: { ...data, metadata: data.metadata as never } })
  })

  // T18: run schedule now (simulation)
  app.post('/targets/:tid/schedules/:sid/run', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { tid, sid } = req.params as any
    const schedule = await prisma.asSchedule.findUniqueOrThrow({ where: { id: sid } })
    const target = await prisma.asTarget.findFirstOrThrow({ where: { id: tid, tenantId: r.tenantId } })
    const to = Math.max(target.minReplicas, Math.min(target.maxReplicas, schedule.targetReplicas))
    await prisma.asTarget.update({ where: { id: tid }, data: { currentReplicas: to, desiredReplicas: to } })
    await prisma.asSchedule.update({ where: { id: sid }, data: { lastRunAt: new Date() } })
    await prisma.asScalingEvent.create({
      data: { tenantId: r.tenantId, targetId: tid, eventType: 'scheduled', fromReplicas: target.currentReplicas, toReplicas: to, reason: `schedule: ${schedule.name}`, triggeredBy: 'schedule', status: 'completed' },
    })
    return { success: true, replicas: to }
  })

  // T19: generate recommendation (simulation based on metric averages)
  app.post('/targets/:tid/recommendations/generate', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { tid } = req.params as any
    const target = await prisma.asTarget.findFirstOrThrow({ where: { id: tid, tenantId: r.tenantId } })
    const samples = await prisma.asMetricSample.findMany({ where: { targetId: tid, metricType: 'cpu' }, orderBy: { recordedAt: 'desc' }, take: 20 })
    const avg = samples.length ? samples.reduce((s, m) => s + m.value, 0) / samples.length : 50
    let recommended = target.currentReplicas
    let rationale = `Average CPU ${avg.toFixed(1)}% across ${samples.length} samples — current sizing is appropriate.`
    if (avg > 75) { recommended = Math.min(target.maxReplicas, target.currentReplicas + 1); rationale = `Average CPU ${avg.toFixed(1)}% exceeds 75% — recommend scaling up.` }
    else if (avg < 25 && target.currentReplicas > target.minReplicas) { recommended = Math.max(target.minReplicas, target.currentReplicas - 1); rationale = `Average CPU ${avg.toFixed(1)}% below 25% — recommend scaling down to save cost.` }
    return prisma.asRecommendation.create({
      data: { tenantId: r.tenantId, targetId: tid, recommendationType: recommended > target.currentReplicas ? 'scale-up' : recommended < target.currentReplicas ? 'scale-down' : 'rightsize', currentValue: target.currentReplicas, recommendedValue: recommended, confidence: Math.min(0.95, 0.5 + samples.length * 0.02), rationale, status: 'pending' },
    })
  })

  // T20: list recommendations
  app.get('/targets/:tid/recommendations', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { tid } = req.params as any
    const recommendations = await prisma.asRecommendation.findMany({ where: { targetId: tid, tenantId: r.tenantId }, orderBy: { createdAt: 'desc' } })
    return { recommendations, total: recommendations.length }
  })

  // T21: apply recommendation (requires explicit action — approval by calling this endpoint)
  app.post('/targets/:tid/recommendations/:rid/apply', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { tid, rid } = req.params as any
    const rec = await prisma.asRecommendation.findUniqueOrThrow({ where: { id: rid } })
    const target = await prisma.asTarget.findFirstOrThrow({ where: { id: tid, tenantId: r.tenantId } })
    await prisma.asTarget.update({ where: { id: tid }, data: { currentReplicas: rec.recommendedValue, desiredReplicas: rec.recommendedValue } })
    await prisma.asRecommendation.update({ where: { id: rid }, data: { status: 'applied' } })
    await prisma.asScalingEvent.create({
      data: { tenantId: r.tenantId, targetId: tid, eventType: 'recommendation', fromReplicas: target.currentReplicas, toReplicas: rec.recommendedValue, reason: 'applied recommendation', triggeredBy: 'recommendation', status: 'completed' },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'APPLY_RECOMMENDATION', module: 'auto-scaling', entityType: 'AsRecommendation', entityId: rid, newValues: { replicas: rec.recommendedValue } as never } as never }).catch(() => null)
    return { success: true, replicas: rec.recommendedValue }
  })

  // T22: dismiss recommendation
  app.post('/targets/:tid/recommendations/:rid/dismiss', async (req) => {
    const { rid } = req.params as any
    await prisma.asRecommendation.update({ where: { id: rid }, data: { status: 'dismissed' } })
    return { success: true }
  })

  // T23: simulate load (generates metric samples)
  app.post('/targets/:tid/simulate-load', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { tid } = req.params as any
    const { metricType = 'cpu', baseValue = 50, count = 10 } = req.body as any
    const samples = []
    for (let i = 0; i < Math.min(count, 50); i++) {
      const sample = await prisma.asMetricSample.create({
        data: { tenantId: r.tenantId, targetId: tid, metricType, value: Math.max(0, baseValue + (Math.random() * 20 - 10)) },
      })
      samples.push(sample)
    }
    return { created: samples.length, metricType }
  })

  // T24: target utilization summary
  app.get('/targets/:tid/utilization', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { tid } = req.params as any
    const samples = await prisma.asMetricSample.findMany({ where: { targetId: tid, tenantId: r.tenantId }, orderBy: { recordedAt: 'desc' }, take: 100 })
    const byMetric: Record<string, { avg: number; max: number; min: number; count: number }> = {}
    for (const s of samples) {
      if (!byMetric[s.metricType]) byMetric[s.metricType] = { avg: 0, max: -Infinity, min: Infinity, count: 0 }
      const m = byMetric[s.metricType]
      m.avg += s.value; m.max = Math.max(m.max, s.value); m.min = Math.min(m.min, s.value); m.count++
    }
    for (const k of Object.keys(byMetric)) byMetric[k].avg = byMetric[k].avg / byMetric[k].count
    return { utilization: byMetric, sampleCount: samples.length }
  })

  // T25: overall stats
  app.get('/stats', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [targets, policies, events, schedules, recommendations] = await Promise.all([
      prisma.asTarget.count({ where: { tenantId: r.tenantId } }),
      prisma.asPolicy.count({ where: { tenantId: r.tenantId } }),
      prisma.asScalingEvent.count({ where: { tenantId: r.tenantId } }),
      prisma.asSchedule.count({ where: { tenantId: r.tenantId } }),
      prisma.asRecommendation.count({ where: { tenantId: r.tenantId } }),
    ])
    return { targets, policies, events, schedules, recommendations }
  })

  // T26: delete policy
  app.delete('/targets/:tid/policies/:pid', async (req) => {
    const { pid } = req.params as any
    await prisma.asPolicy.delete({ where: { id: pid } })
    return { success: true }
  })

  // T27: delete schedule
  app.delete('/targets/:tid/schedules/:sid', async (req) => {
    const { sid } = req.params as any
    await prisma.asSchedule.delete({ where: { id: sid } })
    return { success: true }
  })

  // T28: delete target
  app.delete('/targets/:tid', async (req) => {
    const { tid } = req.params as any
    await prisma.asTarget.delete({ where: { id: tid } })
    return { success: true }
  })
}
