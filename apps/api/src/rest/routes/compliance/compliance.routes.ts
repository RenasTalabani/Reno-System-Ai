import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

export async function complianceRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Frameworks ─────────────────────────────────────────────────────────────

  app.get('/frameworks', async (request, reply) => {
    const { tenantId } = request as any
    const frameworks = await prisma.cmpFramework.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, include: { _count: { select: { controls: true } } } })
    return reply.send(buildSuccessResponse(frameworks))
  })

  app.get('/frameworks/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const fw = await prisma.cmpFramework.findFirst({ where: { id, tenantId }, include: { controls: { orderBy: [{ category: 'asc' }, { code: 'asc' }], include: { _count: { select: { findings: true } } } } } })
    if (!fw) throw new RenoError(ErrorCode.NOT_FOUND, 'Framework not found', 404)
    const total = fw.controls.length
    const compliant = fw.controls.filter(c => c.status === 'compliant').length
    return reply.send(buildSuccessResponse({ ...fw, complianceRate: total > 0 ? Math.round((compliant / total) * 100) : 0 }))
  })

  app.post('/frameworks', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any
    const fw = await prisma.cmpFramework.create({ data: { tenantId, ownerId: userId, name: body.name, version: body.version, type: body.type ?? 'custom', description: body.description, dueDate: body.dueDate ? new Date(body.dueDate) : undefined } })
    return reply.status(201).send(buildSuccessResponse(fw))
  })

  // ── Controls ───────────────────────────────────────────────────────────────

  app.post('/frameworks/:id/controls', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const body = request.body as any
    const control = await prisma.cmpControl.create({ data: { tenantId, frameworkId: id, ownerId: userId, code: body.code, title: body.title, description: body.description, category: body.category, riskLevel: body.riskLevel ?? 'medium', dueDate: body.dueDate ? new Date(body.dueDate) : undefined } })
    return reply.status(201).send(buildSuccessResponse(control))
  })

  app.patch('/controls/:id/status', async (request, reply) => {
    const { id } = request.params as any
    const { status, evidence } = request.body as any
    const data: any = { status, lastReview: new Date() }
    if (evidence) data.evidence = evidence
    const control = await prisma.cmpControl.update({ where: { id }, data })
    return reply.send(buildSuccessResponse(control))
  })

  // ── Risks ──────────────────────────────────────────────────────────────────

  app.get('/risks', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const where: any = { tenantId }
    if (q.status) where.status = q.status
    const risks = await prisma.cmpRisk.findMany({ where, orderBy: [{ likelihood: 'desc' }, { impact: 'desc' }] })
    const withScore = risks.map(r => ({ ...r, riskScore: r.likelihood * r.impact }))
    return reply.send(buildSuccessResponse(withScore))
  })

  app.post('/risks', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any
    const risk = await prisma.cmpRisk.create({ data: { tenantId, ownerId: userId, title: body.title, description: body.description, category: body.category, likelihood: body.likelihood ?? 3, impact: body.impact ?? 3, mitigation: body.mitigation, reviewDate: body.reviewDate ? new Date(body.reviewDate) : undefined } })
    return reply.send(buildSuccessResponse({ ...risk, riskScore: risk.likelihood * risk.impact }))
  })

  app.put('/risks/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const body = request.body as any
    await prisma.cmpRisk.updateMany({ where: { id, tenantId }, data: { title: body.title, description: body.description, category: body.category, likelihood: body.likelihood, impact: body.impact, status: body.status, mitigation: body.mitigation } })
    return reply.send(buildSuccessResponse({ updated: true }))
  })

  // ── Audit Findings ─────────────────────────────────────────────────────────

  app.get('/findings', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const where: any = { tenantId }
    if (q.status) where.status = q.status
    if (q.severity) where.severity = q.severity
    const findings = await prisma.cmpFinding.findMany({ where, orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }] })
    return reply.send(buildSuccessResponse(findings))
  })

  app.post('/findings', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any
    const finding = await prisma.cmpFinding.create({ data: { tenantId, createdBy: userId, controlId: body.controlId, title: body.title, description: body.description, severity: body.severity ?? 'medium', remediation: body.remediation, dueDate: body.dueDate ? new Date(body.dueDate) : undefined } })
    return reply.status(201).send(buildSuccessResponse(finding))
  })

  app.patch('/findings/:id/close', async (request, reply) => {
    const { id } = request.params as any
    const { remediation } = request.body as any
    const finding = await prisma.cmpFinding.update({ where: { id }, data: { status: 'closed', closedAt: new Date(), remediation } })
    return reply.send(buildSuccessResponse(finding))
  })

  // ── Dashboard ──────────────────────────────────────────────────────────────

  app.get('/dashboard', async (request, reply) => {
    const { tenantId } = request as any
    const [frameworks, controls, openFindings, criticalRisks] = await Promise.all([
      prisma.cmpFramework.count({ where: { tenantId } }),
      prisma.cmpControl.groupBy({ by: ['status'], where: { tenantId }, _count: { status: true } }),
      prisma.cmpFinding.count({ where: { tenantId, status: 'open' } }),
      prisma.cmpRisk.count({ where: { tenantId, status: 'open', likelihood: { gte: 4 }, impact: { gte: 4 } } }),
    ])
    const totalControls = controls.reduce((s, c) => s + c._count.status, 0)
    const compliantControls = controls.find(c => c.status === 'compliant')?._count.status ?? 0
    return reply.send(buildSuccessResponse({
      frameworks,
      totalControls,
      complianceRate: totalControls > 0 ? Math.round((compliantControls / totalControls) * 100) : 0,
      openFindings,
      criticalRisks,
      controlsByStatus: Object.fromEntries(controls.map(c => [c.status, c._count.status])),
    }))
  })
}
