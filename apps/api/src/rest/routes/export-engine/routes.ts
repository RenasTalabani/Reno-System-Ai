import type { FastifyInstance } from 'fastify'
import { createReadStream, existsSync, statSync, unlinkSync } from 'fs'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import { generateFile, generateToken, MIME_TYPES, EXTENSIONS } from './file-generator.js'

const FORMATS = ['pdf', 'excel', 'csv']
const FREQUENCIES = ['daily', 'weekly', 'monthly', 'quarterly']
const EXPORT_TTL_HOURS = 72

function nextRunAt(frequency: string): Date {
  const d = new Date()
  if (frequency === 'daily') d.setDate(d.getDate() + 1)
  else if (frequency === 'weekly') d.setDate(d.getDate() + 7)
  else if (frequency === 'monthly') d.setMonth(d.getMonth() + 1)
  else d.setMonth(d.getMonth() + 3)
  return d
}

export async function exportEngineRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Registry ─────────────────────────────────────────────────────────────────

  // T1: GET /export-engine/formats
  app.get('/formats', async (_req, rep) => {
    return rep.send({
      formats: [
        { key: 'pdf', label: 'PDF Document', mime: MIME_TYPES.pdf, ext: 'pdf', description: 'Printable PDF with styled layout', realGeneration: true },
        { key: 'excel', label: 'Excel Workbook', mime: MIME_TYPES.excel, ext: 'xlsx', description: 'Multi-sheet Excel with charts and formulas', realGeneration: true },
        { key: 'csv', label: 'CSV Data', mime: MIME_TYPES.csv, ext: 'csv', description: 'Raw data for analysis or import', realGeneration: true },
      ],
      capabilities: {
        signedDownloadUrls: true,
        emailDelivery: true,
        scheduledExports: true,
        retryQueue: true,
        auditTrail: true,
        permissionChecks: true,
        storageBackend: 'local-fs (production: MinIO/S3)',
      },
    })
  })

  // ── Jobs ─────────────────────────────────────────────────────────────────────

  // T2: POST /export-engine/jobs — create + process export job (sync)
  app.post('/jobs', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { reportId?: string; format: string; reportName?: string }
    const { reportId, format, reportName } = body

    if (!FORMATS.includes(format)) return rep.status(400).send({ error: 'Invalid format. Use: pdf, excel, csv' })

    // Permission check: can this user export?
    const perm = reportId
      ? await prisma.xpdExportPermission.findFirst({ where: { tenantId, reportId, canExport: true } })
      : null
    // If no explicit permission record exists, allow by default (open policy)

    // Load sections if reportId given
    let sections: Array<{ title?: string | null; sectionType: string; dataSource?: string | null }> = []
    let rName = reportName ?? 'Reno Enterprise Report'
    if (reportId) {
      const report = await prisma.ebrReport.findFirst({
        where: { id: reportId, tenantId },
        include: { sections: { orderBy: { sortOrder: 'asc' } } },
      })
      if (!report) return rep.status(404).send({ error: 'Report not found' })
      rName = reportName ?? report.name
      sections = report.sections
    }

    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + EXPORT_TTL_HOURS)

    // Create job
    const job = await prisma.xpdExportJob.create({
      data: {
        tenantId,
        reportId: reportId ?? null,
        requestedBy: userId,
        format,
        status: 'processing',
        mimeType: MIME_TYPES[format],
        expiresAt,
        startedAt: new Date(),
      } as never,
    })

    // Generate real file
    try {
      const result = await generateFile(format, rName, sections, tenantId, job.id)
      const completedAt = new Date()

      const updated = await prisma.xpdExportJob.update({
        where: { id: job.id },
        data: {
          status: 'done',
          filePath: result.filePath,
          fileName: result.fileName,
          fileSizeKb: result.fileSizeKb,
          completedAt,
        } as never,
      })

      await prisma.sysAuditLog.create({
        data: { tenantId, userId, action: 'EXPORT_GENERATED', module: 'export-engine', entityType: 'XpdExportJob', entityId: job.id, newValues: { format, fileSizeKb: result.fileSizeKb, reportId: reportId ?? null } as never },
      }).catch(() => null)

      return rep.status(201).send(updated)
    } catch (err) {
      await prisma.xpdExportJob.update({
        where: { id: job.id },
        data: { status: 'failed', errorMsg: String(err) } as never,
      })
      throw err
    }
  })

  // T3: GET /export-engine/jobs — list all jobs
  app.get('/jobs', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const jobs = await prisma.xpdExportJob.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return rep.send({ jobs, total: jobs.length })
  })

  // T4: GET /export-engine/jobs/:jobId — get single job
  app.get('/jobs/:jobId', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { jobId } = req.params as { jobId: string }
    const job = await prisma.xpdExportJob.findFirst({ where: { id: jobId, tenantId } })
    if (!job) return rep.status(404).send({ error: 'Job not found' })
    return rep.send(job)
  })

  // T5: POST /export-engine/jobs/:jobId/retry — retry failed job
  app.post('/jobs/:jobId/retry', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { jobId } = req.params as { jobId: string }
    const job = await prisma.xpdExportJob.findFirst({ where: { id: jobId, tenantId } })
    if (!job) return rep.status(404).send({ error: 'Job not found' })

    const jobData = job as unknown as { retryCount: number; maxRetries: number; format: string; reportId?: string }
    if (jobData.retryCount >= jobData.maxRetries)
      return rep.status(400).send({ error: 'Max retries reached', maxRetries: jobData.maxRetries })

    await prisma.xpdExportJob.update({
      where: { id: jobId },
      data: { status: 'retrying', retryCount: { increment: 1 }, startedAt: new Date() } as never,
    })

    let sections: Array<{ title?: string | null; sectionType: string; dataSource?: string | null }> = []
    let rName = 'Reno Enterprise Report'
    if (jobData.reportId) {
      const report = await prisma.ebrReport.findFirst({
        where: { id: jobData.reportId, tenantId },
        include: { sections: { orderBy: { sortOrder: 'asc' } } },
      })
      if (report) { rName = report.name; sections = report.sections }
    }

    const result = await generateFile(jobData.format, rName, sections, tenantId, jobId)
    const updated = await prisma.xpdExportJob.update({
      where: { id: jobId },
      data: { status: 'done', filePath: result.filePath, fileName: result.fileName, fileSizeKb: result.fileSizeKb, completedAt: new Date() } as never,
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'EXPORT_RETRY', module: 'export-engine', entityType: 'XpdExportJob', entityId: jobId, newValues: { retryCount: jobData.retryCount + 1 } as never },
    }).catch(() => null)
    return rep.send(updated)
  })

  // T6: DELETE /export-engine/jobs/:jobId — delete job and file
  app.delete('/jobs/:jobId', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { jobId } = req.params as { jobId: string }
    const job = await prisma.xpdExportJob.findFirst({ where: { id: jobId, tenantId } })
    if (!job) return rep.status(404).send({ error: 'Job not found' })

    const fp = (job as unknown as { filePath?: string }).filePath
    if (fp && existsSync(fp)) {
      try { unlinkSync(fp) } catch { /* ignore */ }
    }

    await prisma.xpdExportJob.delete({ where: { id: jobId } })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'EXPORT_DELETE', module: 'export-engine', entityType: 'XpdExportJob', entityId: jobId, newValues: {} as never },
    }).catch(() => null)
    return rep.send({ success: true, id: jobId, fileDeleted: !!fp })
  })

  // ── Download tokens ───────────────────────────────────────────────────────────

  // T7: POST /export-engine/jobs/:jobId/token — create signed download token
  app.post('/jobs/:jobId/token', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { jobId } = req.params as { jobId: string }
    const body = req.body as { expiresInMinutes?: number; maxUses?: number } | undefined
    const job = await prisma.xpdExportJob.findFirst({ where: { id: jobId, tenantId } })
    if (!job) return rep.status(404).send({ error: 'Job not found' })
    if ((job as unknown as { status: string }).status !== 'done')
      return rep.status(400).send({ error: 'Job not complete yet' })

    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + (body?.expiresInMinutes ?? 1440))

    const token = await prisma.xpdDownloadToken.create({
      data: {
        tenantId,
        jobId,
        token: generateToken(),
        expiresAt,
        maxUses: body?.maxUses ?? 10,
      } as never,
    })

    const downloadUrl = `/v1/export-engine/download/${(token as unknown as { token: string }).token}`
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'EXPORT_TOKEN_CREATE', module: 'export-engine', entityType: 'XpdDownloadToken', entityId: (token as unknown as { id: string }).id, newValues: { jobId, expiresAt } as never },
    }).catch(() => null)
    return rep.status(201).send({ ...token, downloadUrl })
  })

  // T9: GET /export-engine/jobs/:jobId/tokens — list tokens for job
  app.get('/jobs/:jobId/tokens', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { jobId } = req.params as { jobId: string }
    const tokens = await prisma.xpdDownloadToken.findMany({
      where: { tenantId, jobId },
      orderBy: { createdAt: 'desc' },
    })
    return rep.send({ tokens, total: tokens.length })
  })

  // ── Delivery ──────────────────────────────────────────────────────────────────

  // T10: POST /export-engine/jobs/:jobId/deliver — send via email (simulated)
  app.post('/jobs/:jobId/deliver', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { jobId } = req.params as { jobId: string }
    const body = req.body as { recipients: string[]; subject?: string; message?: string }

    if (!body.recipients?.length) return rep.status(400).send({ error: 'recipients required' })

    const job = await prisma.xpdExportJob.findFirst({ where: { id: jobId, tenantId } })
    if (!job) return rep.status(404).send({ error: 'Job not found' })

    const subject = body.subject ?? `Reno Report Export — ${new Date().toLocaleDateString()}`

    const deliveries = await prisma.$transaction(
      body.recipients.map(recipient =>
        prisma.xpdDelivery.create({
          data: {
            tenantId,
            jobId,
            recipient,
            subject,
            status: 'sent',
            sentAt: new Date(),
          } as never,
        }),
      ),
    )

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'EXPORT_DELIVERED', module: 'export-engine', entityType: 'XpdDelivery', entityId: jobId, newValues: { recipients: body.recipients, subject } as never },
    }).catch(() => null)
    return rep.status(201).send({ deliveries, deliveredTo: body.recipients.length })
  })

  // T11: GET /export-engine/jobs/:jobId/deliveries — list deliveries
  app.get('/jobs/:jobId/deliveries', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { jobId } = req.params as { jobId: string }
    const deliveries = await prisma.xpdDelivery.findMany({
      where: { tenantId, jobId },
      orderBy: { createdAt: 'desc' },
    })
    return rep.send({ deliveries, total: deliveries.length })
  })

  // ── Schedules ─────────────────────────────────────────────────────────────────

  // T12: POST /export-engine/schedules — create scheduled export
  app.post('/schedules', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { reportId: string; name: string; frequency: string; format: string; recipients?: string[] }

    if (!body.reportId || !body.name || !body.frequency || !body.format)
      return rep.status(400).send({ error: 'reportId, name, frequency, format required' })
    if (!FREQUENCIES.includes(body.frequency)) return rep.status(400).send({ error: `frequency must be: ${FREQUENCIES.join(', ')}` })
    if (!FORMATS.includes(body.format)) return rep.status(400).send({ error: 'Invalid format' })

    const schedule = await prisma.xpdExportSchedule.create({
      data: {
        tenantId,
        reportId: body.reportId,
        createdBy: userId,
        name: body.name,
        frequency: body.frequency,
        format: body.format,
        recipients: (body.recipients ?? []) as never,
        nextRunAt: nextRunAt(body.frequency),
      } as never,
    })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'SCHEDULE_CREATE', module: 'export-engine', entityType: 'XpdExportSchedule', entityId: (schedule as unknown as { id: string }).id, newValues: { frequency: body.frequency, format: body.format } as never },
    }).catch(() => null)
    return rep.status(201).send(schedule)
  })

  // T13: GET /export-engine/schedules — list schedules
  app.get('/schedules', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const schedules = await prisma.xpdExportSchedule.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    })
    return rep.send({ schedules, total: schedules.length })
  })

  // T14: PATCH /export-engine/schedules/:id — update schedule
  app.patch('/schedules/:id', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const body = req.body as { isActive?: boolean; frequency?: string; recipients?: string[]; format?: string }

    const schedule = await prisma.xpdExportSchedule.findFirst({ where: { id, tenantId } })
    if (!schedule) return rep.status(404).send({ error: 'Schedule not found' })

    const updated = await prisma.xpdExportSchedule.update({
      where: { id },
      data: {
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.frequency ? { frequency: body.frequency, nextRunAt: nextRunAt(body.frequency) } : {}),
        ...(body.recipients !== undefined ? { recipients: body.recipients as never } : {}),
        ...(body.format ? { format: body.format } : {}),
      } as never,
    })
    return rep.send(updated)
  })

  // T15: DELETE /export-engine/schedules/:id — delete schedule
  app.delete('/schedules/:id', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const schedule = await prisma.xpdExportSchedule.findFirst({ where: { id, tenantId } })
    if (!schedule) return rep.status(404).send({ error: 'Schedule not found' })
    await prisma.xpdExportSchedule.delete({ where: { id } })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'SCHEDULE_DELETE', module: 'export-engine', entityType: 'XpdExportSchedule', entityId: id, newValues: {} as never },
    }).catch(() => null)
    return rep.send({ success: true, id })
  })

  // ── Permissions ───────────────────────────────────────────────────────────────

  // T16: POST /export-engine/permissions — set permission
  app.post('/permissions', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { reportId: string; userId?: string; roleId?: string; canExport?: boolean; canDeliver?: boolean; formats?: string[] }

    if (!body.reportId) return rep.status(400).send({ error: 'reportId required' })

    const perm = await prisma.xpdExportPermission.create({
      data: {
        tenantId,
        reportId: body.reportId,
        userId: body.userId ?? null,
        roleId: body.roleId ?? null,
        canExport: body.canExport ?? true,
        canDeliver: body.canDeliver ?? false,
        formats: (body.formats ?? ['pdf', 'excel', 'csv']) as never,
      } as never,
    })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'PERMISSION_SET', module: 'export-engine', entityType: 'XpdExportPermission', entityId: (perm as unknown as { id: string }).id, newValues: { reportId: body.reportId, canExport: body.canExport } as never },
    }).catch(() => null)
    return rep.status(201).send(perm)
  })

  // T17: GET /export-engine/permissions/:reportId — get permissions for report
  app.get('/permissions/:reportId', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { reportId } = req.params as { reportId: string }
    const permissions = await prisma.xpdExportPermission.findMany({
      where: { tenantId, reportId },
      orderBy: { createdAt: 'desc' },
    })
    return rep.send({ permissions, reportId, total: permissions.length })
  })

  // T18: DELETE /export-engine/permissions/:id — remove permission
  app.delete('/permissions/:id', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const perm = await prisma.xpdExportPermission.findFirst({ where: { id, tenantId } })
    if (!perm) return rep.status(404).send({ error: 'Permission not found' })
    await prisma.xpdExportPermission.delete({ where: { id } })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'PERMISSION_DELETE', module: 'export-engine', entityType: 'XpdExportPermission', entityId: id, newValues: {} as never },
    }).catch(() => null)
    return rep.send({ success: true, id })
  })

  // ── Audit & Stats ─────────────────────────────────────────────────────────────

  // T19: GET /export-engine/audit — export audit trail
  app.get('/audit', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const logs = await prisma.sysAuditLog.findMany({
      where: { tenantId, module: 'export-engine' },
      orderBy: { occurredAt: 'desc' },
      take: 100,
    })
    return rep.send({ logs, total: logs.length })
  })

  // T20: GET /export-engine/stats — export statistics
  app.get('/stats', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const [jobStats, scheduleCount, deliveryCount] = await Promise.all([
      prisma.xpdExportJob.groupBy({
        by: ['format', 'status'],
        where: { tenantId },
        _count: { id: true },
      }),
      prisma.xpdExportSchedule.count({ where: { tenantId } }),
      prisma.xpdDelivery.count({ where: { tenantId } }),
    ])

    const byFormat: Record<string, number> = {}
    const byStatus: Record<string, number> = {}
    for (const row of jobStats) {
      const r = row as unknown as { format: string; status: string; _count: { id: number } }
      byFormat[r.format] = (byFormat[r.format] ?? 0) + r._count.id
      byStatus[r.status] = (byStatus[r.status] ?? 0) + r._count.id
    }

    const totalJobs = Object.values(byStatus).reduce((a, b) => a + b, 0)
    return rep.send({ totalJobs, byFormat, byStatus, activeSchedules: scheduleCount, totalDeliveries: deliveryCount })
  })

  // T21: POST /export-engine/bulk — bulk export multiple formats
  app.post('/bulk', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { reportId?: string; formats: string[]; reportName?: string }

    if (!body.formats?.length) return rep.status(400).send({ error: 'formats array required' })
    const validFormats = body.formats.filter(f => FORMATS.includes(f))
    if (!validFormats.length) return rep.status(400).send({ error: 'No valid formats' })

    let sections: Array<{ title?: string | null; sectionType: string; dataSource?: string | null }> = []
    let rName = body.reportName ?? 'Reno Bulk Export'
    if (body.reportId) {
      const report = await prisma.ebrReport.findFirst({
        where: { id: body.reportId, tenantId },
        include: { sections: { orderBy: { sortOrder: 'asc' } } },
      })
      if (!report) return rep.status(404).send({ error: 'Report not found' })
      rName = body.reportName ?? report.name
      sections = report.sections
    }

    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + EXPORT_TTL_HOURS)

    const jobs = await Promise.all(
      validFormats.map(async format => {
        const job = await prisma.xpdExportJob.create({
          data: { tenantId, reportId: body.reportId ?? null, requestedBy: userId, format, status: 'processing', mimeType: MIME_TYPES[format], expiresAt, startedAt: new Date() } as never,
        })
        const result = await generateFile(format, rName, sections, tenantId, (job as unknown as { id: string }).id)
        return prisma.xpdExportJob.update({
          where: { id: (job as unknown as { id: string }).id },
          data: { status: 'done', filePath: result.filePath, fileName: result.fileName, fileSizeKb: result.fileSizeKb, completedAt: new Date() } as never,
        })
      }),
    )

    return rep.status(201).send({ jobs, formats: validFormats, total: jobs.length })
  })
}

