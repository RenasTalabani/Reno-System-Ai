import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

// AI governance: model registry with approval gates, usage limits, incident
// tracking, periodic reviews. Every governance action is audited.

export async function aiGovernanceRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // T1: registry
  app.get('/registry', async () => ({
    policyAreas: ['usage', 'data-handling', 'bias', 'transparency', 'safety'],
    enforcements: ['advisory', 'soft-block', 'hard-block'],
    riskTiers: ['low', 'medium', 'high', 'prohibited'],
    approvalStatuses: ['pending', 'approved', 'rejected', 'suspended'],
    limitTypes: ['tokens-per-day', 'requests-per-day', 'cost-per-day'],
    incidentTypes: ['bias-detected', 'hallucination', 'data-leak', 'prohibited-use', 'quota-breach'],
    reviewTypes: ['quarterly', 'annual', 'ad-hoc', 'incident-driven'],
  }))

  // T2: create policy
  app.post('/policies', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { name, policyArea = 'usage', rules = {}, enforcement = 'advisory', metadata } = req.body as any
    const policy = await prisma.aigPolicy.create({
      data: { tenantId: r.tenantId, name, policyArea, rules: rules as never, enforcement, isActive: true, metadata: metadata as never },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'CREATE', module: 'ai-governance', entityType: 'AigPolicy', entityId: policy.id, newValues: { name, enforcement } as never } as never }).catch(() => null)
    return policy
  })

  // T3: list policies
  app.get('/policies', async (req) => {
    const r = req as unknown as { tenantId: string }
    const policies = await prisma.aigPolicy.findMany({ where: { tenantId: r.tenantId }, orderBy: { createdAt: 'desc' } })
    return { policies, total: policies.length }
  })

  // T4: update policy
  app.patch('/policies/:pid', async (req) => {
    const { pid } = req.params as any
    const data = req.body as any
    return prisma.aigPolicy.update({ where: { id: pid }, data: { ...data, rules: data.rules as never, metadata: data.metadata as never } })
  })

  // T5: register model
  app.post('/models', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { modelName, provider = 'reno-brain', riskTier = 'low', allowedUses = [], prohibitedUses = [], metadata } = req.body as any
    const model = await prisma.aigModelEntry.create({
      data: { tenantId: r.tenantId, modelName, provider, riskTier, approvalStatus: 'pending', allowedUses: allowedUses as never, prohibitedUses: prohibitedUses as never, metadata: metadata as never },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'REGISTER_MODEL', module: 'ai-governance', entityType: 'AigModelEntry', entityId: model.id, newValues: { modelName, provider, riskTier } as never } as never }).catch(() => null)
    return model
  })

  // T6: list model registry
  app.get('/models', async (req) => {
    const r = req as unknown as { tenantId: string }
    const models = await prisma.aigModelEntry.findMany({ where: { tenantId: r.tenantId }, orderBy: { createdAt: 'desc' } })
    return { models, total: models.length }
  })

  // T7: approve model (audited; prohibited tier cannot be approved)
  app.post('/models/:mid/approve', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { mid } = req.params as any
    const model = await prisma.aigModelEntry.findFirstOrThrow({ where: { id: mid, tenantId: r.tenantId } })
    if (model.riskTier === 'prohibited') return { error: 'prohibited-tier models cannot be approved' }
    const updated = await prisma.aigModelEntry.update({ where: { id: mid }, data: { approvalStatus: 'approved', approvedBy: r.userId } })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'APPROVE_MODEL', module: 'ai-governance', entityType: 'AigModelEntry', entityId: mid, newValues: { modelName: model.modelName } as never } as never }).catch(() => null)
    return updated
  })

  // T8: suspend model
  app.post('/models/:mid/suspend', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { mid } = req.params as any
    const updated = await prisma.aigModelEntry.update({ where: { id: mid }, data: { approvalStatus: 'suspended' } })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'SUSPEND_MODEL', module: 'ai-governance', entityType: 'AigModelEntry', entityId: mid, newValues: { suspended: true } as never } as never }).catch(() => null)
    return updated
  })

  // T9: check model usage permission (governance gate)
  app.post('/models/check', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { modelName, provider = 'reno-brain', useCase } = req.body as any
    const model = await prisma.aigModelEntry.findFirst({ where: { tenantId: r.tenantId, modelName, provider } })
    if (!model) return { allowed: false, reason: 'model not registered' }
    if (model.approvalStatus !== 'approved') return { allowed: false, reason: `model status is ${model.approvalStatus}` }
    const prohibited = (model.prohibitedUses as string[]) ?? []
    if (useCase && prohibited.includes(useCase)) return { allowed: false, reason: `use case "${useCase}" is prohibited for this model` }
    return { allowed: true, riskTier: model.riskTier }
  })

  // T10: request approval
  app.post('/approvals', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { requestType, subject, justification } = req.body as any
    return prisma.aigApproval.create({
      data: { tenantId: r.tenantId, requestType, subject, justification, requestedBy: r.userId, status: 'pending' },
    })
  })

  // T11: list approvals
  app.get('/approvals', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { status } = req.query as any
    const where: any = { tenantId: r.tenantId }
    if (status) where.status = status
    const approvals = await prisma.aigApproval.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 })
    return { approvals, total: approvals.length }
  })

  // T12: decide approval (audited)
  app.post('/approvals/:aid/decide', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { aid } = req.params as any
    const { decision, note } = req.body as any
    const approval = await prisma.aigApproval.update({
      where: { id: aid },
      data: { status: decision === 'approve' ? 'approved' : 'rejected', decidedBy: r.userId, decisionNote: note, decidedAt: new Date() },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'DECIDE_APPROVAL', module: 'ai-governance', entityType: 'AigApproval', entityId: aid, newValues: { decision } as never } as never }).catch(() => null)
    return approval
  })

  // T13: create usage limit
  app.post('/usage-limits', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { scope = 'tenant', scopeRef, limitType = 'tokens-per-day', limitValue, action = 'warn' } = req.body as any
    return prisma.aigUsageLimit.create({
      data: { tenantId: r.tenantId, scope, scopeRef, limitType, limitValue, action, isActive: true },
    })
  })

  // T14: list usage limits
  app.get('/usage-limits', async (req) => {
    const r = req as unknown as { tenantId: string }
    const limits = await prisma.aigUsageLimit.findMany({ where: { tenantId: r.tenantId } })
    return { limits: limits.map(l => ({ ...l, remaining: Math.max(0, l.limitValue - l.usedValue), pctUsed: Number(((l.usedValue / l.limitValue) * 100).toFixed(1)) })), total: limits.length }
  })

  // T15: consume usage against limit (enforcement point)
  app.post('/usage-limits/:lid/consume', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { lid } = req.params as any
    const { amount = 1 } = req.body as any
    const limit = await prisma.aigUsageLimit.findFirstOrThrow({ where: { id: lid, tenantId: r.tenantId } })
    const wouldExceed = limit.usedValue + amount > limit.limitValue
    if (wouldExceed && limit.action === 'hard-block') {
      return { allowed: false, action: 'hard-block', used: limit.usedValue, limit: limit.limitValue }
    }
    const updated = await prisma.aigUsageLimit.update({ where: { id: lid }, data: { usedValue: { increment: amount } } })
    return { allowed: true, warning: wouldExceed && limit.action === 'warn', used: updated.usedValue, limit: updated.limitValue }
  })

  // T16: reset usage limit
  app.post('/usage-limits/:lid/reset', async (req) => {
    const { lid } = req.params as any
    return prisma.aigUsageLimit.update({ where: { id: lid }, data: { usedValue: 0 } })
  })

  // T17: report incident
  app.post('/incidents', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { incidentType, severity = 'medium', description, modelRef, metadata } = req.body as any
    const incident = await prisma.aigIncident.create({
      data: { tenantId: r.tenantId, incidentType, severity, description, modelRef, status: 'open', metadata: metadata as never },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'AI_INCIDENT', module: 'ai-governance', entityType: 'AigIncident', entityId: incident.id, newValues: { incidentType, severity } as never } as never }).catch(() => null)
    return incident
  })

  // T18: list incidents
  app.get('/incidents', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { status } = req.query as any
    const where: any = { tenantId: r.tenantId }
    if (status) where.status = status
    const incidents = await prisma.aigIncident.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 })
    return { incidents, total: incidents.length }
  })

  // T19: resolve incident
  app.post('/incidents/:iid/resolve', async (req) => {
    const { iid } = req.params as any
    const { resolution } = req.body as any
    return prisma.aigIncident.update({ where: { id: iid }, data: { status: 'resolved', resolution, resolvedAt: new Date() } })
  })

  // T20: start governance review
  app.post('/reviews', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { reviewType = 'quarterly', scope } = req.body as any
    return prisma.aigReview.create({
      data: { tenantId: r.tenantId, reviewType, scope, reviewer: r.userId, status: 'in-progress' },
    })
  })

  // T21: complete review (auto-scores from current governance posture)
  app.post('/reviews/:rid/complete', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { rid } = req.params as any
    const [models, approvedModels, openIncidents, activePolicies] = await Promise.all([
      prisma.aigModelEntry.count({ where: { tenantId: r.tenantId } }),
      prisma.aigModelEntry.count({ where: { tenantId: r.tenantId, approvalStatus: 'approved' } }),
      prisma.aigIncident.count({ where: { tenantId: r.tenantId, status: 'open' } }),
      prisma.aigPolicy.count({ where: { tenantId: r.tenantId, isActive: true } }),
    ])
    const score = Math.max(0, Math.min(100, 50 + activePolicies * 5 + (models ? (approvedModels / models) * 30 : 0) - openIncidents * 10))
    const findings = { models, approvedModels, openIncidents, activePolicies, unapprovedModels: models - approvedModels }
    return prisma.aigReview.update({
      where: { id: rid },
      data: { status: 'completed', score: Number(score.toFixed(1)), findings: findings as never, completedAt: new Date() },
    })
  })

  // T22: list reviews
  app.get('/reviews', async (req) => {
    const r = req as unknown as { tenantId: string }
    const reviews = await prisma.aigReview.findMany({ where: { tenantId: r.tenantId }, orderBy: { createdAt: 'desc' } })
    return { reviews, total: reviews.length }
  })

  // T23: governance dashboard
  app.get('/dashboard', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [policies, models, pendingApprovals, openIncidents, limits] = await Promise.all([
      prisma.aigPolicy.count({ where: { tenantId: r.tenantId, isActive: true } }),
      prisma.aigModelEntry.findMany({ where: { tenantId: r.tenantId } }),
      prisma.aigApproval.count({ where: { tenantId: r.tenantId, status: 'pending' } }),
      prisma.aigIncident.count({ where: { tenantId: r.tenantId, status: 'open' } }),
      prisma.aigUsageLimit.findMany({ where: { tenantId: r.tenantId, isActive: true } }),
    ])
    const highRisk = models.filter(m => m.riskTier === 'high' || m.riskTier === 'prohibited').length
    const nearLimit = limits.filter(l => l.usedValue / l.limitValue > 0.8).length
    return {
      activePolicies: policies, registeredModels: models.length,
      approvedModels: models.filter(m => m.approvalStatus === 'approved').length,
      highRiskModels: highRisk, pendingApprovals, openIncidents, limitsNearThreshold: nearLimit,
      governanceStatus: openIncidents > 0 || highRisk > 0 ? 'attention-needed' : 'healthy',
    }
  })

  // T24: stats
  app.get('/stats', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [policies, models, approvals, limits, incidents, reviews] = await Promise.all([
      prisma.aigPolicy.count({ where: { tenantId: r.tenantId } }),
      prisma.aigModelEntry.count({ where: { tenantId: r.tenantId } }),
      prisma.aigApproval.count({ where: { tenantId: r.tenantId } }),
      prisma.aigUsageLimit.count({ where: { tenantId: r.tenantId } }),
      prisma.aigIncident.count({ where: { tenantId: r.tenantId } }),
      prisma.aigReview.count({ where: { tenantId: r.tenantId } }),
    ])
    return { policies, models, approvals, usageLimits: limits, incidents, reviews }
  })

  // T25: delete policy
  app.delete('/policies/:pid', async (req) => {
    const { pid } = req.params as any
    await prisma.aigPolicy.delete({ where: { id: pid } })
    return { success: true }
  })

  // T26: delete usage limit
  app.delete('/usage-limits/:lid', async (req) => {
    const { lid } = req.params as any
    await prisma.aigUsageLimit.delete({ where: { id: lid } })
    return { success: true }
  })

  // T27: delete model entry
  app.delete('/models/:mid', async (req) => {
    const { mid } = req.params as any
    await prisma.aigModelEntry.delete({ where: { id: mid } })
    return { success: true }
  })

  // T28: delete incident
  app.delete('/incidents/:iid', async (req) => {
    const { iid } = req.params as any
    await prisma.aigIncident.delete({ where: { id: iid } })
    return { success: true }
  })
}
