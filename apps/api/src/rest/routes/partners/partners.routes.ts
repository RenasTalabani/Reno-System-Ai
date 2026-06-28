import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'
import { randomBytes } from 'crypto'

export async function partnerRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Partners ───────────────────────────────────────────────────────────────

  app.get('/', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const where: any = { tenantId }
    if (q.status) where.status = q.status
    if (q.tier) where.tier = q.tier
    const partners = await prisma.prtnPartner.findMany({
      where,
      orderBy: { totalRevenue: 'desc' },
      include: { _count: { select: { referrals: true, deals: true } } },
    })
    return reply.send(buildSuccessResponse(partners))
  })

  app.get('/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const partner = await prisma.prtnPartner.findFirst({
      where: { id, tenantId },
      include: {
        referrals: { orderBy: { createdAt: 'desc' }, take: 10 },
        commissions: { orderBy: { createdAt: 'desc' }, take: 10 },
        deals: { orderBy: { updatedAt: 'desc' }, take: 10 },
      },
    })
    if (!partner) throw new RenoError(ErrorCode.NOT_FOUND, 'Partner not found', 404)
    return reply.send(buildSuccessResponse(partner))
  })

  app.post('/', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any
    const partner = await prisma.prtnPartner.create({
      data: { tenantId, createdBy: userId, name: body.name, type: body.type ?? 'reseller', contactEmail: body.contactEmail, contactName: body.contactName, website: body.website, tier: body.tier ?? 'standard', commissionRate: body.commissionRate ?? 10 },
    })
    return reply.status(201).send(buildSuccessResponse(partner))
  })

  app.put('/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const body = request.body as any
    const updated = await prisma.prtnPartner.updateMany({ where: { id, tenantId }, data: body })
    if (!updated.count) throw new RenoError(ErrorCode.NOT_FOUND, 'Partner not found', 404)
    return reply.send(buildSuccessResponse({ updated: true }))
  })

  // ── Referral Codes ─────────────────────────────────────────────────────────

  app.post('/:id/referral-codes', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const partner = await prisma.prtnPartner.findFirst({ where: { id, tenantId } })
    if (!partner) throw new RenoError(ErrorCode.NOT_FOUND, 'Partner not found', 404)
    const code = `${partner.name.toUpperCase().replace(/\s+/g, '').slice(0, 6)}-${randomBytes(3).toString('hex').toUpperCase()}`
    const referral = await prisma.prtnReferral.create({ data: { tenantId, partnerId: id, code } })
    return reply.status(201).send(buildSuccessResponse(referral))
  })

  app.get('/:id/referrals', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const referrals = await prisma.prtnReferral.findMany({ where: { partnerId: id, tenantId }, orderBy: { createdAt: 'desc' } })
    return reply.send(buildSuccessResponse(referrals))
  })

  // POST /partners/referrals/convert — called when a referred tenant signs up
  app.post('/referrals/convert', async (request, reply) => {
    const { code, referredTenantId, dealValue } = request.body as any
    const referral = await prisma.prtnReferral.findFirst({ where: { code } })
    if (!referral) throw new RenoError(ErrorCode.NOT_FOUND, 'Invalid referral code', 404)
    if (referral.status !== 'pending') throw new RenoError(ErrorCode.VALIDATION_ERROR, 'Referral already used', 400)

    const partner = await prisma.prtnPartner.findUnique({ where: { id: referral.partnerId } })
    if (!partner) throw new RenoError(ErrorCode.NOT_FOUND, 'Partner not found', 404)

    const commission = dealValue ? (Number(dealValue) * Number(partner.commissionRate)) / 100 : null

    await prisma.$transaction([
      prisma.prtnReferral.update({ where: { id: referral.id }, data: { status: 'converted', referredTenantId, dealValue, commission, convertedAt: new Date() } }),
      ...(commission ? [
        prisma.prtnCommission.create({ data: { tenantId: referral.tenantId, partnerId: referral.partnerId, referralId: referral.id, amount: commission, period: new Date().toISOString().slice(0, 7) } }),
        prisma.prtnPartner.update({ where: { id: referral.partnerId }, data: { totalRevenue: { increment: dealValue ?? 0 }, totalCommission: { increment: commission } } }),
      ] : []),
    ])

    return reply.send(buildSuccessResponse({ converted: true, commission }))
  })

  // ── Commissions ────────────────────────────────────────────────────────────

  app.get('/:id/commissions', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const commissions = await prisma.prtnCommission.findMany({ where: { partnerId: id, tenantId }, orderBy: { createdAt: 'desc' } })
    return reply.send(buildSuccessResponse(commissions))
  })

  app.patch('/commissions/:commId/pay', async (request, reply) => {
    const { tenantId } = request as any
    const { commId } = request.params as any
    await prisma.prtnCommission.updateMany({ where: { id: commId, tenantId }, data: { status: 'paid', paidAt: new Date() } })
    return reply.send(buildSuccessResponse({ paid: true }))
  })

  // ── Deals ──────────────────────────────────────────────────────────────────

  app.get('/:id/deals', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const deals = await prisma.prtnDeal.findMany({ where: { partnerId: id, tenantId }, orderBy: { updatedAt: 'desc' } })
    return reply.send(buildSuccessResponse(deals))
  })

  app.post('/:id/deals', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const body = request.body as any
    const deal = await prisma.prtnDeal.create({ data: { tenantId, partnerId: id, title: body.title, value: body.value ?? 0, stage: body.stage ?? 'prospecting', notes: body.notes } })
    return reply.status(201).send(buildSuccessResponse(deal))
  })

  app.patch('/deals/:dealId', async (request, reply) => {
    const { tenantId } = request as any
    const { dealId } = request.params as any
    const body = request.body as any
    await prisma.prtnDeal.updateMany({ where: { id: dealId, tenantId }, data: body })
    return reply.send(buildSuccessResponse({ updated: true }))
  })

  // ── Dashboard ──────────────────────────────────────────────────────────────

  app.get('/dashboard', async (request, reply) => {
    const { tenantId } = request as any
    const [totalPartners, pendingCommissions, recentConversions, topPartners] = await Promise.all([
      prisma.prtnPartner.count({ where: { tenantId, status: 'active' } }),
      prisma.prtnCommission.aggregate({ where: { tenantId, status: 'pending' }, _sum: { amount: true }, _count: true }),
      prisma.prtnReferral.count({ where: { tenantId, status: 'converted', convertedAt: { gte: new Date(Date.now() - 30 * 86400000) } } }),
      prisma.prtnPartner.findMany({ where: { tenantId }, orderBy: { totalRevenue: 'desc' }, take: 5, select: { id: true, name: true, tier: true, totalRevenue: true, totalCommission: true } }),
    ])
    return reply.send(buildSuccessResponse({
      activePartners: totalPartners,
      pendingCommissionAmount: pendingCommissions._sum.amount ?? 0,
      pendingCommissionCount: pendingCommissions._count,
      conversionsLast30Days: recentConversions,
      topPartners,
    }))
  })
}
