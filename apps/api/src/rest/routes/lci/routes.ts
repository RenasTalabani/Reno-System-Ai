import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import { analyzeContract, analyzeClause, assessCompliance, generateLegalInsights } from './ai-engine.js'

export async function lciRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Dashboard ─────────────────────────────────────────────────────────────
  app.get('/dashboard', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const [contracts, compliance, insights] = await Promise.all([
      prisma.lciContract.findMany({ where: { tenantId }, orderBy: { aiRiskScore: 'desc' }, take: 20 }),
      prisma.lciComplianceItem.findMany({ where: { tenantId }, orderBy: { aiRiskScore: 'desc' }, take: 20 }),
      prisma.lciLegalInsight.findMany({ where: { tenantId }, orderBy: { generatedAt: 'desc' }, take: 5 }),
    ])
    const totalContracts = contracts.length
    const highRisk = contracts.filter(c => c.aiRiskLevel === 'high' || c.aiRiskLevel === 'critical').length
    const expiring = contracts.filter(c => c.endDate && (c.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24) < 90 && c.status === 'active').length
    const totalValue = contracts.reduce((s, c) => s + (c.value ?? 0), 0)
    const nonCompliant = compliance.filter(c => c.status === 'non_compliant').length
    return { kpis: { totalContracts, highRisk, expiring, totalValue: Math.round(totalValue), nonCompliant, complianceRate: compliance.length > 0 ? Math.round((1 - nonCompliant / compliance.length) * 100) : 100 }, topRiskContracts: contracts.slice(0, 5), insights }
  })

  // ── Contracts ─────────────────────────────────────────────────────────────
  app.get('/contracts', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    return prisma.lciContract.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } })
  })

  app.post('/contracts', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as any
    const analysis = analyzeContract({ contractType: body.contractType ?? 'other', status: body.status ?? 'draft', value: body.value, endDate: body.endDate ? new Date(body.endDate) : null, counterparty: body.counterparty })
    const contract = await prisma.lciContract.create({
      data: { tenantId, title: body.title, counterparty: body.counterparty, contractType: body.contractType ?? 'other', status: body.status ?? 'draft', value: body.value, startDate: body.startDate ? new Date(body.startDate) : undefined, endDate: body.endDate ? new Date(body.endDate) : undefined, aiRiskScore: analysis.aiRiskScore, aiRiskLevel: analysis.aiRiskLevel, aiSummary: analysis.aiSummary, keyObligations: analysis.keyObligations as never, redFlags: analysis.redFlags as never, metadata: (body.metadata ?? {}) as never },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'lci', entityType: 'LciContract', entityId: contract.id, newValues: contract as never } as never }).catch(() => null)
    return reply.code(201).send(contract)
  })

  app.get('/contracts/:id', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    return prisma.lciContract.findFirst({ where: { id, tenantId }, include: { clauses: true } })
  })

  app.patch('/contracts/:id', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = req.body as any
    const existing = await prisma.lciContract.findFirst({ where: { id, tenantId } })
    if (!existing) return { error: 'NOT_FOUND' }
    const analysis = analyzeContract({ contractType: body.contractType ?? existing.contractType, status: body.status ?? existing.status, value: body.value ?? existing.value, endDate: body.endDate ? new Date(body.endDate) : existing.endDate, counterparty: body.counterparty ?? existing.counterparty })
    const contract = await prisma.lciContract.update({ where: { id }, data: { ...body, aiRiskScore: analysis.aiRiskScore, aiRiskLevel: analysis.aiRiskLevel, aiSummary: analysis.aiSummary, keyObligations: analysis.keyObligations as never, redFlags: analysis.redFlags as never } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE', module: 'lci', entityType: 'LciContract', entityId: id, newValues: body as never } as never }).catch(() => null)
    return contract
  })

  app.delete('/contracts/:id', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    await prisma.lciContract.deleteMany({ where: { id, tenantId } })
    return reply.code(204).send()
  })

  // ── Clauses ───────────────────────────────────────────────────────────────
  app.get('/clauses', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    return prisma.lciClause.findMany({ where: { tenantId }, include: { contract: true }, orderBy: { createdAt: 'desc' } })
  })

  app.post('/clauses', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as any
    const analysis = analyzeClause({ clauseType: body.clauseType ?? 'other', title: body.title, content: body.content })
    const clause = await prisma.lciClause.create({
      data: { tenantId, contractId: body.contractId, clauseType: body.clauseType ?? 'other', title: body.title, content: body.content, aiRiskScore: analysis.aiRiskScore, aiRiskLevel: analysis.aiRiskLevel, flagged: analysis.flagged, aiAnnotation: analysis.aiAnnotation },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'lci', entityType: 'LciClause', entityId: clause.id, newValues: clause as never } as never }).catch(() => null)
    return reply.code(201).send(clause)
  })

  app.delete('/clauses/:id', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    await prisma.lciClause.deleteMany({ where: { id, tenantId } })
    return reply.code(204).send()
  })

  // ── Compliance ────────────────────────────────────────────────────────────
  app.get('/compliance', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    return prisma.lciComplianceItem.findMany({ where: { tenantId }, orderBy: { aiRiskScore: 'desc' } })
  })

  app.post('/compliance', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as any
    const assessment = assessCompliance({ framework: body.framework, requirement: body.requirement, status: body.status ?? 'pending', dueDate: body.dueDate ? new Date(body.dueDate) : null })
    const item = await prisma.lciComplianceItem.create({
      data: { tenantId, framework: body.framework, requirement: body.requirement, status: body.status ?? 'pending', dueDate: body.dueDate ? new Date(body.dueDate) : undefined, aiRiskScore: assessment.aiRiskScore, aiGuidance: assessment.aiGuidance, evidenceUrl: body.evidenceUrl },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'lci', entityType: 'LciComplianceItem', entityId: item.id, newValues: item as never } as never }).catch(() => null)
    return reply.code(201).send(item)
  })

  app.patch('/compliance/:id', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const body = req.body as any
    const existing = await prisma.lciComplianceItem.findFirst({ where: { id, tenantId } })
    if (!existing) return { error: 'NOT_FOUND' }
    const assessment = assessCompliance({ framework: body.framework ?? existing.framework, requirement: body.requirement ?? existing.requirement, status: body.status ?? existing.status, dueDate: body.dueDate ? new Date(body.dueDate) : existing.dueDate })
    return prisma.lciComplianceItem.update({ where: { id }, data: { ...body, aiRiskScore: assessment.aiRiskScore, aiGuidance: assessment.aiGuidance } })
  })

  // ── Insights ──────────────────────────────────────────────────────────────
  app.get('/insights', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    return prisma.lciLegalInsight.findMany({ where: { tenantId }, orderBy: { generatedAt: 'desc' } })
  })

  app.post('/insights/generate', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const [contracts, compliance] = await Promise.all([
      prisma.lciContract.findMany({ where: { tenantId } }),
      prisma.lciComplianceItem.findMany({ where: { tenantId } }),
    ])
    const insightData = generateLegalInsights(contracts as any[], compliance as any[])
    const created = await Promise.all(
      insightData.map(i => prisma.lciLegalInsight.create({
        data: { tenantId, type: i.type, title: i.title, summary: i.summary, severity: i.severity, actionItems: i.actionItems as never },
      }))
    )
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'AI_GENERATE', module: 'lci', entityType: 'LciLegalInsight', entityId: 'batch', newValues: { count: created.length } as never } as never }).catch(() => null)
    return reply.code(201).send(created)
  })
}
