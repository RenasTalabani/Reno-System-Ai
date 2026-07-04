import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

async function trail(tenantId: string, eventType: string, actor: string, systemRef?: string, detail?: string) {
  await prisma.acAuditTrail.create({ data: { tenantId, eventType, actor, systemRef, detail } }).catch(() => null)
}

export async function aiComplianceRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // T1: registry
  app.get('/registry', async () => ({
    jurisdictions: ['EU', 'US', 'UK', 'global'],
    riskCategories: ['minimal', 'limited', 'high', 'unacceptable'],
    complianceStatuses: ['not-assessed', 'compliant', 'partial', 'non-compliant'],
    legalBases: ['consent', 'contract', 'legal-obligation', 'legitimate-interest', 'vital-interest'],
    assessmentTypes: ['conformity', 'dpia', 'fundamental-rights', 'bias-audit'],
  }))

  // T2: register regulation
  app.post('/regulations', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { name, code, jurisdiction = 'EU', riskCategory = 'limited', description, metadata } = req.body as any
    const reg = await prisma.acRegulation.create({
      data: { tenantId: r.tenantId, name, code, jurisdiction, riskCategory, description, status: 'active', metadata: metadata as never },
    })
    await trail(r.tenantId, 'regulation.registered', r.userId, code, name)
    return reg
  })

  // T3: seed EU AI Act with requirements
  app.post('/regulations/seed-eu-ai-act', async (req) => {
    const r = req as unknown as { tenantId: string }
    const code = `EU-AI-ACT-${Date.now()}`
    const reg = await prisma.acRegulation.create({
      data: { tenantId: r.tenantId, name: 'EU AI Act', code, jurisdiction: 'EU', riskCategory: 'high', description: 'Regulation (EU) 2024/1689', status: 'active' },
    })
    const reqs = [
      { code: 'Art.9', title: 'Risk management system' },
      { code: 'Art.10', title: 'Data and data governance' },
      { code: 'Art.11', title: 'Technical documentation' },
      { code: 'Art.12', title: 'Record-keeping (logging)' },
      { code: 'Art.13', title: 'Transparency and information to users' },
      { code: 'Art.14', title: 'Human oversight' },
      { code: 'Art.15', title: 'Accuracy, robustness, cybersecurity' },
    ]
    for (const q of reqs) {
      await prisma.acRequirement.create({ data: { tenantId: r.tenantId, regulationId: reg.id, ...q, complianceStatus: 'not-assessed' } })
    }
    return { regulation: reg, requirementsCreated: reqs.length }
  })

  // T4: list regulations
  app.get('/regulations', async (req) => {
    const r = req as unknown as { tenantId: string }
    const regulations = await prisma.acRegulation.findMany({ where: { tenantId: r.tenantId }, include: { _count: { select: { requirements: true } } } })
    return { regulations, total: regulations.length }
  })

  // T5: list requirements
  app.get('/regulations/:rid/requirements', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { rid } = req.params as any
    const requirements = await prisma.acRequirement.findMany({ where: { regulationId: rid, tenantId: r.tenantId }, orderBy: { code: 'asc' } })
    return { requirements, total: requirements.length }
  })

  // T6: update requirement compliance status
  app.patch('/requirements/:qid', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { qid } = req.params as any
    const data = req.body as any
    const updated = await prisma.acRequirement.update({ where: { id: qid }, data: { ...data, metadata: data.metadata as never } })
    if (data.complianceStatus) await trail(r.tenantId, 'requirement.assessed', r.userId, updated.code, data.complianceStatus)
    return updated
  })

  // T7: regulation compliance summary
  app.get('/regulations/:rid/summary', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { rid } = req.params as any
    const requirements = await prisma.acRequirement.findMany({ where: { regulationId: rid, tenantId: r.tenantId } })
    const compliant = requirements.filter(q => q.complianceStatus === 'compliant').length
    const nonCompliant = requirements.filter(q => q.complianceStatus === 'non-compliant').length
    const compliancePct = requirements.length ? Number(((compliant / requirements.length) * 100).toFixed(1)) : 0
    return { total: requirements.length, compliant, nonCompliant, partial: requirements.filter(q => q.complianceStatus === 'partial').length, notAssessed: requirements.filter(q => q.complianceStatus === 'not-assessed').length, compliancePct }
  })

  // T8: create conformity assessment
  app.post('/assessments', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { systemName, assessmentType = 'conformity', riskLevel = 'limited' } = req.body as any
    const assessment = await prisma.acAssessment.create({
      data: { tenantId: r.tenantId, systemName, assessmentType, riskLevel, status: 'in-progress' },
    })
    await trail(r.tenantId, 'assessment.started', r.userId, systemName, assessmentType)
    return assessment
  })

  // T9: complete assessment (auto-scores from regulation compliance)
  app.post('/assessments/:aid/complete', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { aid } = req.params as any
    const requirements = await prisma.acRequirement.findMany({ where: { tenantId: r.tenantId } })
    const compliant = requirements.filter(q => q.complianceStatus === 'compliant').length
    const score = requirements.length ? Number(((compliant / requirements.length) * 100).toFixed(1)) : 0
    const findings = { requirementsChecked: requirements.length, compliant, gaps: requirements.length - compliant }
    const updated = await prisma.acAssessment.update({
      where: { id: aid }, data: { status: 'completed', score, findings: findings as never, completedAt: new Date() },
    })
    await trail(r.tenantId, 'assessment.completed', r.userId, updated.systemName, `score ${score}`)
    return updated
  })

  // T10: list assessments
  app.get('/assessments', async (req) => {
    const r = req as unknown as { tenantId: string }
    const assessments = await prisma.acAssessment.findMany({ where: { tenantId: r.tenantId }, orderBy: { createdAt: 'desc' } })
    return { assessments, total: assessments.length }
  })

  // T11: register data processing activity (RoPA)
  app.post('/data-processing', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { activityName, purpose, legalBasis = 'consent', dataCategories = [], retentionDays = 365, isHighRisk = false } = req.body as any
    const activity = await prisma.acDataProcessing.create({
      data: { tenantId: r.tenantId, activityName, purpose, legalBasis, dataCategories: dataCategories as never, retentionDays, isHighRisk, dpiaCompleted: false },
    })
    await trail(r.tenantId, 'data-processing.registered', r.userId, activityName, legalBasis)
    return activity
  })

  // T12: list data processing (RoPA)
  app.get('/data-processing', async (req) => {
    const r = req as unknown as { tenantId: string }
    const activities = await prisma.acDataProcessing.findMany({ where: { tenantId: r.tenantId }, orderBy: { createdAt: 'desc' } })
    return { activities, total: activities.length }
  })

  // T13: mark DPIA completed (high-risk activities require DPIA)
  app.post('/data-processing/:dpid/dpia', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { dpid } = req.params as any
    const updated = await prisma.acDataProcessing.update({ where: { id: dpid }, data: { dpiaCompleted: true } })
    await trail(r.tenantId, 'dpia.completed', r.userId, updated.activityName)
    return updated
  })

  // T14: DPIA gap report (high-risk without DPIA)
  app.get('/data-processing/dpia-gaps', async (req) => {
    const r = req as unknown as { tenantId: string }
    const gaps = await prisma.acDataProcessing.findMany({ where: { tenantId: r.tenantId, isHighRisk: true, dpiaCompleted: false } })
    return { gaps, total: gaps.length }
  })

  // T15: record consent
  app.post('/consents', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { subjectRef, purpose, expiresAt } = req.body as any
    const consent = await prisma.acConsent.create({
      data: { tenantId: r.tenantId, subjectRef, purpose, granted: true, expiresAt: expiresAt ? new Date(expiresAt) : null },
    })
    await trail(r.tenantId, 'consent.granted', subjectRef, undefined, purpose)
    return consent
  })

  // T16: revoke consent (right to withdraw)
  app.post('/consents/:cid/revoke', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { cid } = req.params as any
    const consent = await prisma.acConsent.update({ where: { id: cid }, data: { granted: false, revokedAt: new Date() } })
    await trail(r.tenantId, 'consent.revoked', consent.subjectRef, undefined, consent.purpose)
    return consent
  })

  // T17: check consent (enforcement point)
  app.get('/consents/check', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { subjectRef, purpose } = req.query as any
    const consent = await prisma.acConsent.findFirst({
      where: { tenantId: r.tenantId, subjectRef, purpose, granted: true },
      orderBy: { grantedAt: 'desc' },
    })
    if (!consent) return { hasConsent: false, reason: 'no active consent' }
    if (consent.expiresAt && consent.expiresAt < new Date()) return { hasConsent: false, reason: 'consent expired' }
    return { hasConsent: true, grantedAt: consent.grantedAt }
  })

  // T18: subject consents (for DSAR)
  app.get('/subjects/:subjectRef/consents', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { subjectRef } = req.params as any
    const consents = await prisma.acConsent.findMany({ where: { tenantId: r.tenantId, subjectRef }, orderBy: { createdAt: 'desc' } })
    return { subjectRef, consents, total: consents.length }
  })

  // T19: audit trail query
  app.get('/audit-trail', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { eventType } = req.query as any
    const where: any = { tenantId: r.tenantId }
    if (eventType) where.eventType = eventType
    const entries = await prisma.acAuditTrail.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 })
    return { entries, total: entries.length }
  })

  // T20: compliance dashboard
  app.get('/dashboard', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [regulations, requirements, assessments, dpiaGaps, activeConsents, highRiskProcessing] = await Promise.all([
      prisma.acRegulation.count({ where: { tenantId: r.tenantId } }),
      prisma.acRequirement.findMany({ where: { tenantId: r.tenantId } }),
      prisma.acAssessment.count({ where: { tenantId: r.tenantId } }),
      prisma.acDataProcessing.count({ where: { tenantId: r.tenantId, isHighRisk: true, dpiaCompleted: false } }),
      prisma.acConsent.count({ where: { tenantId: r.tenantId, granted: true } }),
      prisma.acDataProcessing.count({ where: { tenantId: r.tenantId, isHighRisk: true } }),
    ])
    const compliant = requirements.filter(q => q.complianceStatus === 'compliant').length
    const overallCompliance = requirements.length ? Number(((compliant / requirements.length) * 100).toFixed(1)) : 0
    return {
      regulations, totalRequirements: requirements.length, compliantRequirements: compliant,
      overallCompliancePct: overallCompliance, assessments, dpiaGaps, activeConsents, highRiskProcessing,
      complianceStatus: dpiaGaps > 0 || overallCompliance < 60 ? 'action-required' : 'on-track',
    }
  })

  // T21: stats
  app.get('/stats', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [regulations, requirements, assessments, processing, consents, audit] = await Promise.all([
      prisma.acRegulation.count({ where: { tenantId: r.tenantId } }),
      prisma.acRequirement.count({ where: { tenantId: r.tenantId } }),
      prisma.acAssessment.count({ where: { tenantId: r.tenantId } }),
      prisma.acDataProcessing.count({ where: { tenantId: r.tenantId } }),
      prisma.acConsent.count({ where: { tenantId: r.tenantId } }),
      prisma.acAuditTrail.count({ where: { tenantId: r.tenantId } }),
    ])
    return { regulations, requirements, assessments, dataProcessing: processing, consents, auditEntries: audit }
  })

  // T22: bulk-assess requirements
  app.post('/requirements/bulk-assess', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { requirementIds = [], complianceStatus } = req.body as any
    const result = await prisma.acRequirement.updateMany({ where: { id: { in: requirementIds }, tenantId: r.tenantId }, data: { complianceStatus } })
    return { updated: result.count }
  })

  // T23: consent expiry report
  app.get('/consents/expiring', async (req) => {
    const r = req as unknown as { tenantId: string }
    const soon = new Date(Date.now() + 30 * 86400000)
    const expiring = await prisma.acConsent.findMany({ where: { tenantId: r.tenantId, granted: true, expiresAt: { not: null, lte: soon } } })
    return { expiring, total: expiring.length }
  })

  // T24: delete requirement
  app.delete('/requirements/:qid', async (req) => {
    const { qid } = req.params as any
    await prisma.acRequirement.delete({ where: { id: qid } })
    return { success: true }
  })

  // T25: delete assessment
  app.delete('/assessments/:aid', async (req) => {
    const { aid } = req.params as any
    await prisma.acAssessment.delete({ where: { id: aid } })
    return { success: true }
  })

  // T26: delete data processing
  app.delete('/data-processing/:dpid', async (req) => {
    const { dpid } = req.params as any
    await prisma.acDataProcessing.delete({ where: { id: dpid } })
    return { success: true }
  })

  // T27: delete consent
  app.delete('/consents/:cid', async (req) => {
    const { cid } = req.params as any
    await prisma.acConsent.delete({ where: { id: cid } })
    return { success: true }
  })

  // T28: delete regulation
  app.delete('/regulations/:rid', async (req) => {
    const { rid } = req.params as any
    await prisma.acRegulation.delete({ where: { id: rid } })
    return { success: true }
  })
}
