import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function biExportRoutes(app: FastifyInstance) {
  // POST /analytics/exports — create export job
  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any

    const report = await prisma.biReport.findFirst({ where: { id: body.reportId, tenantId, deletedAt: null } })
    if (!report) return reply.code(404).send({ success: false, error: 'Report not found' })

    const exportRecord = await prisma.biReportExport.create({
      data: {
        tenantId,
        reportId: body.reportId,
        scheduledId: body.scheduledId,
        format: body.format ?? 'csv',
        status: 'pending',
        requestedBy: userId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      },
    })

    // Simulate export processing (in production, this would be a background job)
    const data = await runExport(tenantId, report, body.format ?? 'csv')

    await prisma.biReportExport.update({
      where: { id: exportRecord.id },
      data: {
        status: 'completed',
        rowCount: data.rowCount,
        fileSizeBytes: data.sizeBytes,
        completedAt: new Date(),
      },
    })

    return reply.code(201).send({
      success: true,
      data: {
        ...exportRecord,
        status: 'completed',
        rowCount: data.rowCount,
        csvData: body.format === 'csv' ? data.content : undefined,
      },
    })
  })

  // GET /analytics/exports — list exports
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { reportId, page = '1', limit = '20' } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = { tenantId }
    if (reportId) where.reportId = reportId

    const [items, total] = await Promise.all([
      prisma.biReportExport.findMany({
        where,
        include: { report: { select: { name: true, module: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.biReportExport.count({ where }),
    ])

    return reply.send({ success: true, data: items, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  // GET /analytics/exports/:id/download — download exported data
  app.get('/:id/download', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any

    const exportRecord = await prisma.biReportExport.findFirst({
      where: { id, tenantId },
      include: { report: true },
    })

    if (!exportRecord) return reply.code(404).send({ success: false, error: 'Export not found' })
    if (exportRecord.status !== 'completed') return reply.code(400).send({ success: false, error: 'Export not ready' })

    // Re-run the export to generate fresh data
    const data = await runExport(tenantId, exportRecord.report, exportRecord.format)

    if (exportRecord.format === 'csv') {
      reply.header('Content-Type', 'text/csv')
      reply.header('Content-Disposition', `attachment; filename="${exportRecord.report.name.replace(/[^a-z0-9]/gi, '_')}.csv"`)
      return reply.send(data.content)
    }

    return reply.send({ success: true, data: { content: data.content, rowCount: data.rowCount } })
  })
}

async function runExport(tenantId: string, report: any, format: string) {
  // Dynamic data fetcher based on module + entity
  const rows = await fetchReportData(tenantId, report)

  const columns: any[] = Array.isArray(report.columns) ? report.columns : []
  const headers = columns.map((c: any) => c.label ?? c.field)
  const fields = columns.map((c: any) => c.field)

  let content = ''
  if (format === 'csv') {
    const lines = [headers.join(',')]
    for (const row of rows) {
      lines.push(fields.map((f: string) => {
        const val = row[f] ?? ''
        const str = String(val).replace(/"/g, '""')
        return str.includes(',') || str.includes('"') ? `"${str}"` : str
      }).join(','))
    }
    content = lines.join('\n')
  } else {
    content = JSON.stringify(rows, null, 2)
  }

  return { rowCount: rows.length, sizeBytes: Buffer.byteLength(content, 'utf8'), content }
}

async function fetchReportData(tenantId: string, report: any): Promise<any[]> {
  const { module, entity } = report
  const filters = report.filters ?? {}

  if (module === 'sales' && entity === 'orders') {
    return prisma.salesOrder.findMany({
      where: { tenantId, deletedAt: null },
      select: { number: true, status: true, total: true, createdAt: true },
      take: 1000,
    })
  }
  if (module === 'finance' && entity === 'invoices') {
    return prisma.salesInvoice.findMany({
      where: { tenantId, deletedAt: null },
      select: { number: true, status: true, total: true, dueDate: true, createdAt: true },
      take: 1000,
    })
  }
  if (module === 'hr' && entity === 'employees') {
    return prisma.hrEmployee.findMany({
      where: { tenantId, deletedAt: null },
      select: { employeeCode: true, firstName: true, lastName: true, status: true, hireDate: true },
      take: 1000,
    })
  }
  if (module === 'inventory' && entity === 'stock') {
    return prisma.invStockBalance.findMany({
      where: { tenantId },
      select: { onHand: true, reserved: true, available: true, totalValue: true },
      take: 1000,
    })
  }
  if (module === 'procurement' && entity === 'orders') {
    return prisma.procOrder.findMany({
      where: { tenantId, deletedAt: null },
      select: { number: true, status: true, totalAmount: true, expectedDate: true },
      take: 1000,
    })
  }
  if (module === 'manufacturing' && entity === 'orders') {
    return prisma.mfgOrder.findMany({
      where: { tenantId, deletedAt: null },
      select: { number: true, status: true, plannedQty: true, producedQty: true, scheduledStart: true },
      take: 1000,
    })
  }

  return []
}
