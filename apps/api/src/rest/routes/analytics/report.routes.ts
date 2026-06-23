import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function biReportRoutes(app: FastifyInstance) {
  // GET /analytics/reports
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { module, page = '1', limit = '20' } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = { tenantId, deletedAt: null }
    if (module) where.module = module

    const [items, total] = await Promise.all([
      prisma.biReport.findMany({
        where,
        include: { _count: { select: { scheduledReports: true, exports: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.biReport.count({ where }),
    ])

    return reply.send({ success: true, data: items, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  // POST /analytics/reports
  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any

    const report = await prisma.biReport.create({
      data: {
        tenantId,
        name: body.name,
        description: body.description,
        module: body.module,
        entity: body.entity,
        columns: body.columns,
        filters: body.filters,
        groupBy: body.groupBy,
        sortBy: body.sortBy,
        chartType: body.chartType,
        chartConfig: body.chartConfig,
        isPublic: body.isPublic ?? false,
        createdBy: userId,
        updatedBy: userId,
      },
    })

    return reply.code(201).send({ success: true, data: report })
  })

  // GET /analytics/reports/:id
  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any

    const report = await prisma.biReport.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        scheduledReports: { where: { isActive: true } },
        exports: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    })

    if (!report) return reply.code(404).send({ success: false, error: 'Report not found' })
    return reply.send({ success: true, data: report })
  })

  // PATCH /analytics/reports/:id
  app.patch('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any

    const existing = await prisma.biReport.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Report not found' })

    const report = await prisma.biReport.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        description: body.description !== undefined ? body.description : existing.description,
        columns: body.columns ?? existing.columns,
        filters: body.filters !== undefined ? body.filters : existing.filters,
        groupBy: body.groupBy !== undefined ? body.groupBy : existing.groupBy,
        sortBy: body.sortBy !== undefined ? body.sortBy : existing.sortBy,
        chartType: body.chartType !== undefined ? body.chartType : existing.chartType,
        chartConfig: body.chartConfig !== undefined ? body.chartConfig : existing.chartConfig,
        isPublic: body.isPublic !== undefined ? body.isPublic : existing.isPublic,
        updatedBy: userId,
      },
    })

    return reply.send({ success: true, data: report })
  })

  // DELETE /analytics/reports/:id
  app.delete('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any

    const existing = await prisma.biReport.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Report not found' })

    await prisma.biReport.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } })
    return reply.send({ success: true })
  })

  // POST /analytics/reports/:id/schedule
  app.post('/:id/schedule', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any

    const report = await prisma.biReport.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!report) return reply.code(404).send({ success: false, error: 'Report not found' })

    const scheduled = await prisma.biScheduledReport.create({
      data: {
        tenantId,
        reportId: id,
        name: body.name,
        cronExpr: body.cronExpr,
        format: body.format ?? 'pdf',
        recipients: body.recipients,
        subject: body.subject,
        message: body.message,
        createdBy: userId,
      },
    })

    return reply.code(201).send({ success: true, data: scheduled })
  })

  // GET /analytics/reports/:id/schedule
  app.get('/:id/schedule', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any

    const items = await prisma.biScheduledReport.findMany({
      where: { reportId: id, tenantId },
      orderBy: { createdAt: 'desc' },
    })

    return reply.send({ success: true, data: items })
  })

  // PATCH /analytics/reports/:id/schedule/:schedId
  app.patch('/:id/schedule/:schedId', async (req, reply) => {
    const { tenantId } = req as any
    const { id, schedId } = req.params as any
    const body = req.body as any

    const sched = await prisma.biScheduledReport.findFirst({ where: { id: schedId, reportId: id, tenantId } })
    if (!sched) return reply.code(404).send({ success: false, error: 'Schedule not found' })

    const updated = await prisma.biScheduledReport.update({
      where: { id: schedId },
      data: {
        name: body.name ?? sched.name,
        cronExpr: body.cronExpr ?? sched.cronExpr,
        format: body.format ?? sched.format,
        recipients: body.recipients ?? sched.recipients,
        subject: body.subject !== undefined ? body.subject : sched.subject,
        message: body.message !== undefined ? body.message : sched.message,
        isActive: body.isActive !== undefined ? body.isActive : sched.isActive,
      },
    })

    return reply.send({ success: true, data: updated })
  })
}
