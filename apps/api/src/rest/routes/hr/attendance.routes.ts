import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

export async function hrAttendanceRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // GET /hr/attendance
  app.get('/', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const page = Math.max(1, parseInt(q.page ?? '1'))
    const limit = Math.min(200, parseInt(q.limit ?? '50'))
    const skip = (page - 1) * limit

    const where: any = { tenantId, deletedAt: null }
    if (q.employeeId) where.employeeId = q.employeeId
    if (q.status) where.status = q.status
    if (q.from) where.date = { ...where.date, gte: new Date(q.from) }
    if (q.to) where.date = { ...where.date, lte: new Date(q.to) }

    const [total, records] = await Promise.all([
      prisma.hrAttendance.count({ where }),
      prisma.hrAttendance.findMany({
        where, skip, take: limit,
        orderBy: { date: 'desc' },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, avatarUrl: true } },
        },
      }),
    ])

    return reply.send(buildSuccessResponse(records, {
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }))
  })

  // POST /hr/attendance — manual check-in/out or record
  app.post('/', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any

    const date = new Date(body.date)

    const existing = await prisma.hrAttendance.findFirst({
      where: { tenantId, employeeId: body.employeeId, date },
    })

    let record
    if (existing) {
      record = await prisma.hrAttendance.update({
        where: { id: existing.id },
        data: {
          checkOut: body.checkOut ? new Date(body.checkOut) : undefined,
          workingHours: body.workingHours,
          status: body.status ?? existing.status,
          notes: body.notes,
          updatedBy: userId,
        },
      })
    } else {
      record = await prisma.hrAttendance.create({
        data: {
          tenantId,
          employeeId: body.employeeId,
          date,
          checkIn: body.checkIn ? new Date(body.checkIn) : undefined,
          checkOut: body.checkOut ? new Date(body.checkOut) : undefined,
          workingHours: body.workingHours,
          status: body.status ?? 'present',
          source: body.source ?? 'manual',
          notes: body.notes,
          createdBy: userId,
        },
      })
    }

    return reply.status(201).send(buildSuccessResponse(record))
  })

  // PATCH /hr/attendance/:id/approve
  app.patch('/:id/approve', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any

    const record = await prisma.hrAttendance.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!record) throw new RenoError(ErrorCode.NOT_FOUND, 'Attendance record not found', 404)

    const updated = await prisma.hrAttendance.update({
      where: { id },
      data: { approvedBy: userId, approvedAt: new Date(), updatedBy: userId },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // GET /hr/attendance/summary — monthly summary for all employees
  app.get('/summary', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const year = parseInt(q.year ?? String(new Date().getFullYear()))
    const month = parseInt(q.month ?? String(new Date().getMonth() + 1))

    const monthStart = new Date(year, month - 1, 1)
    const monthEnd = new Date(year, month, 0)

    const records = await prisma.hrAttendance.groupBy({
      by: ['employeeId', 'status'],
      where: { tenantId, date: { gte: monthStart, lte: monthEnd }, deletedAt: null },
      _count: { status: true },
    })

    const summary = records.reduce((acc: Record<string, Record<string, number>>, r) => {
      if (!acc[r.employeeId]) acc[r.employeeId] = {}
      acc[r.employeeId][r.status] = r._count.status
      return acc
    }, {})

    return reply.send(buildSuccessResponse({ year, month, summary }))
  })
}
