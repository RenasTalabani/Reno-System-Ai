import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

export async function hrJobPositionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // GET /hr/positions
  app.get('/', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any

    const where: any = { tenantId, deletedAt: null }
    if (q.search) where.title = { contains: q.search, mode: 'insensitive' }
    if (q.departmentId) where.departmentId = q.departmentId
    if (q.gradeId) where.gradeId = q.gradeId
    if (q.isOpen !== undefined) where.isOpen = q.isOpen === 'true'

    const positions = await prisma.hrJobPosition.findMany({
      where,
      orderBy: { title: 'asc' },
      include: {
        department: { select: { id: true, name: true } },
        grade: { select: { id: true, name: true } },
        _count: { select: { employeePositions: { where: { isCurrent: true, deletedAt: null } } } },
      },
    })

    return reply.send(buildSuccessResponse(positions))
  })

  // GET /hr/positions/:id
  app.get('/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any

    const position = await prisma.hrJobPosition.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        department: true,
        grade: true,
        employeePositions: {
          where: { isCurrent: true, deletedAt: null },
          include: { employee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, employeeCode: true } } },
        },
      },
    })

    if (!position) throw new RenoError(ErrorCode.NOT_FOUND, 'Job position not found', 404)
    return reply.send(buildSuccessResponse(position))
  })

  // POST /hr/positions
  app.post('/', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any

    const position = await prisma.hrJobPosition.create({
      data: {
        tenantId, companyId: body.companyId, departmentId: body.departmentId,
        gradeId: body.gradeId, title: body.title, code: body.code,
        description: body.description, responsibilities: body.responsibilities,
        requirements: body.requirements, minSalary: body.minSalary, maxSalary: body.maxSalary,
        currency: body.currency ?? 'USD', isOpen: body.isOpen ?? true,
        openingsCount: body.openingsCount ?? 1, createdBy: userId,
      },
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'CREATE_JOB_POSITION', module: 'hr', entityType: 'hr_job_positions', entityId: position.id, newValues: { title: body.title }, ipAddress: request.ip },
    })

    return reply.status(201).send(buildSuccessResponse(position))
  })

  // PUT /hr/positions/:id
  app.put('/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const body = request.body as any

    const existing = await prisma.hrJobPosition.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!existing) throw new RenoError(ErrorCode.NOT_FOUND, 'Job position not found', 404)

    const updated = await prisma.hrJobPosition.update({
      where: { id },
      data: { ...body, updatedBy: userId },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // DELETE /hr/positions/:id — soft delete
  app.delete('/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any

    await prisma.hrJobPosition.updateMany({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false, updatedBy: userId },
    })

    return reply.send(buildSuccessResponse({ id }))
  })

  // -------------------------------------------------------------------------
  // Employee-Position assignments
  // -------------------------------------------------------------------------

  // POST /hr/positions/:id/assign — assign an employee to this position
  app.post('/:id/assign', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const body = request.body as any

    // Close previous current assignment for this employee
    await prisma.hrEmployeePosition.updateMany({
      where: { tenantId, employeeId: body.employeeId, isCurrent: true, deletedAt: null },
      data: { isCurrent: false, endDate: new Date(), updatedBy: userId },
    })

    const assignment = await prisma.hrEmployeePosition.create({
      data: {
        tenantId, employeeId: body.employeeId, positionId: id,
        startDate: new Date(body.startDate ?? new Date()),
        isCurrent: true, appointmentType: body.appointmentType ?? 'permanent',
        createdBy: userId,
      },
    })

    return reply.status(201).send(buildSuccessResponse(assignment))
  })

  // -------------------------------------------------------------------------
  // Payroll Grades
  // -------------------------------------------------------------------------

  // GET /hr/positions/grades
  app.get('/grades/list', async (request, reply) => {
    const { tenantId } = request as any

    const grades = await prisma.hrPayrollGrade.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { level: 'asc' },
    })

    return reply.send(buildSuccessResponse(grades))
  })

  // POST /hr/positions/grades
  app.post('/grades', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any

    const grade = await prisma.hrPayrollGrade.create({
      data: {
        tenantId, companyId: body.companyId, name: body.name, code: body.code,
        level: body.level, basicSalaryMin: body.basicSalaryMin, basicSalaryMax: body.basicSalaryMax,
        currency: body.currency ?? 'USD', allowances: body.allowances ?? {},
        deductionRules: body.deductionRules ?? {}, createdBy: userId,
      },
    })

    return reply.status(201).send(buildSuccessResponse(grade))
  })

  // PUT /hr/positions/grades/:id
  app.put('/grades/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const body = request.body as any

    const updated = await prisma.hrPayrollGrade.update({
      where: { id },
      data: { ...body, updatedBy: userId },
    })

    return reply.send(buildSuccessResponse(updated))
  })
}
