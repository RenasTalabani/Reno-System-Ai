import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

export async function hrHolidayRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // GET /hr/holidays
  app.get('/', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const year = parseInt(q.year ?? String(new Date().getFullYear()))

    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year, 11, 31)

    const where: any = { tenantId, deletedAt: null, date: { gte: yearStart, lte: yearEnd } }
    if (q.companyId) where.companyId = q.companyId
    if (q.type) where.type = q.type

    const holidays = await prisma.hrHoliday.findMany({
      where,
      orderBy: { date: 'asc' },
    })

    return reply.send(buildSuccessResponse(holidays))
  })

  // GET /hr/holidays/:id
  app.get('/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any

    const holiday = await prisma.hrHoliday.findFirst({
      where: { id, tenantId, deletedAt: null },
    })

    if (!holiday) throw new RenoError(ErrorCode.NOT_FOUND, 'Holiday not found', 404)
    return reply.send(buildSuccessResponse(holiday))
  })

  // POST /hr/holidays
  app.post('/', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any

    const holiday = await prisma.hrHoliday.create({
      data: {
        tenantId, companyId: body.companyId, name: body.name,
        date: new Date(body.date),
        type: body.type ?? body.holidayType ?? 'public',
        isRecurring: body.isRecurring ?? false,
        description: body.description,
        createdBy: userId,
      },
    })

    return reply.status(201).send(buildSuccessResponse(holiday))
  })

  // POST /hr/holidays/bulk — import multiple holidays for a year
  app.post('/bulk', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any

    if (!Array.isArray(body.holidays) || body.holidays.length === 0) {
      throw new RenoError(ErrorCode.VALIDATION_ERROR, 'holidays array is required', 400)
    }

    const created = await prisma.hrHoliday.createMany({
      data: body.holidays.map((h: any) => ({
        tenantId, companyId: h.companyId ?? body.companyId,
        name: h.name, date: new Date(h.date),
        type: h.type ?? h.holidayType ?? 'public',
        isRecurring: h.isRecurring ?? false,
        description: h.description,
        createdBy: userId,
      })),
      skipDuplicates: true,
    })

    return reply.status(201).send(buildSuccessResponse({ count: created.count }))
  })

  // PUT /hr/holidays/:id
  app.put('/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const body = request.body as any

    const existing = await prisma.hrHoliday.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!existing) throw new RenoError(ErrorCode.NOT_FOUND, 'Holiday not found', 404)

    const updated = await prisma.hrHoliday.update({
      where: { id },
      data: {
        ...body,
        date: body.date ? new Date(body.date) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        year: body.date ? new Date(body.date).getFullYear() : undefined,
        updatedBy: userId,
      },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // DELETE /hr/holidays/:id — soft delete
  app.delete('/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any

    await prisma.hrHoliday.updateMany({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false, updatedBy: userId },
    })

    return reply.send(buildSuccessResponse({ id }))
  })

  // GET /hr/holidays/upcoming — next N days
  app.get('/upcoming/list', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const days = parseInt(q.days ?? '30')

    const future = new Date()
    future.setDate(future.getDate() + days)

    const holidays = await prisma.hrHoliday.findMany({
      where: {
        tenantId, deletedAt: null,
        date: { gte: new Date(), lte: future },
      },
      orderBy: { date: 'asc' },
    })

    return reply.send(buildSuccessResponse(holidays))
  })
}