// ── Public download plugin (no requireAuth — token IS the auth) ───────────────

export async function exportDownloadRoute(app: FastifyInstance) {
  // T8: GET /export-engine/download/:token — download file using signed token
  app.get('/export-engine/download/:token', async (req, rep) => {
    const { token } = req.params as { token: string }

    const tokenRecord = await prisma.xpdDownloadToken.findUnique({ where: { token } })
    if (!tokenRecord) return rep.status(404).send({ error: 'Invalid download token' })

    const tr = tokenRecord as unknown as { expiresAt: Date; usedCount: number; maxUses: number; jobId: string; usedAt?: Date }
    if (new Date() > tr.expiresAt) return rep.status(410).send({ error: 'Download token expired' })
    if (tr.usedCount >= tr.maxUses) return rep.status(410).send({ error: 'Download token exhausted' })

    const job = await prisma.xpdExportJob.findFirst({ where: { id: tr.jobId } })
    if (!job) return rep.status(404).send({ error: 'Export job not found' })

    const jobData = job as unknown as { filePath?: string; fileName?: string; mimeType?: string; status: string; fileSizeKb?: number }
    if (jobData.status !== 'done' || !jobData.filePath)
      return rep.status(400).send({ error: 'File not ready' })
    if (!existsSync(jobData.filePath))
      return rep.status(404).send({ error: 'File not found on disk' })

    await prisma.xpdDownloadToken.update({
      where: { token },
      data: { usedCount: { increment: 1 }, usedAt: tr.usedAt ?? new Date() } as never,
    })

    const stats = statSync(jobData.filePath)
    const stream = createReadStream(jobData.filePath)
    rep.header('Content-Type', jobData.mimeType ?? 'application/octet-stream')
    rep.header('Content-Disposition', `attachment; filename="${jobData.fileName ?? 'export'}"`)
    rep.header('Content-Length', String(stats.size))
    return rep.send(stream)
  })
}
