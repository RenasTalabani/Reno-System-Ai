import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

export async function cdpRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Customers ─────────────────────────────────────────────────────────────

  app.get('/customers', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const page = Math.max(1, parseInt(q.page ?? '1'))
    const limit = Math.min(100, parseInt(q.limit ?? '25'))
    const where: any = { tenantId, deletedAt: null }
    if (q.stage) where.lifecycleStage = q.stage
    if (q.search) {
      where.OR = [
        { email: { contains: q.search, mode: 'insensitive' } },
        { firstName: { contains: q.search, mode: 'insensitive' } },
        { lastName: { contains: q.search, mode: 'insensitive' } },
        { company: { contains: q.search, mode: 'insensitive' } },
      ]
    }
    const [total, customers] = await Promise.all([
      prisma.cdpCustomer.count({ where }),
      prisma.cdpCustomer.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { lastSeenAt: 'desc' }, include: { _count: { select: { events: true, segmentMembers: true } } } }),
    ])
    return reply.send(buildSuccessResponse(customers, { pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } }))
  })

  app.get('/customers/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const customer = await prisma.cdpCustomer.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { events: { orderBy: { createdAt: 'desc' }, take: 20 }, segmentMembers: { include: { segment: { select: { id: true, name: true } } } } },
    })
    if (!customer) throw new RenoError(ErrorCode.NOT_FOUND, 'Customer not found', 404)
    return reply.send(buildSuccessResponse(customer))
  })

  app.post('/customers', async (request, reply) => {
    const { tenantId } = request as any
    const body = request.body as any
    const customer = await prisma.cdpCustomer.upsert({
      where: { tenantId_email: { tenantId, email: body.email ?? '' } },
      create: { tenantId, email: body.email, phone: body.phone, firstName: body.firstName, lastName: body.lastName, company: body.company, lifecycleStage: body.lifecycleStage ?? 'lead', traits: body.traits ?? {} },
      update: { phone: body.phone, firstName: body.firstName, lastName: body.lastName, company: body.company, traits: body.traits ?? {}, lastSeenAt: new Date() },
    })
    return reply.status(201).send(buildSuccessResponse(customer))
  })

  app.patch('/customers/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const body = request.body as any
    const updated = await prisma.cdpCustomer.updateMany({ where: { id, tenantId }, data: { ...body } })
    if (!updated.count) throw new RenoError(ErrorCode.NOT_FOUND, 'Customer not found', 404)
    return reply.send(buildSuccessResponse({ updated: true }))
  })

  // ── Events (track) ─────────────────────────────────────────────────────────

  app.post('/track', async (request, reply) => {
    const { tenantId } = request as any
    const body = request.body as any
    // Upsert customer by email or externalId
    let customer = body.customerId
      ? await prisma.cdpCustomer.findFirst({ where: { id: body.customerId, tenantId } })
      : body.email
      ? await prisma.cdpCustomer.findFirst({ where: { tenantId, email: body.email } })
      : null

    if (!customer && (body.email || body.externalId)) {
      customer = await prisma.cdpCustomer.create({
        data: { tenantId, email: body.email, externalId: body.externalId, firstName: body.firstName, lastName: body.lastName, lifecycleStage: 'lead' },
      })
    }
    if (!customer) return reply.status(400).send({ error: 'Customer identifier required' })

    const event = await prisma.cdpEvent.create({
      data: { tenantId, customerId: customer.id, event: body.event, source: body.source ?? 'api', properties: body.properties ?? {}, sessionId: body.sessionId, ipAddress: (request as any).ip, userAgent: request.headers['user-agent'] },
    })
    await prisma.cdpCustomer.update({ where: { id: customer.id }, data: { lastSeenAt: new Date() } })
    return reply.status(201).send(buildSuccessResponse({ eventId: event.id, customerId: customer.id }))
  })

  app.get('/customers/:id/events', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const events = await prisma.cdpEvent.findMany({ where: { customerId: id, tenantId }, orderBy: { createdAt: 'desc' }, take: 50 })
    return reply.send(buildSuccessResponse(events))
  })

  // ── Segments ───────────────────────────────────────────────────────────────

  app.get('/segments', async (request, reply) => {
    const { tenantId } = request as any
    const segments = await prisma.cdpSegment.findMany({ where: { tenantId }, orderBy: { memberCount: 'desc' } })
    return reply.send(buildSuccessResponse(segments))
  })

  app.post('/segments', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any
    const segment = await prisma.cdpSegment.create({
      data: { tenantId, createdBy: userId, name: body.name, description: body.description, rules: body.rules ?? [], operator: body.operator ?? 'AND', isDynamic: body.isDynamic ?? true },
    })
    return reply.status(201).send(buildSuccessResponse(segment))
  })

  // POST /cdp/segments/:id/compute — evaluate rules and update membership
  app.post('/segments/:id/compute', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const segment = await prisma.cdpSegment.findFirst({ where: { id, tenantId } })
    if (!segment) throw new RenoError(ErrorCode.NOT_FOUND, 'Segment not found', 404)

    // Simple rule engine: each rule is { field, op, value }
    const rules = segment.rules as Array<{ field: string; op: string; value: unknown }>
    const allCustomers = await prisma.cdpCustomer.findMany({ where: { tenantId, deletedAt: null } })

    const matches = allCustomers.filter(c => {
      return rules.every(rule => {
        const val = (c as any)[rule.field]
        if (rule.op === 'eq') return val === rule.value
        if (rule.op === 'contains') return String(val ?? '').toLowerCase().includes(String(rule.value).toLowerCase())
        if (rule.op === 'gte') return Number(val) >= Number(rule.value)
        if (rule.op === 'lte') return Number(val) <= Number(rule.value)
        if (rule.op === 'in') return Array.isArray(rule.value) && rule.value.includes(val)
        return true
      })
    })

    await prisma.$transaction([
      prisma.cdpSegmentMember.deleteMany({ where: { segmentId: id } }),
      prisma.cdpSegmentMember.createMany({ data: matches.map(c => ({ segmentId: id, customerId: c.id })), skipDuplicates: true }),
      prisma.cdpSegment.update({ where: { id }, data: { memberCount: matches.length, lastComputedAt: new Date() } }),
    ])

    return reply.send(buildSuccessResponse({ computed: true, memberCount: matches.length }))
  })

  // GET /cdp/dashboard — CDP overview stats
  app.get('/dashboard', async (request, reply) => {
    const { tenantId } = request as any
    const [total, byStage, avgHealth, recentEvents] = await Promise.all([
      prisma.cdpCustomer.count({ where: { tenantId, deletedAt: null } }),
      prisma.cdpCustomer.groupBy({ by: ['lifecycleStage'], where: { tenantId, deletedAt: null }, _count: { lifecycleStage: true } }),
      prisma.cdpCustomer.aggregate({ where: { tenantId, deletedAt: null }, _avg: { healthScore: true } }),
      prisma.cdpEvent.count({ where: { tenantId, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
    ])
    return reply.send(buildSuccessResponse({
      totalCustomers: total,
      byLifecycleStage: Object.fromEntries(byStage.map(s => [s.lifecycleStage, s._count.lifecycleStage])),
      avgHealthScore: Math.round(Number(avgHealth._avg.healthScore ?? 50)),
      eventsLast7Days: recentEvents,
    }))
  })
}
