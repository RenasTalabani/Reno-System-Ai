import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

async function getEmployeeId(tenantId: string, userId: string): Promise<string | null> {
  const pu = await prisma.portalUser.findFirst({
    where: { tenantId, userId, portalType: 'employee', entityType: 'hr_employee', isActive: true },
  })
  return pu?.entityId ?? null
}

export async function portalEmployeeRoutes(app: FastifyInstance) {
  // GET /portal/employee/profile — my employee profile
  app.get('/profile', async (req, reply) => {
    const { tenantId, userId } = req as any
    const employeeId = await getEmployeeId(tenantId, userId)
    if (!employeeId) return reply.code(403).send({ success: false, error: 'Employee portal not configured' })

    const employee = await prisma.hrEmployee.findFirst({
      where: { id: employeeId, tenantId },
      include: { positions: { orderBy: { createdAt: 'desc' }, take: 1 } },
    })
    if (!employee) return reply.code(404).send({ success: false, error: 'Employee record not found' })

    await prisma.portalAuditLog.create({
      data: { tenantId, userId, portalType: 'employee', action: 'view_profile', module: 'employee' },
    })

    return reply.send({ success: true, data: employee })
  })

  // GET /portal/employee/leave — my leave requests
  app.get('/leave', async (req, reply) => {
    const { tenantId, userId } = req as any
    const employeeId = await getEmployeeId(tenantId, userId)
    if (!employeeId) return reply.code(403).send({ success: false, error: 'Employee portal not configured' })

    const { status, page = 1, limit = 20 } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)
    const where: any = { employeeId, tenantId, deletedAt: null }
    if (status) where.status = status

    const [requests, total, balances] = await Promise.all([
      prisma.hrLeaveRequest.findMany({
        where,
        include: { leaveType: { select: { name: true, color: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.hrLeaveRequest.count({ where }),
      prisma.hrLeaveBalance.findMany({ where: { employeeId } }).catch(() => []),
    ])

    return reply.send({
      success: true,
      data: { requests, balances },
      meta: { pagination: { total, page: Number(page), limit: Number(limit) } },
    })
  })

  // POST /portal/employee/leave — submit leave request
  app.post('/leave', async (req, reply) => {
    const { tenantId, userId } = req as any
    const employeeId = await getEmployeeId(tenantId, userId)
    if (!employeeId) return reply.code(403).send({ success: false, error: 'Employee portal not configured' })

    const { leaveTypeId, startDate, endDate, notes: reason } = req.body as any
    if (!leaveTypeId || !startDate || !endDate) {
      return reply.code(400).send({ success: false, error: 'leaveTypeId, startDate, endDate required' })
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

    const request = await prisma.hrLeaveRequest.create({
      data: {
        tenantId,
        employeeId,
        leaveTypeId,
        startDate: start,
        endDate: end,
        totalDays: days,
        reason,
        status: 'pending',
        createdBy: userId,
      },
    })

    await prisma.portalAuditLog.create({
      data: { tenantId, userId, portalType: 'employee', action: 'submit_leave', module: 'leave', entityId: request.id },
    })

    // Send portal notification to the employee
    await prisma.portalNotification.create({
      data: {
        tenantId,
        userId,
        portalType: 'employee',
        title: 'Leave Request Submitted',
        body: `Your leave request for ${days} day(s) starting ${start.toLocaleDateString()} has been submitted for approval.`,
        type: 'info',
        data: { entityId: request.id, module: 'leave' },
      },
    })

    return reply.code(201).send({ success: true, data: request })
  })

  // DELETE /portal/employee/leave/:id — cancel pending leave request
  app.delete('/leave/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const employeeId = await getEmployeeId(tenantId, userId)
    if (!employeeId) return reply.code(403).send({ success: false, error: 'Employee portal not configured' })

    const request = await prisma.hrLeaveRequest.findFirst({
      where: { id, employeeId, tenantId, deletedAt: null },
    })
    if (!request) return reply.code(404).send({ success: false, error: 'Leave request not found' })
    if (request.status !== 'pending') {
      return reply.code(400).send({ success: false, error: 'Only pending requests can be cancelled' })
    }

    await prisma.hrLeaveRequest.update({
      where: { id },
      data: { status: 'cancelled', deletedAt: new Date(), updatedBy: userId },
    })

    return reply.send({ success: true, data: { cancelled: true } })
  })

  // GET /portal/employee/payslips — my payslips
  app.get('/payslips', async (req, reply) => {
    const { tenantId, userId } = req as any
    const employeeId = await getEmployeeId(tenantId, userId)
    if (!employeeId) return reply.code(403).send({ success: false, error: 'Employee portal not configured' })

    const { page = 1, limit = 12 } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const [payslips, total] = await Promise.all([
      prisma.hrPayslip.findMany({
        where: { employeeId, tenantId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
        select: {
          id: true, month: true, year: true, status: true, currency: true, basicSalary: true,
          grossSalary: true, netSalary: true, processedAt: true, createdAt: true,
        },
      }),
      prisma.hrPayslip.count({ where: { employeeId, tenantId, deletedAt: null } }),
    ])

    await prisma.portalAuditLog.create({
      data: { tenantId, userId, portalType: 'employee', action: 'view_payslips', module: 'payroll' },
    })

    return reply.send({ success: true, data: payslips, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  // GET /portal/employee/payslips/:id — payslip detail
  app.get('/payslips/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const employeeId = await getEmployeeId(tenantId, userId)
    if (!employeeId) return reply.code(403).send({ success: false, error: 'Employee portal not configured' })

    const payslip = await prisma.hrPayslip.findFirst({
      where: { id, employeeId, tenantId, deletedAt: null },
    })
    if (!payslip) return reply.code(404).send({ success: false, error: 'Payslip not found' })

    await prisma.portalAuditLog.create({
      data: { tenantId, userId, portalType: 'employee', action: 'view_payslip', module: 'payroll', entityId: id },
    })

    return reply.send({ success: true, data: payslip })
  })

  // GET /portal/employee/documents — my employee documents
  app.get('/documents', async (req, reply) => {
    const { tenantId, userId } = req as any
    const employeeId = await getEmployeeId(tenantId, userId)
    if (!employeeId) return reply.code(403).send({ success: false, error: 'Employee portal not configured' })

    // Fetch documents shared with this employee from doc_files (e.g., marked as public or in employee folder)
    const documents = await prisma.docFile.findMany({
      where: { tenantId, deletedAt: null, isActive: true, isPublic: true },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: { id: true, name: true, mimeType: true, sizeBytes: true, updatedAt: true },
    })

    return reply.send({
      success: true,
      data: documents.map(d => ({ ...d, sizeBytes: Number(d.sizeBytes) })),
    })
  })
}
