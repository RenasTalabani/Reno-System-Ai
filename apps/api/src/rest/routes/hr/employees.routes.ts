import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

export async function hrEmployeeRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // GET /hr/employees
  app.get('/', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const page = Math.max(1, parseInt(q.page ?? '1'))
    const limit = Math.min(100, parseInt(q.limit ?? '20'))
    const skip = (page - 1) * limit

    const where: any = { tenantId, deletedAt: null }
    if (q.search) {
      where.OR = [
        { firstName: { contains: q.search, mode: 'insensitive' } },
        { lastName: { contains: q.search, mode: 'insensitive' } },
        { employeeCode: { contains: q.search, mode: 'insensitive' } },
        { workEmail: { contains: q.search, mode: 'insensitive' } },
      ]
    }
    if (q.departmentId) where.departmentId = q.departmentId
    if (q.status) where.status = q.status
    if (q.employmentType) where.employmentType = q.employmentType
    if (q.managerId) where.managerId = q.managerId

    const [total, employees] = await Promise.all([
      prisma.hrEmployee.count({ where }),
      prisma.hrEmployee.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        include: {
          department: { select: { id: true, name: true } },
          manager: { select: { id: true, firstName: true, lastName: true } },
          positions: { where: { isCurrent: true, deletedAt: null }, include: { position: true }, take: 1 },
        },
      }),
    ])

    return reply.send(buildSuccessResponse(employees, {
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }))
  })

  // GET /hr/employees/:id
  app.get('/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any

    const employee = await prisma.hrEmployee.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        company: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        manager: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        subordinates: { where: { deletedAt: null }, select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        positions: { where: { deletedAt: null }, include: { position: true }, orderBy: { startDate: 'desc' } },
        documents: { where: { deletedAt: null, isConfidential: false }, orderBy: { createdAt: 'desc' } },
        shiftAssigns: { where: { isCurrent: true, deletedAt: null }, include: { shift: true }, take: 1 },
      },
    })

    if (!employee) throw new RenoError(ErrorCode.NOT_FOUND, 'Employee not found', 404)
    return reply.send(buildSuccessResponse(employee))
  })

  // POST /hr/employees
  app.post('/', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any

    // Auto-generate employee code if not provided
    const count = await prisma.hrEmployee.count({ where: { tenantId, companyId: body.companyId } })
    const employeeCode = body.employeeCode ?? `EMP-${String(count + 1).padStart(4, '0')}`

    const employee = await prisma.hrEmployee.create({
      data: {
        tenantId,
        companyId: body.companyId,
        branchId: body.branchId,
        departmentId: body.departmentId,
        teamId: body.teamId,
        userId: body.userId,
        managerId: body.managerId,
        employeeCode,
        firstName: body.firstName,
        lastName: body.lastName,
        middleName: body.middleName,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
        gender: body.gender,
        maritalStatus: body.maritalStatus,
        nationality: body.nationality,
        nationalId: body.nationalId,
        workEmail: body.workEmail,
        personalEmail: body.personalEmail,
        phone: body.phone,
        hireDate: new Date(body.hireDate),
        probationEndDate: body.probationEndDate ? new Date(body.probationEndDate) : undefined,
        employmentType: body.employmentType ?? 'full_time',
        status: 'active',
        address: body.address,
        emergencyContact: body.emergencyContact,
        createdBy: userId,
      },
    })

    await prisma.sysAuditLog.create({
      data: {
        tenantId, userId,
        action: 'CREATE_EMPLOYEE',
        module: 'hr',
        entityType: 'hr_employees',
        entityId: employee.id,
        newValues: { employeeCode, firstName: body.firstName, lastName: body.lastName },
        ipAddress: request.ip,
      },
    })

    return reply.status(201).send(buildSuccessResponse(employee))
  })

  // PUT /hr/employees/:id
  app.put('/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const body = request.body as any

    const existing = await prisma.hrEmployee.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!existing) throw new RenoError(ErrorCode.NOT_FOUND, 'Employee not found', 404)

    const updated = await prisma.hrEmployee.update({
      where: { id },
      data: {
        ...body,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
        hireDate: body.hireDate ? new Date(body.hireDate) : undefined,
        probationEndDate: body.probationEndDate ? new Date(body.probationEndDate) : undefined,
        confirmationDate: body.confirmationDate ? new Date(body.confirmationDate) : undefined,
        terminationDate: body.terminationDate ? new Date(body.terminationDate) : undefined,
        updatedBy: userId,
      },
    })

    await prisma.sysAuditLog.create({
      data: {
        tenantId, userId,
        action: 'UPDATE_EMPLOYEE',
        module: 'hr',
        entityType: 'hr_employees',
        entityId: id,
        oldValues: { status: existing.status },
        newValues: body,
        ipAddress: request.ip,
      },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // PATCH /hr/employees/:id/status
  app.patch('/:id/status', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const { status, terminationReason, terminationDate } = request.body as any

    const existing = await prisma.hrEmployee.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!existing) throw new RenoError(ErrorCode.NOT_FOUND, 'Employee not found', 404)

    const updated = await prisma.hrEmployee.update({
      where: { id },
      data: {
        status,
        terminationReason: status === 'terminated' ? terminationReason : undefined,
        terminationDate: status === 'terminated' ? (terminationDate ? new Date(terminationDate) : new Date()) : undefined,
        updatedBy: userId,
      },
    })

    await prisma.sysAuditLog.create({
      data: {
        tenantId, userId,
        action: 'UPDATE_EMPLOYEE_STATUS',
        module: 'hr',
        entityType: 'hr_employees',
        entityId: id,
        oldValues: { status: existing.status },
        newValues: { status, terminationReason },
        ipAddress: request.ip,
      },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // DELETE /hr/employees/:id — soft delete
  app.delete('/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any

    await prisma.hrEmployee.updateMany({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false, updatedBy: userId },
    })

    await prisma.sysAuditLog.create({
      data: {
        tenantId, userId,
        action: 'DELETE_EMPLOYEE',
        module: 'hr',
        entityType: 'hr_employees',
        entityId: id,
        ipAddress: request.ip,
      },
    })

    return reply.send(buildSuccessResponse({ id }))
  })

  // GET /hr/employees/:id/leave-balance
  app.get('/:id/leave-balance', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const q = request.query as any
    const year = parseInt(q.year ?? String(new Date().getFullYear()))

    const balances = await prisma.hrLeaveBalance.findMany({
      where: { tenantId, employeeId: id, year, deletedAt: null },
      include: { leaveType: true },
    })

    return reply.send(buildSuccessResponse(balances))
  })

  // GET /hr/employees/:id/attendance
  app.get('/:id/attendance', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const q = request.query as any

    const where: any = { tenantId, employeeId: id, deletedAt: null }
    if (q.from) where.date = { ...where.date, gte: new Date(q.from) }
    if (q.to) where.date = { ...where.date, lte: new Date(q.to) }

    const records = await prisma.hrAttendance.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 60,
    })

    return reply.send(buildSuccessResponse(records))
  })

  // GET /hr/employees/:id/payslips
  app.get('/:id/payslips', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any

    const payslips = await prisma.hrPayslip.findMany({
      where: { tenantId, employeeId: id, deletedAt: null },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })

    return reply.send(buildSuccessResponse(payslips))
  })
}
