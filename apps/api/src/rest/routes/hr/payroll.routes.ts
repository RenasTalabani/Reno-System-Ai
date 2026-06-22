import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

export async function hrPayrollRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // -------------------------------------------------------------------------
  // Payslips
  // -------------------------------------------------------------------------

  // GET /hr/payroll/payslips
  app.get('/payslips', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const page = Math.max(1, parseInt(q.page ?? '1'))
    const limit = Math.min(100, parseInt(q.limit ?? '20'))

    const where: any = { tenantId, deletedAt: null }
    if (q.employeeId) where.employeeId = q.employeeId
    if (q.status) where.status = q.status
    if (q.month) where.month = parseInt(q.month)
    if (q.year) where.year = parseInt(q.year)

    const [total, payslips] = await Promise.all([
      prisma.hrPayslip.count({ where }),
      prisma.hrPayslip.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, avatarUrl: true } },
          grade: { select: { id: true, name: true } },
        },
      }),
    ])

    return reply.send(buildSuccessResponse(payslips, {
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }))
  })

  // GET /hr/payroll/payslips/:id
  app.get('/payslips/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any

    const payslip = await prisma.hrPayslip.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        employee: true,
        grade: true,
      },
    })

    if (!payslip) throw new RenoError(ErrorCode.NOT_FOUND, 'Payslip not found', 404)
    return reply.send(buildSuccessResponse(payslip))
  })

  // POST /hr/payroll/payslips — generate payslip (draft)
  app.post('/payslips', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any

    // Check for existing payslip for same employee + month + year
    const existing = await prisma.hrPayslip.findFirst({
      where: { tenantId, employeeId: body.employeeId, month: body.month, year: body.year, deletedAt: null },
    })
    if (existing) throw new RenoError(ErrorCode.CONFLICT, 'Payslip already exists for this employee and period', 409)

    const payslip = await prisma.hrPayslip.create({
      data: {
        tenantId, employeeId: body.employeeId, gradeId: body.gradeId,
        month: body.month, year: body.year,
        basicSalary: body.basicSalary, allowances: body.allowances ?? {},
        deductions: body.deductions ?? {}, grossSalary: body.grossSalary,
        netSalary: body.netSalary, currency: body.currency ?? 'USD',
        workingDays: body.workingDays, presentDays: body.presentDays,
        overtimeHours: body.overtimeHours ?? 0, overtimePay: body.overtimePay ?? 0,
        taxAmount: body.taxAmount ?? 0, socialInsurance: body.socialInsurance ?? 0,
        notes: body.notes, status: 'draft', createdBy: userId,
      },
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'CREATE_PAYSLIP', module: 'hr', entityType: 'hr_payslips', entityId: payslip.id, newValues: { employeeId: body.employeeId, month: body.month, year: body.year, netSalary: body.netSalary }, ipAddress: request.ip },
    })

    return reply.status(201).send(buildSuccessResponse(payslip))
  })

  // PATCH /hr/payroll/payslips/:id/process — mark as processed
  app.patch('/payslips/:id/process', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any

    const payslip = await prisma.hrPayslip.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!payslip) throw new RenoError(ErrorCode.NOT_FOUND, 'Payslip not found', 404)
    if (payslip.status !== 'draft') throw new RenoError(ErrorCode.VALIDATION_ERROR, 'Only draft payslips can be processed', 400)

    const updated = await prisma.hrPayslip.update({
      where: { id },
      data: { status: 'processed', processedAt: new Date(), processedBy: userId, updatedBy: userId },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // PATCH /hr/payroll/payslips/:id/pay — mark as paid
  app.patch('/payslips/:id/pay', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const { paidAt, paymentMethod, paymentReference } = request.body as any ?? {}

    const payslip = await prisma.hrPayslip.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!payslip) throw new RenoError(ErrorCode.NOT_FOUND, 'Payslip not found', 404)
    if (payslip.status !== 'processed') throw new RenoError(ErrorCode.VALIDATION_ERROR, 'Only processed payslips can be marked paid', 400)

    const updated = await prisma.hrPayslip.update({
      where: { id },
      data: {
        status: 'paid',
        paidAt: paidAt ? new Date(paidAt) : new Date(),
        paymentMethod, paymentReference,
        updatedBy: userId,
      },
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'MARK_PAYSLIP_PAID', module: 'hr', entityType: 'hr_payslips', entityId: id, newValues: { paidAt: updated.paidAt, paymentMethod }, ipAddress: request.ip },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // PATCH /hr/payroll/payslips/:id/cancel
  app.patch('/payslips/:id/cancel', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any

    const payslip = await prisma.hrPayslip.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!payslip) throw new RenoError(ErrorCode.NOT_FOUND, 'Payslip not found', 404)
    if (payslip.status === 'paid') throw new RenoError(ErrorCode.VALIDATION_ERROR, 'Paid payslips cannot be cancelled', 400)

    const updated = await prisma.hrPayslip.update({
      where: { id },
      data: { status: 'cancelled', updatedBy: userId },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // -------------------------------------------------------------------------
  // Payroll summary
  // -------------------------------------------------------------------------

  // GET /hr/payroll/summary?month=&year=
  app.get('/summary', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const year = parseInt(q.year ?? String(new Date().getFullYear()))
    const month = parseInt(q.month ?? String(new Date().getMonth() + 1))

    const payslips = await prisma.hrPayslip.findMany({
      where: { tenantId, month, year, deletedAt: null },
      select: { status: true, grossSalary: true, netSalary: true, taxAmount: true, socialInsurance: true },
    })

    const summary = payslips.reduce((acc: any, p) => {
      acc.totalGross = (acc.totalGross ?? 0) + Number(p.grossSalary)
      acc.totalNet = (acc.totalNet ?? 0) + Number(p.netSalary)
      acc.totalTax = (acc.totalTax ?? 0) + Number(p.taxAmount)
      acc.totalSocialInsurance = (acc.totalSocialInsurance ?? 0) + Number(p.socialInsurance)
      acc.byStatus = acc.byStatus ?? {}
      acc.byStatus[p.status] = (acc.byStatus[p.status] ?? 0) + 1
      return acc
    }, { totalGross: 0, totalNet: 0, totalTax: 0, totalSocialInsurance: 0, count: payslips.length, byStatus: {} })

    return reply.send(buildSuccessResponse({ year, month, ...summary }))
  })
}
