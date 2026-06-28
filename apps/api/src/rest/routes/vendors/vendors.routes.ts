import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

export async function vendorRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Vendors ────────────────────────────────────────────────────────────────

  app.get('/', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const where: any = { tenantId }
    if (q.status) where.status = q.status
    if (q.category) where.category = q.category
    if (q.search) where.OR = [{ name: { contains: q.search, mode: 'insensitive' } }, { code: { contains: q.search, mode: 'insensitive' } }, { contactEmail: { contains: q.search, mode: 'insensitive' } }]
    const vendors = await prisma.vndVendor.findMany({ where, orderBy: [{ rating: 'desc' }, { name: 'asc' }], include: { _count: { select: { quotes: true } } } })
    return reply.send(buildSuccessResponse(vendors))
  })

  app.get('/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const vendor = await prisma.vndVendor.findFirst({ where: { id, tenantId }, include: { quotes: { orderBy: { createdAt: 'desc' }, take: 10 }, performance: { orderBy: { period: 'desc' }, take: 12 } } })
    if (!vendor) throw new RenoError(ErrorCode.NOT_FOUND, 'Vendor not found', 404)
    return reply.send(buildSuccessResponse(vendor))
  })

  app.post('/', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any
    const vendor = await prisma.vndVendor.create({
      data: { tenantId, createdBy: userId, name: body.name, code: body.code, category: body.category, contactName: body.contactName, contactEmail: body.contactEmail, contactPhone: body.contactPhone, website: body.website, address: body.address, taxId: body.taxId, paymentTerms: body.paymentTerms ?? 30, currency: body.currency ?? 'USD', rating: body.rating ?? 3, notes: body.notes, tags: body.tags ?? [] },
    })
    return reply.status(201).send(buildSuccessResponse(vendor))
  })

  app.put('/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const body = request.body as any
    const updated = await prisma.vndVendor.updateMany({ where: { id, tenantId }, data: body })
    if (!updated.count) throw new RenoError(ErrorCode.NOT_FOUND, 'Vendor not found', 404)
    return reply.send(buildSuccessResponse({ updated: true }))
  })

  // PATCH /:id/rating
  app.patch('/:id/rating', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const { rating } = request.body as any
    if (rating < 1 || rating > 5) throw new RenoError(ErrorCode.VALIDATION_ERROR, 'Rating must be 1-5', 400)
    await prisma.vndVendor.updateMany({ where: { id, tenantId }, data: { rating } })
    return reply.send(buildSuccessResponse({ rating }))
  })

  // ── Quotes ─────────────────────────────────────────────────────────────────

  app.get('/:id/quotes', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const quotes = await prisma.vndQuote.findMany({ where: { vendorId: id, tenantId }, orderBy: { createdAt: 'desc' } })
    return reply.send(buildSuccessResponse(quotes))
  })

  app.post('/:id/quotes', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const body = request.body as any
    const quote = await prisma.vndQuote.create({
      data: { tenantId, vendorId: id, createdBy: userId, title: body.title, items: body.items ?? [], total: body.total, currency: body.currency ?? 'USD', validUntil: body.validUntil ? new Date(body.validUntil) : undefined, notes: body.notes },
    })
    return reply.status(201).send(buildSuccessResponse(quote))
  })

  app.patch('/quotes/:quoteId/status', async (request, reply) => {
    const { quoteId } = request.params as any
    const { status } = request.body as any
    const quote = await prisma.vndQuote.update({ where: { id: quoteId }, data: { status } })
    return reply.send(buildSuccessResponse(quote))
  })

  // ── Performance ────────────────────────────────────────────────────────────

  app.post('/:id/performance', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const body = request.body as any
    const period = body.period ?? new Date().toISOString().slice(0, 7)
    const perf = await prisma.vndPerformance.upsert({
      where: { vendorId_period: { vendorId: id, period } },
      create: { tenantId, vendorId: id, period, onTimeRate: body.onTimeRate ?? 100, qualityScore: body.qualityScore ?? 100, defectRate: body.defectRate ?? 0, responseHours: body.responseHours, poCount: body.poCount ?? 0, totalSpend: body.totalSpend ?? 0, notes: body.notes },
      update: { onTimeRate: body.onTimeRate, qualityScore: body.qualityScore, defectRate: body.defectRate, responseHours: body.responseHours, poCount: body.poCount, totalSpend: body.totalSpend, notes: body.notes },
    })
    return reply.send(buildSuccessResponse(perf))
  })

  // GET /vendors/dashboard
  app.get('/dashboard', async (request, reply) => {
    const { tenantId } = request as any
    const [totalVendors, byStatus, topRated, pendingQuotes] = await Promise.all([
      prisma.vndVendor.count({ where: { tenantId } }),
      prisma.vndVendor.groupBy({ by: ['status'], where: { tenantId }, _count: { status: true } }),
      prisma.vndVendor.findMany({ where: { tenantId, status: 'active' }, orderBy: { rating: 'desc' }, take: 5, select: { id: true, name: true, rating: true, category: true } }),
      prisma.vndQuote.count({ where: { tenantId, status: { in: ['requested', 'received'] } } }),
    ])
    return reply.send(buildSuccessResponse({
      totalVendors,
      byStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count.status])),
      topRated,
      pendingQuotes,
    }))
  })
}
