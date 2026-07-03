import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function complianceAutoRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // T1: registry
  app.get('/registry', async () => ({
    frameworks: ['SOC2', 'ISO27001', 'GDPR', 'HIPAA', 'PCI-DSS', 'NIST-CSF'],
    controlCategories: ['technical', 'administrative', 'physical', 'organizational'],
    controlStatuses: ['not-implemented', 'partial', 'implemented', 'not-applicable'],
    findingSeverities: ['low', 'medium', 'high', 'critical'],
    evidenceTypes: ['document', 'screenshot', 'log-export', 'config-dump', 'attestation'],
    taskTypes: ['remediation', 'evidence-collection', 'review', 'audit-prep'],
  }))

  // T2: create framework
  app.post('/frameworks', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { name, code, version = '1.0', description, metadata } = req.body as any
    const fw = await prisma.caFramework.create({
      data: { tenantId: r.tenantId, name, code, version, description, status: 'active', metadata: metadata as never },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'CREATE', module: 'compliance-auto', entityType: 'CaFramework', entityId: fw.id, newValues: { name, code } as never } as never }).catch(() => null)
    return fw
  })

  // T3: seed SOC2 framework with controls
  app.post('/frameworks/seed-soc2', async (req) => {
    const r = req as unknown as { tenantId: string }
    const code = `SOC2-${Date.now()}`
    const fw = await prisma.caFramework.create({
      data: { tenantId: r.tenantId, name: 'SOC 2 Type II', code, version: '2017', description: 'AICPA Trust Services Criteria', status: 'active' },
    })
    const controls = [
      { code: 'CC1.1', title: 'Control environment — integrity and ethical values', category: 'organizational' },
      { code: 'CC2.1', title: 'Information and communication', category: 'administrative' },
      { code: 'CC5.1', title: 'Logical access controls', category: 'technical', automated: true },
      { code: 'CC6.1', title: 'Encryption of data at rest and in transit', category: 'technical', automated: true },
      { code: 'CC7.2', title: 'Security incident monitoring', category: 'technical', automated: true },
      { code: 'A1.2', title: 'Availability — capacity monitoring', category: 'technical', automated: true },
    ]
    for (const c of controls) {
      await prisma.caControl.create({ data: { tenantId: r.tenantId, frameworkId: fw.id, ...c, status: 'not-implemented' } })
    }
    return { framework: fw, controlsCreated: controls.length }
  })

  // T4: list frameworks
  app.get('/frameworks', async (req) => {
    const r = req as unknown as { tenantId: string }
    const frameworks = await prisma.caFramework.findMany({ where: { tenantId: r.tenantId }, include: { _count: { select: { controls: true, assessments: true } } } })
    return { frameworks, total: frameworks.length }
  })

  // T5: create control
  app.post('/frameworks/:fid/controls', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { fid } = req.params as any
    const { code, title, description, category = 'technical', automated = false, metadata } = req.body as any
    return prisma.caControl.create({
      data: { tenantId: r.tenantId, frameworkId: fid, code, title, description, category, automated, status: 'not-implemented', metadata: metadata as never },
    })
  })

  // T6: list controls
  app.get('/frameworks/:fid/controls', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { fid } = req.params as any
    const controls = await prisma.caControl.findMany({ where: { frameworkId: fid, tenantId: r.tenantId }, orderBy: { code: 'asc' }, include: { _count: { select: { evidences: true, findings: true } } } })
    return { controls, total: controls.length }
  })

  // T7: update control status
  app.patch('/controls/:cid', async (req) => {
    const { cid } = req.params as any
    const data = req.body as any
    return prisma.caControl.update({ where: { id: cid }, data: { ...data, metadata: data.metadata as never } })
  })

  // T8: attach evidence
  app.post('/controls/:cid/evidence', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { cid } = req.params as any
    const { title, evidenceType = 'document', content, validUntil, metadata } = req.body as any
    return prisma.caEvidence.create({
      data: { tenantId: r.tenantId, controlId: cid, title, evidenceType, content, collectedBy: r.userId, validUntil: validUntil ? new Date(validUntil) : null, metadata: metadata as never },
    })
  })

  // T9: list evidence
  app.get('/controls/:cid/evidence', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { cid } = req.params as any
    const evidences = await prisma.caEvidence.findMany({ where: { controlId: cid, tenantId: r.tenantId }, orderBy: { createdAt: 'desc' } })
    return { evidences, total: evidences.length }
  })

  // T10: create finding
  app.post('/controls/:cid/findings', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { cid } = req.params as any
    const { severity = 'medium', title, description, remediation, dueDate, metadata } = req.body as any
    return prisma.caFinding.create({
      data: { tenantId: r.tenantId, controlId: cid, severity, title, description, remediation, status: 'open', dueDate: dueDate ? new Date(dueDate) : null, metadata: metadata as never },
    })
  })

  // T11: list findings
  app.get('/findings', async (req) => {
    const r = req as unknown as { tenantId: string }
    const status = (req.query as any).status
    const where: any = { tenantId: r.tenantId }
    if (status) where.status = status
    const findings = await prisma.caFinding.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100, include: { control: { select: { code: true, title: true } } } })
    return { findings, total: findings.length }
  })

  // T12: resolve finding
  app.post('/findings/:fnid/resolve', async (req) => {
    const { fnid } = req.params as any
    return prisma.caFinding.update({ where: { id: fnid }, data: { status: 'resolved', resolvedAt: new Date() } })
  })

  // T13: run automated checks (simulation — evaluates automated controls)
  app.post('/frameworks/:fid/run-checks', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { fid } = req.params as any
    const controls = await prisma.caControl.findMany({ where: { frameworkId: fid, tenantId: r.tenantId, automated: true } })
    const results = []
    for (const c of controls) {
      const passed = Math.random() > 0.3
      await prisma.caControl.update({ where: { id: c.id }, data: { status: passed ? 'implemented' : 'partial' } })
      if (!passed) {
        await prisma.caFinding.create({
          data: { tenantId: r.tenantId, controlId: c.id, severity: 'medium', title: `Automated check failed: ${c.code}`, description: `Control ${c.title} did not fully pass automated verification`, status: 'open', remediation: 'Review control implementation and re-run checks' },
        })
      }
      results.push({ controlId: c.id, code: c.code, passed })
    }
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'RUN_CHECKS', module: 'compliance-auto', entityType: 'CaFramework', entityId: fid, newValues: { checked: results.length } as never } as never }).catch(() => null)
    return { checked: results.length, results }
  })

  // T14: run assessment (scores whole framework)
  app.post('/frameworks/:fid/assess', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { fid } = req.params as any
    const { name } = req.body as any
    const controls = await prisma.caControl.findMany({ where: { frameworkId: fid, tenantId: r.tenantId } })
    const applicable = controls.filter(c => c.status !== 'not-applicable')
    const passed = applicable.filter(c => c.status === 'implemented').length
    const score = applicable.length ? Number(((passed / applicable.length) * 100).toFixed(1)) : 0
    return prisma.caAssessment.create({
      data: { tenantId: r.tenantId, frameworkId: fid, name: name ?? `Assessment ${new Date().toISOString().slice(0, 10)}`, status: 'completed', score, totalControls: applicable.length, passedControls: passed, completedAt: new Date() },
    })
  })

  // T15: list assessments
  app.get('/frameworks/:fid/assessments', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { fid } = req.params as any
    const assessments = await prisma.caAssessment.findMany({ where: { frameworkId: fid, tenantId: r.tenantId }, orderBy: { createdAt: 'desc' } })
    return { assessments, total: assessments.length }
  })

  // T16: create task
  app.post('/tasks', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { title, taskType = 'remediation', assignee, priority = 'medium', dueDate, metadata } = req.body as any
    return prisma.caTask.create({
      data: { tenantId: r.tenantId, title, taskType, assignee, priority, status: 'todo', dueDate: dueDate ? new Date(dueDate) : null, metadata: metadata as never },
    })
  })

  // T17: list tasks
  app.get('/tasks', async (req) => {
    const r = req as unknown as { tenantId: string }
    const tasks = await prisma.caTask.findMany({ where: { tenantId: r.tenantId }, orderBy: { createdAt: 'desc' }, take: 100 })
    return { tasks, total: tasks.length }
  })

  // T18: update task
  app.patch('/tasks/:tid', async (req) => {
    const { tid } = req.params as any
    const data = req.body as any
    if (data.status === 'done') data.completedAt = new Date()
    return prisma.caTask.update({ where: { id: tid }, data: { ...data, dueDate: data.dueDate ? new Date(data.dueDate) : undefined, metadata: data.metadata as never } })
  })

  // T19: compliance posture overview
  app.get('/overview', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [frameworks, controls, findings, tasks] = await Promise.all([
      prisma.caFramework.count({ where: { tenantId: r.tenantId } }),
      prisma.caControl.findMany({ where: { tenantId: r.tenantId } }),
      prisma.caFinding.count({ where: { tenantId: r.tenantId, status: 'open' } }),
      prisma.caTask.count({ where: { tenantId: r.tenantId, status: { not: 'done' } } }),
    ])
    const implemented = controls.filter(c => c.status === 'implemented').length
    const readiness = controls.length ? Number(((implemented / controls.length) * 100).toFixed(1)) : 0
    return { frameworks, totalControls: controls.length, implementedControls: implemented, readinessPct: readiness, openFindings: findings, openTasks: tasks }
  })

  // T20: gap analysis
  app.get('/frameworks/:fid/gaps', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { fid } = req.params as any
    const controls = await prisma.caControl.findMany({ where: { frameworkId: fid, tenantId: r.tenantId, status: { in: ['not-implemented', 'partial'] } }, orderBy: { code: 'asc' } })
    return { gaps: controls.map(c => ({ id: c.id, code: c.code, title: c.title, status: c.status, category: c.category })), total: controls.length }
  })

  // T21: evidence expiry report
  app.get('/evidence/expiring', async (req) => {
    const r = req as unknown as { tenantId: string }
    const soon = new Date(Date.now() + 30 * 86400000)
    const expiring = await prisma.caEvidence.findMany({
      where: { tenantId: r.tenantId, validUntil: { not: null, lte: soon } },
      include: { control: { select: { code: true } } },
    })
    return { expiring, total: expiring.length }
  })

  // T22: stats
  app.get('/stats', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [frameworks, controls, assessments, evidences, findings, tasks] = await Promise.all([
      prisma.caFramework.count({ where: { tenantId: r.tenantId } }),
      prisma.caControl.count({ where: { tenantId: r.tenantId } }),
      prisma.caAssessment.count({ where: { tenantId: r.tenantId } }),
      prisma.caEvidence.count({ where: { tenantId: r.tenantId } }),
      prisma.caFinding.count({ where: { tenantId: r.tenantId } }),
      prisma.caTask.count({ where: { tenantId: r.tenantId } }),
    ])
    return { frameworks, controls, assessments, evidences, findings, tasks }
  })

  // T23: get framework
  app.get('/frameworks/:fid', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { fid } = req.params as any
    return prisma.caFramework.findFirstOrThrow({ where: { id: fid, tenantId: r.tenantId }, include: { _count: { select: { controls: true, assessments: true } } } })
  })

  // T24: bulk update control statuses
  app.post('/controls/bulk-status', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { controlIds = [], status } = req.body as any
    const result = await prisma.caControl.updateMany({ where: { id: { in: controlIds }, tenantId: r.tenantId }, data: { status } })
    return { updated: result.count }
  })

  // T25: delete evidence
  app.delete('/evidence/:eid', async (req) => {
    const { eid } = req.params as any
    await prisma.caEvidence.delete({ where: { id: eid } })
    return { success: true }
  })

  // T26: delete task
  app.delete('/tasks/:tid', async (req) => {
    const { tid } = req.params as any
    await prisma.caTask.delete({ where: { id: tid } })
    return { success: true }
  })

  // T27: delete control
  app.delete('/controls/:cid', async (req) => {
    const { cid } = req.params as any
    await prisma.caControl.delete({ where: { id: cid } })
    return { success: true }
  })

  // T28: delete framework
  app.delete('/frameworks/:fid', async (req) => {
    const { fid } = req.params as any
    await prisma.caFramework.delete({ where: { id: fid } })
    return { success: true }
  })
}
