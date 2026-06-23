import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function finFiscalYearRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const years = await prisma.finFiscalYear.findMany({
      where: { tenantId, deletedAt: null },
      include: { _count: { select: { periods: true } } },
      orderBy: { startDate: 'desc' },
    })
    return reply.send({ success: true, data: years })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any

    // Auto-generate 12 monthly periods
    const year = await prisma.finFiscalYear.create({
      data: {
        tenantId, name: body.name, code: body.code,
        startDate: new Date(body.startDate), endDate: new Date(body.endDate),
        status: 'draft', isDefault: body.isDefault ?? false,
        createdBy: userId, updatedBy: userId,
      },
    })

    // Generate monthly periods
    const start = new Date(body.startDate)
    for (let i = 0; i < 12; i++) {
      const pStart = new Date(start.getFullYear(), start.getMonth() + i, 1)
      const pEnd = new Date(start.getFullYear(), start.getMonth() + i + 1, 0)
      const monthName = pStart.toLocaleString('en', { month: 'long', year: 'numeric' })
      await prisma.finPeriod.create({
        data: {
          tenantId, fiscalYearId: year.id, name: monthName,
          periodNumber: i + 1,
          startDate: pStart, endDate: pEnd,
          status: 'open', createdBy: userId, updatedBy: userId,
        },
      })
    }

    await logAudit(tenantId, userId, 'FISCAL_YEAR_CREATED', 'fin_fiscal_years', year.id, { name: year.name })
    const full = await prisma.finFiscalYear.findUnique({ where: { id: year.id }, include: { periods: { orderBy: { periodNumber: 'asc' } } } })
    return reply.code(201).send({ success: true, data: full })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const year = await prisma.finFiscalYear.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { periods: { where: { deletedAt: null }, orderBy: { periodNumber: 'asc' } } },
    })
    if (!year) return reply.code(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: year })
  })

  app.patch('/:id/close', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    await prisma.finFiscalYear.updateMany({ where: { id, tenantId }, data: { status: 'closed', lockedAt: new Date(), lockedBy: userId, updatedBy: userId } })
    await prisma.finPeriod.updateMany({ where: { fiscalYearId: id, tenantId, status: 'open' }, data: { status: 'locked', closedAt: new Date(), closedBy: userId, updatedBy: userId } })
    await logAudit(tenantId, userId, 'FISCAL_YEAR_CLOSED', 'fin_fiscal_years', id, {})
    return reply.send({ success: true })
  })

  // Close a single period
  app.patch('/periods/:periodId/close', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { periodId } = req.params as any
    await prisma.finPeriod.updateMany({ where: { id: periodId, tenantId }, data: { status: 'closed', closedAt: new Date(), closedBy: userId, updatedBy: userId } })
    return reply.send({ success: true })
  })

  app.get('/periods', async (req, reply) => {
    const { tenantId } = req as any
    const { fiscalYearId, status } = req.query as any
    const where: any = { tenantId, deletedAt: null }
    if (fiscalYearId) where.fiscalYearId = fiscalYearId
    if (status) where.status = status
    const periods = await prisma.finPeriod.findMany({ where, orderBy: [{ fiscalYearId: 'asc' }, { periodNumber: 'asc' }] })
    return reply.send({ success: true, data: periods })
  })
}

async function logAudit(tenantId: string, userId: string, action: string, entityType: string, entityId: string, meta: any) {
  await prisma.sysAuditLog.create({ data: { tenantId, userId, action, module: 'finance', entityType, entityId, newValues: meta } }).catch(() => {})
}
