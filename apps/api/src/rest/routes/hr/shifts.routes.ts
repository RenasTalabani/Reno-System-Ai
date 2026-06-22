import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

export async function hrShiftRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // -------------------------------------------------------------------------
  // Shifts
  // -------------------------------------------------------------------------

  // GET /hr/shifts
  app.get('/', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any

    const where: any = { tenantId, deletedAt: null }
    if (q.search) where.name = { contains: q.search, mode: 'insensitive' }

    const shifts = await prisma.hrShift.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { assignments: { where: { isCurrent: true, deletedAt: null } } } },
      },
    })

    return reply.send(buildSuccessResponse(shifts))
  })

  // GET /hr/shifts/:id
  app.get('/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any

    const shift = await prisma.hrShift.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        assignments: {
          where: { isCurrent: true, deletedAt: null },
          include: { employee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, employeeCode: true } } },
        },
      },
    })

    if (!shift) throw new RenoError(ErrorCode.NOT_FOUND, 'Shift not found', 404)
    return reply.send(buildSuccessResponse(shift))
  })

  // POST /hr/shifts
  app.post('/', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any

    const shift = await prisma.hrShift.create({
      data: {
        tenantId, companyId: body.companyId, name: body.name, code: body.code,
        startTime: body.startTime, endTime: body.endTime,
        breakDuration: body.breakDuration ?? 0,
        workDays: body.workDays ?? ['mon', 'tue', 'wed', 'thu', 'fri'],
        isFlexible: body.isFlexible ?? false,
        flexCoreStart: body.flexCoreStart, flexCoreEnd: body.flexCoreEnd,
        overnightShift: body.overnightShift ?? false,
        color: body.color ?? '#6366f1',
        createdBy: userId,
      },
    })

    return reply.status(201).send(buildSuccessResponse(shift))
  })

  // PUT /hr/shifts/:id
  app.put('/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const body = request.body as any

    const existing = await prisma.hrShift.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!existing) throw new RenoError(ErrorCode.NOT_FOUND, 'Shift not found', 404)

    const updated = await prisma.hrShift.update({
      where: { id },
      data: { ...body, updatedBy: userId },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // DELETE /hr/shifts/:id — soft delete
  app.delete('/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any

    await prisma.hrShift.updateMany({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false, updatedBy: userId },
    })

    return reply.send(buildSuccessResponse({ id }))
  })

  // -------------------------------------------------------------------------
  // Shift Assignments
  // -------------------------------------------------------------------------

  // GET /hr/shifts/assignments — list current assignments
  app.get('/assignments/list', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any

    const where: any = { tenantId, deletedAt: null, isCurrent: true }
    if (q.shiftId) where.shiftId = q.shiftId
    if (q.employeeId) where.employeeId = q.employeeId

    const assignments = await prisma.hrShiftAssignment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, employeeCode: true } },
        shift: { select: { id: true, name: true, startTime: true, endTime: true, color: true } },
      },
    })

    return reply.send(buildSuccessResponse(assignments))
  })

  // POST /hr/shifts/assignments — assign employee to a shift
  app.post('/assignments', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any

    // End current shift assignment for this employee
    await prisma.hrShiftAssignment.updateMany({
      where: { tenantId, employeeId: body.employeeId, isCurrent: true, deletedAt: null },
      data: { isCurrent: false, endDate: new Date(), updatedBy: userId },
    })

    const assignment = await prisma.hrShiftAssignment.create({
      data: {
        tenantId, employeeId: body.employeeId, shiftId: body.shiftId,
        startDate: new Date(body.startDate ?? new Date()),
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        isCurrent: true, createdBy: userId,
      },
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'ASSIGN_SHIFT', module: 'hr', entityType: 'hr_shift_assignments', entityId: assignment.id, newValues: { employeeId: body.employeeId, shiftId: body.shiftId }, ipAddress: request.ip },
    })

    return reply.status(201).send(buildSuccessResponse(assignment))
  })

  // DELETE /hr/shifts/assignments/:id — remove assignment
  app.delete('/assignments/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any

    await prisma.hrShiftAssignment.updateMany({
      where: { id, tenantId },
      data: { isCurrent: false, endDate: new Date(), deletedAt: new Date(), updatedBy: userId },
    })

    return reply.send(buildSuccessResponse({ id }))
  })
}
