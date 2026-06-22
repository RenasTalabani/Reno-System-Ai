import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

export async function hrLeaveRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // -------------------------------------------------------------------------
  // Leave Types
  // -------------------------------------------------------------------------

  app.get('/types', async (request, reply) => {
    const { tenantId } = request as any
    const types = await prisma.hrLeaveType.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { name: 'asc' },
    })
    return reply.send(buildSuccessResponse(types))
  })

  app.post('/types', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any
    const type = await prisma.hrLeaveType.create({
      data: { tenantId, companyId: body.companyId, name: body.name, code: body.code, paidType: body.paidType ?? 'paid', maxDaysPerYear: body.maxDaysPerYear, carryForwardDays: body.carryForwardDays ?? 0, requiresApproval: body.requiresApproval ?? true, requiresDocument: body.requiresDocument ?? false, minNoticeDays: body.minNoticeDays ?? 0, genderRestriction: body.genderRestriction ?? 'all', color: body.color ?? '#6366f1', createdBy: userId },
    })
    return reply.status(201).send(buildSuccessResponse(type))
  })

  app.put('/types/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const body = request.body as any
    const updated = await prisma.hrLeaveType.update({ where: { id }, data: { ...body, updatedBy: userId } })
    return reply.send(buildSuccessResponse(updated))
  })

  app.delete('/types/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    await prisma.hrLeaveType.updateMany({ where: { id, tenantId }, data: { deletedAt: new Date(), isActive: false } })
    return reply.send(buildSuccessResponse({ id }))
  })

  // -------------------------------------------------------------------------
  // Leave Requests
  // -------------------------------------------------------------------------

  app.get('/requests', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const page = Math.max(1, parseInt(q.page ?? '1'))
    const limit = Math.min(100, parseInt(q.limit ?? '20'))

    const where: any = { tenantId, deletedAt: null }
    if (q.employeeId) where.employeeId = q.employeeId
    if (q.status) where.status = q.status
    if (q.leaveTypeId) where.leaveTypeId = q.leaveTypeId
    if (q.from) where.startDate = { gte: new Date(q.from) }
    if (q.to) where.endDate = { lte: new Date(q.to) }

    const [total, requests] = await Promise.all([
      prisma.hrLeaveRequest.count({ where }),
      prisma.hrLeaveRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, avatarUrl: true } },
          leaveType: { select: { id: true, name: true, color: true, paidType: true } },
        },
      }),
    ])

    return reply.send(buildSuccessResponse(requests, {
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }))
  })

  app.post('/requests', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any

    const startDate = new Date(body.startDate)
    const endDate = new Date(body.endDate)
    const msPerDay = 86400000
    const totalDays = body.isHalfDay ? 0.5 : Math.round((endDate.getTime() - startDate.getTime()) / msPerDay) + 1

    // Check for overlapping approved/pending requests
    const overlap = await prisma.hrLeaveRequest.findFirst({
      where: {
        tenantId, employeeId: body.employeeId, deletedAt: null,
        status: { in: ['pending', 'approved'] },
        AND: [{ startDate: { lte: endDate } }, { endDate: { gte: startDate } }],
      },
    })
    if (overlap) throw new RenoError(ErrorCode.CONFLICT, 'Leave request overlaps with existing request', 409)

    const leaveRequest = await prisma.hrLeaveRequest.create({
      data: {
        tenantId, employeeId: body.employeeId, leaveTypeId: body.leaveTypeId,
        startDate, endDate, totalDays, isHalfDay: body.isHalfDay ?? false,
        halfDayPeriod: body.halfDayPeriod, reason: body.reason, status: 'pending',
        documentUrl: body.documentUrl, createdBy: userId,
      },
    })

    // Update pending days in balance
    await prisma.hrLeaveBalance.updateMany({
      where: { tenantId, employeeId: body.employeeId, leaveTypeId: body.leaveTypeId, year: startDate.getFullYear(), deletedAt: null },
      data: { pendingDays: { increment: totalDays } },
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'CREATE_LEAVE_REQUEST', module: 'hr', entityType: 'hr_leave_requests', entityId: leaveRequest.id, newValues: { employeeId: body.employeeId, startDate: body.startDate, endDate: body.endDate, totalDays }, ipAddress: request.ip },
    })

    return reply.status(201).send(buildSuccessResponse(leaveRequest))
  })

  // PATCH /hr/leave/requests/:id/approve
  app.patch('/requests/:id/approve', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any

    const req = await prisma.hrLeaveRequest.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!req) throw new RenoError(ErrorCode.NOT_FOUND, 'Leave request not found', 404)
    if (req.status !== 'pending') throw new RenoError(ErrorCode.VALIDATION_ERROR, 'Only pending requests can be approved', 400)

    const updated = await prisma.hrLeaveRequest.update({
      where: { id },
      data: { status: 'approved', approvedBy: userId, approvedAt: new Date(), updatedBy: userId },
    })

    // Deduct from balance
    await prisma.hrLeaveBalance.updateMany({
      where: { tenantId, employeeId: req.employeeId, leaveTypeId: req.leaveTypeId, year: req.startDate.getFullYear(), deletedAt: null },
      data: { usedDays: { increment: Number(req.totalDays) }, pendingDays: { decrement: Number(req.totalDays) } },
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'APPROVE_LEAVE_REQUEST', module: 'hr', entityType: 'hr_leave_requests', entityId: id, ipAddress: request.ip },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // PATCH /hr/leave/requests/:id/reject
  app.patch('/requests/:id/reject', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const { rejectionReason } = request.body as any

    const req = await prisma.hrLeaveRequest.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!req) throw new RenoError(ErrorCode.NOT_FOUND, 'Leave request not found', 404)
    if (req.status !== 'pending') throw new RenoError(ErrorCode.VALIDATION_ERROR, 'Only pending requests can be rejected', 400)

    const updated = await prisma.hrLeaveRequest.update({
      where: { id },
      data: { status: 'rejected', rejectionReason, approvedBy: userId, approvedAt: new Date(), updatedBy: userId },
    })

    // Restore pending days
    await prisma.hrLeaveBalance.updateMany({
      where: { tenantId, employeeId: req.employeeId, leaveTypeId: req.leaveTypeId, year: req.startDate.getFullYear(), deletedAt: null },
      data: { pendingDays: { decrement: Number(req.totalDays) } },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // PATCH /hr/leave/requests/:id/cancel
  app.patch('/requests/:id/cancel', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any

    const req = await prisma.hrLeaveRequest.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!req) throw new RenoError(ErrorCode.NOT_FOUND, 'Leave request not found', 404)

    const updated = await prisma.hrLeaveRequest.update({
      where: { id },
      data: { status: 'cancelled', updatedBy: userId },
    })

    // Restore days
    if (req.status === 'pending') {
      await prisma.hrLeaveBalance.updateMany({
        where: { tenantId, employeeId: req.employeeId, leaveTypeId: req.leaveTypeId, year: req.startDate.getFullYear(), deletedAt: null },
        data: { pendingDays: { decrement: Number(req.totalDays) } },
      })
    } else if (req.status === 'approved') {
      await prisma.hrLeaveBalance.updateMany({
        where: { tenantId, employeeId: req.employeeId, leaveTypeId: req.leaveTypeId, year: req.startDate.getFullYear(), deletedAt: null },
        data: { usedDays: { decrement: Number(req.totalDays) } },
      })
    }

    return reply.send(buildSuccessResponse(updated))
  })
}
