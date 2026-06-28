import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

// Module datasource map — which Prisma model each module queries
const MODULE_SOURCES: Record<string, (tenantId: string, config: any) => Promise<unknown[]>> = {
  hr_employees: (tid) => prisma.hrEmployee.findMany({ where: { tenantId: tid, deletedAt: null }, take: 5000 }),
  crm_contacts: (tid) => prisma.crmContact.findMany({ where: { tenantId: tid, deletedAt: null }, take: 5000 }),
  sales_invoices: (tid) => prisma.salesInvoice.findMany({ where: { tenantId: tid, deletedAt: null }, take: 5000 }),
  pm_projects: (tid) => prisma.pmProject.findMany({ where: { tenantId: tid, deletedAt: null }, take: 5000 }),
  helpdesk_tickets: (tid) => prisma.sdTicket.findMany({ where: { tenantId: tid, deletedAt: null }, take: 5000 }),
  audit_logs: (tid) => prisma.sysAuditLog.findMany({ where: { tenantId: tid }, orderBy: { createdAt: 'desc' }, take: 1000 }),
}

export async function reportsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // GET /v1/reports — list reports
  app.get('/', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const where: any = { tenantId, deletedAt: null }
    if (q.module) where.module = q.module
    const reports = await prisma.rptReport.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
      select: { id: true, name: true, description: true, module: true, chartType: true, isPublic: true, isPinned: true, createdAt: true, createdBy: true },
    })
    return reply.send(buildSuccessResponse(reports))
  })

  // GET /v1/reports/:id
  app.get('/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const report = await prisma.rptReport.findFirst({ where: { id, tenantId, deletedAt: null }, include: { schedules: true } })
    if (!report) throw new RenoError(ErrorCode.NOT_FOUND, 'Report not found', 404)
    return reply.send(buildSuccessResponse(report))
  })

  // POST /v1/reports
  app.post('/', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any
    const report = await prisma.rptReport.create({
      data: { tenantId, createdBy: userId, name: body.name, description: body.description, module: body.module, queryConfig: body.queryConfig ?? {}, columns: body.columns ?? [], filters: body.filters ?? [], sort: body.sort ?? [], groupBy: body.groupBy ?? [], chartType: body.chartType, chartConfig: body.chartConfig, isPublic: body.isPublic ?? false },
    })
    return reply.status(201).send(buildSuccessResponse(report))
  })

  // PUT /v1/reports/:id
  app.put('/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const body = request.body as any
    const existing = await prisma.rptReport.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!existing) throw new RenoError(ErrorCode.NOT_FOUND, 'Report not found', 404)
    const updated = await prisma.rptReport.update({ where: { id }, data: { ...body } })
    return reply.send(buildSuccessResponse(updated))
  })

  // DELETE /v1/reports/:id
  app.delete('/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    await prisma.rptReport.updateMany({ where: { id, tenantId }, data: { deletedAt: new Date() } })
    return reply.send(buildSuccessResponse({ deleted: true }))
  })

  // POST /v1/reports/:id/run — execute report and return data
  app.post('/:id/run', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const report = await prisma.rptReport.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!report) throw new RenoError(ErrorCode.NOT_FOUND, 'Report not found', 404)

    const source = MODULE_SOURCES[report.module]
    if (!source) throw new RenoError(ErrorCode.VALIDATION_ERROR, `Unknown module: ${report.module}`, 400)

    const rows = await source(tenantId, report.queryConfig)
    const columns = report.columns as string[]

    // Apply column projection if configured
    const data = columns.length > 0
      ? (rows as Record<string, unknown>[]).map(row => Object.fromEntries(columns.map(col => [col, row[col]])))
      : rows

    return reply.send(buildSuccessResponse(data, { total: (data as unknown[]).length, module: report.module }))
  })

  // POST /v1/reports/:id/export — trigger export job
  app.post('/:id/export', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const { format = 'csv' } = request.body as any ?? {}
    const report = await prisma.rptReport.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!report) throw new RenoError(ErrorCode.NOT_FOUND, 'Report not found', 404)

    const exportJob = await prisma.rptExport.create({
      data: { tenantId, reportId: id, format, requestedBy: userId, status: 'pending' },
    })

    // In production: queue to background job (BullMQ, SysJob)
    // Here we process inline for simplicity
    setImmediate(async () => {
      try {
        const source = MODULE_SOURCES[report.module]
        if (!source) return
        const rows = await source(tenantId, report.queryConfig)
        const rowCount = (rows as unknown[]).length
        // Generate CSV in memory (production: upload to S3)
        const cols = (report.columns as string[]).length > 0 ? report.columns as string[] : Object.keys((rows as Record<string, unknown>[])[0] ?? {})
        const csv = [cols.join(','), ...(rows as Record<string, unknown>[]).map(r => cols.map(c => JSON.stringify(r[c] ?? '')).join(','))].join('\n')
        const fileUrl = `data:text/csv;base64,${Buffer.from(csv).toString('base64').slice(0, 100)}…` // placeholder
        await prisma.rptExport.update({ where: { id: exportJob.id }, data: { status: 'completed', rowCount, fileUrl, completedAt: new Date() } })
      } catch (err: any) {
        await prisma.rptExport.update({ where: { id: exportJob.id }, data: { status: 'failed', error: err.message } })
      }
    })

    return reply.status(202).send(buildSuccessResponse({ exportId: exportJob.id, status: 'pending' }))
  })

  // GET /v1/reports/exports — list recent exports
  app.get('/exports', async (request, reply) => {
    const { tenantId } = request as any
    const exports = await prisma.rptExport.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { report: { select: { id: true, name: true } } },
    })
    return reply.send(buildSuccessResponse(exports))
  })

  // POST /v1/reports/:id/schedule
  app.post('/:id/schedule', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const body = request.body as any
    const schedule = await prisma.rptSchedule.create({
      data: { tenantId, reportId: id, name: body.name, cron: body.cron, format: body.format ?? 'csv', recipients: body.recipients ?? [], createdBy: userId },
    })
    return reply.status(201).send(buildSuccessResponse(schedule))
  })
}
