import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import {
  BUILT_IN_DATA_SOURCES,
  BUILT_IN_REPORT_TEMPLATES,
  simulateSectionData,
  generateAiNarrative,
  simulateExport,
} from './report-engine.js'

async function seedTemplates(tenantId: string) {
  const count = await prisma.ebrTemplate.count({ where: { tenantId, isBuiltIn: true } })
  if (count === 0) {
    await prisma.ebrTemplate.createMany({
      data: BUILT_IN_REPORT_TEMPLATES.map(t => ({
        ...t,
        tenantId,
        sections: t.sections as never,
        config: {} as never,
      })),
    })
  }
}

async function touchMetrics(reportId: string) {
  const m = await prisma.ebrMetrics.upsert({
    where: { reportId },
    create: { reportId, viewCount: 1 },
    update: { viewCount: { increment: 1 } },
  })
  return m
}

export async function reportRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Static routes (must come before /:id) ──────────────────────────────────

  // T1: GET /registry
  app.get('/registry', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    await prisma.sysAuditLog.create({
      data: { tenantId, userId: (req as unknown as { userId: string }).userId, action: 'READ', module: 'reports', entityType: 'registry', entityId: 'registry', newValues: {} as never },
    }).catch(() => null)
    return rep.send({ dataSources: BUILT_IN_DATA_SOURCES })
  })

  // T2: GET /templates
  app.get('/templates', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    await seedTemplates(tenantId)
    const templates = await prisma.ebrTemplate.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } })
    return rep.send({ templates })
  })

  // T23: POST /from-template/:tid
  app.post('/from-template/:tid', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { tid } = req.params as { tid: string }
    const { name } = (req.body ?? {}) as { name?: string }
    await seedTemplates(tenantId)
    const tmpl = await prisma.ebrTemplate.findFirst({ where: { id: tid, tenantId } })
    if (!tmpl) return rep.status(404).send({ error: 'Template not found' })
    const sectionDefs = (tmpl.sections as Array<Record<string, unknown>>) ?? []
    const report = await prisma.ebrReport.create({
      data: {
        tenantId,
        ownerId: userId,
        name: name ?? tmpl.name,
        description: tmpl.description,
        reportType: tmpl.category,
        status: 'draft',
        sections: {
          create: sectionDefs.map((s, i) => ({
            sectionType: (s['sectionType'] as string) ?? 'kpi',
            title: s['title'] as string | undefined,
            dataSource: s['dataSource'] as string | undefined,
            sortOrder: (s['sortOrder'] as number) ?? i,
            config: (s['config'] ?? {}) as never,
          })),
        },
      },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
    })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'CREATE', module: 'reports', entityType: 'EbrReport', entityId: report.id, newValues: { fromTemplate: tid } as never },
    }).catch(() => null)
    return rep.status(201).send(report)
  })

  // ── Dashboard CRUD ──────────────────────────────────────────────────────────

  // T4: GET / list
  app.get('/', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const [mine, shared] = await Promise.all([
      prisma.ebrReport.findMany({
        where: { tenantId, ownerId: userId },
        include: { _count: { select: { sections: true } }, metrics: true },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.ebrReport.findMany({
        where: { tenantId, isPublic: true, NOT: { ownerId: userId } },
        include: { _count: { select: { sections: true } }, metrics: true },
        orderBy: { updatedAt: 'desc' },
      }),
    ])
    return rep.send({ mine, shared })
  })

  // T3: POST / create
  app.post('/', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = (req.body ?? {}) as { name?: string; description?: string; reportType?: string; isPublic?: boolean; config?: Record<string, unknown> }
    if (!body.name) return rep.status(400).send({ error: 'name is required' })
    const report = await prisma.ebrReport.create({
      data: {
        tenantId,
        ownerId: userId,
        name: body.name,
        description: body.description,
        reportType: body.reportType ?? 'custom',
        isPublic: body.isPublic ?? false,
        config: (body.config ?? {}) as never,
      },
    })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'CREATE', module: 'reports', entityType: 'EbrReport', entityId: report.id, newValues: body as never },
    }).catch(() => null)
    return rep.status(201).send(report)
  })

  // T5: GET /:id
  app.get('/:id', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const report = await prisma.ebrReport.findFirst({
      where: { id, tenantId },
      include: { sections: { orderBy: { sortOrder: 'asc' } }, metrics: true, schedule: true, subscriptions: true },
    })
    if (!report) return rep.status(404).send({ error: 'Report not found' })
    await touchMetrics(id)
    return rep.send(report)
  })

  // T6: PATCH /:id
  app.patch('/:id', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = (req.body ?? {}) as Record<string, unknown>
    const report = await prisma.ebrReport.findFirst({ where: { id, tenantId } })
    if (!report) return rep.status(404).send({ error: 'Report not found' })
    const updated = await prisma.ebrReport.update({
      where: { id },
      data: {
        ...(body['name'] !== undefined && { name: body['name'] as string }),
        ...(body['description'] !== undefined && { description: body['description'] as string }),
        ...(body['status'] !== undefined && { status: body['status'] as string }),
        ...(body['isPublic'] !== undefined && { isPublic: body['isPublic'] as boolean }),
        ...(body['config'] !== undefined && { config: body['config'] as never }),
      },
    })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'UPDATE', module: 'reports', entityType: 'EbrReport', entityId: id, newValues: body as never },
    }).catch(() => null)
    return rep.send(updated)
  })

  // T25: DELETE /:id
  app.delete('/:id', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const report = await prisma.ebrReport.findFirst({ where: { id, tenantId } })
    if (!report) return rep.status(404).send({ error: 'Report not found' })
    await prisma.ebrReport.delete({ where: { id } })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'DELETE', module: 'reports', entityType: 'EbrReport', entityId: id, newValues: {} as never },
    }).catch(() => null)
    return rep.send({ success: true, id })
  })

  // ── Sections ────────────────────────────────────────────────────────────────

  // T11: GET /:id/sections
  app.get('/:id/sections', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const report = await prisma.ebrReport.findFirst({ where: { id, tenantId } })
    if (!report) return rep.status(404).send({ error: 'Report not found' })
    const sections = await prisma.ebrSection.findMany({ where: { reportId: id }, orderBy: { sortOrder: 'asc' } })
    return rep.send({ sections })
  })

  // T7: POST /:id/sections
  app.post('/:id/sections', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = (req.body ?? {}) as { sectionType?: string; title?: string; dataSource?: string; sortOrder?: number; config?: Record<string, unknown> }
    const report = await prisma.ebrReport.findFirst({ where: { id, tenantId } })
    if (!report) return rep.status(404).send({ error: 'Report not found' })
    if (!body.sectionType) return rep.status(400).send({ error: 'sectionType is required' })
    const section = await prisma.ebrSection.create({
      data: {
        reportId: id,
        sectionType: body.sectionType,
        title: body.title,
        dataSource: body.dataSource,
        sortOrder: body.sortOrder ?? 0,
        config: (body.config ?? {}) as never,
      },
    })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'CREATE', module: 'reports', entityType: 'EbrSection', entityId: section.id, newValues: body as never },
    }).catch(() => null)
    return rep.status(201).send(section)
  })

  // T10: PATCH /:id/sections/:sid
  app.patch('/:id/sections/:sid', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id, sid } = req.params as { id: string; sid: string }
    const body = (req.body ?? {}) as Record<string, unknown>
    const report = await prisma.ebrReport.findFirst({ where: { id, tenantId } })
    if (!report) return rep.status(404).send({ error: 'Report not found' })
    const section = await prisma.ebrSection.findFirst({ where: { id: sid, reportId: id } })
    if (!section) return rep.status(404).send({ error: 'Section not found' })
    const updated = await prisma.ebrSection.update({
      where: { id: sid },
      data: {
        ...(body['title'] !== undefined && { title: body['title'] as string }),
        ...(body['sectionType'] !== undefined && { sectionType: body['sectionType'] as string }),
        ...(body['dataSource'] !== undefined && { dataSource: body['dataSource'] as string }),
        ...(body['sortOrder'] !== undefined && { sortOrder: body['sortOrder'] as number }),
        ...(body['config'] !== undefined && { config: body['config'] as never }),
      },
    })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'UPDATE', module: 'reports', entityType: 'EbrSection', entityId: sid, newValues: body as never },
    }).catch(() => null)
    return rep.send(updated)
  })

  // T24: DELETE /:id/sections/:sid
  app.delete('/:id/sections/:sid', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id, sid } = req.params as { id: string; sid: string }
    const report = await prisma.ebrReport.findFirst({ where: { id, tenantId } })
    if (!report) return rep.status(404).send({ error: 'Report not found' })
    const section = await prisma.ebrSection.findFirst({ where: { id: sid, reportId: id } })
    if (!section) return rep.status(404).send({ error: 'Section not found' })
    await prisma.ebrSection.delete({ where: { id: sid } })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'DELETE', module: 'reports', entityType: 'EbrSection', entityId: sid, newValues: {} as never },
    }).catch(() => null)
    return rep.send({ success: true, id: sid })
  })

  // ── Run & Preview ────────────────────────────────────────────────────────────

  // T12: POST /:id/run
  app.post('/:id/run', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const report = await prisma.ebrReport.findFirst({ where: { id, tenantId }, include: { sections: true } })
    if (!report) return rep.status(404).send({ error: 'Report not found' })
    const startMs = Date.now()
    const updatedSections = await Promise.all(
      report.sections.map(async s => {
        const data = simulateSectionData(s.sectionType, s.dataSource ?? 'finance', s.config as Record<string, unknown>)
        return prisma.ebrSection.update({ where: { id: s.id }, data: { cachedData: data as never } })
      }),
    )
    const runMs = Date.now() - startMs
    const now = new Date()
    await prisma.ebrReport.update({ where: { id }, data: { lastRunAt: now } })
    await prisma.ebrMetrics.upsert({
      where: { reportId: id },
      create: { reportId: id, runCount: 1, avgRunMs: runMs, lastRunAt: now },
      update: { runCount: { increment: 1 }, avgRunMs: runMs, lastRunAt: now },
    })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'RUN', module: 'reports', entityType: 'EbrReport', entityId: id, newValues: { runMs } as never },
    }).catch(() => null)
    return rep.send({ success: true, sectionsPopulated: updatedSections.length, runMs })
  })

  // T13: GET /:id/preview
  app.get('/:id/preview', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const report = await prisma.ebrReport.findFirst({
      where: { id, tenantId },
      include: { sections: { orderBy: { sortOrder: 'asc' }, take: 3 } },
    })
    if (!report) return rep.status(404).send({ error: 'Report not found' })
    const preview = report.sections.map(s => ({
      ...s,
      previewData: simulateSectionData(s.sectionType, s.dataSource ?? 'finance', s.config as Record<string, unknown>),
    }))
    return rep.send({ reportName: report.name, sectionPreviews: preview })
  })

  // ── Export ──────────────────────────────────────────────────────────────────

  // T15: POST /:id/export
  app.post('/:id/export', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const { format = 'pdf' } = (req.body ?? {}) as { format?: string }
    const report = await prisma.ebrReport.findFirst({ where: { id, tenantId } })
    if (!report) return rep.status(404).send({ error: 'Report not found' })
    const sim = simulateExport(format, report.name)
    const job = await prisma.ebrExportJob.create({
      data: {
        tenantId,
        reportId: id,
        requestedBy: userId,
        format,
        status: sim.status,
        fileSizeKb: sim.fileSizeKb,
        exportedAt: new Date(),
      },
    })
    await prisma.ebrMetrics.upsert({
      where: { reportId: id },
      create: { reportId: id, totalExports: 1 },
      update: { totalExports: { increment: 1 } },
    })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'EXPORT', module: 'reports', entityType: 'EbrReport', entityId: id, newValues: { format } as never },
    }).catch(() => null)
    return rep.status(201).send({ ...job, simulatedUrl: sim.simulatedUrl, processingMs: sim.processingMs })
  })

  // T16: GET /:id/exports
  app.get('/:id/exports', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const report = await prisma.ebrReport.findFirst({ where: { id, tenantId } })
    if (!report) return rep.status(404).send({ error: 'Report not found' })
    const exports = await prisma.ebrExportJob.findMany({ where: { reportId: id }, orderBy: { createdAt: 'desc' } })
    return rep.send({ exports })
  })

  // ── Schedule ─────────────────────────────────────────────────────────────────

  // T18: GET /:id/schedule
  app.get('/:id/schedule', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const report = await prisma.ebrReport.findFirst({ where: { id, tenantId } })
    if (!report) return rep.status(404).send({ error: 'Report not found' })
    const schedule = await prisma.ebrSchedule.findFirst({ where: { reportId: id } })
    return rep.send({ schedule: schedule ?? null })
  })

  // T17: PUT /:id/schedule
  app.put('/:id/schedule', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = (req.body ?? {}) as { frequency?: string; cronExpr?: string; recipients?: string[]; outputFormat?: string; isActive?: boolean }
    const report = await prisma.ebrReport.findFirst({ where: { id, tenantId } })
    if (!report) return rep.status(404).send({ error: 'Report not found' })
    const nextRunAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const schedule = await prisma.ebrSchedule.upsert({
      where: { reportId: id },
      create: {
        tenantId,
        reportId: id,
        frequency: body.frequency ?? 'weekly',
        cronExpr: body.cronExpr,
        recipients: (body.recipients ?? []) as never,
        outputFormat: body.outputFormat ?? 'pdf',
        isActive: body.isActive ?? true,
        nextRunAt,
      },
      update: {
        ...(body.frequency && { frequency: body.frequency }),
        ...(body.cronExpr !== undefined && { cronExpr: body.cronExpr }),
        ...(body.recipients && { recipients: body.recipients as never }),
        ...(body.outputFormat && { outputFormat: body.outputFormat }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        nextRunAt,
      },
    })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'UPSERT', module: 'reports', entityType: 'EbrSchedule', entityId: schedule.id, newValues: body as never },
    }).catch(() => null)
    return rep.send(schedule)
  })

  // T19: DELETE /:id/schedule
  app.delete('/:id/schedule', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const schedule = await prisma.ebrSchedule.findFirst({ where: { reportId: id } })
    if (!schedule) return rep.status(404).send({ error: 'Schedule not found' })
    await prisma.ebrSchedule.delete({ where: { id: schedule.id } })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'DELETE', module: 'reports', entityType: 'EbrSchedule', entityId: schedule.id, newValues: {} as never },
    }).catch(() => null)
    return rep.send({ success: true, id: schedule.id })
  })

  // ── Subscriptions ─────────────────────────────────────────────────────────────

  // T20: POST /:id/subscribe
  app.post('/:id/subscribe', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const { frequency = 'weekly' } = (req.body ?? {}) as { frequency?: string }
    const report = await prisma.ebrReport.findFirst({ where: { id, tenantId } })
    if (!report) return rep.status(404).send({ error: 'Report not found' })
    const sub = await prisma.ebrSubscription.upsert({
      where: { reportId_userId: { reportId: id, userId } },
      create: { tenantId, reportId: id, userId, frequency, isActive: true },
      update: { frequency, isActive: true },
    })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'SUBSCRIBE', module: 'reports', entityType: 'EbrSubscription', entityId: sub.id, newValues: { frequency } as never },
    }).catch(() => null)
    return rep.status(201).send(sub)
  })

  // T21: DELETE /:id/subscribe
  app.delete('/:id/subscribe', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const sub = await prisma.ebrSubscription.findFirst({ where: { reportId: id, userId } })
    if (!sub) return rep.status(404).send({ error: 'Subscription not found' })
    await prisma.ebrSubscription.delete({ where: { id: sub.id } })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'UNSUBSCRIBE', module: 'reports', entityType: 'EbrSubscription', entityId: sub.id, newValues: {} as never },
    }).catch(() => null)
    return rep.send({ success: true, id: sub.id })
  })

  // ── AI Narrative ──────────────────────────────────────────────────────────────

  // T24: POST /:id/ai-narrative
  app.post('/:id/ai-narrative', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const report = await prisma.ebrReport.findFirst({ where: { id, tenantId }, include: { sections: true } })
    if (!report) return rep.status(404).send({ error: 'Report not found' })
    const result = generateAiNarrative(report.name, report.sections)
    const narrative = await prisma.ebrAiNarrative.create({
      data: {
        tenantId,
        reportId: id,
        narrative: result.narrative,
        keyInsights: result.keyInsights as never,
        confidence: result.confidence,
        generatedAt: new Date(),
      } as never,
    })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'AI_GENERATE', module: 'reports', entityType: 'EbrAiNarrative', entityId: (narrative as unknown as { id: string }).id, newValues: { confidence: result.confidence } as never },
    }).catch(() => null)
    return rep.status(201).send(narrative)
  })

  // ── Metrics ────────────────────────────────────────────────────────────────────

  // T14: GET /:id/metrics
  app.get('/:id/metrics', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const report = await prisma.ebrReport.findFirst({ where: { id, tenantId } })
    if (!report) return rep.status(404).send({ error: 'Report not found' })
    const metrics = await prisma.ebrMetrics.findFirst({ where: { reportId: id } })
    return rep.send({ metrics: metrics ?? { reportId: id, runCount: 0, avgRunMs: 0, totalExports: 0, viewCount: 0, lastRunAt: null } })
  })
}
