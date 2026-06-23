import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function salesSubscriptionRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { status, contactId, companyId, limit = '50', page = '1' } = req.query as any
    const take = Math.min(parseInt(limit), 200)
    const skip = (parseInt(page) - 1) * take
    const where: any = { tenantId, deletedAt: null }
    if (status) where.status = status
    if (contactId) where.contactId = contactId
    if (companyId) where.companyId = companyId
    const [subscriptions, total] = await Promise.all([
      prisma.salesSubscription.findMany({
        where,
        include: { product: { select: { id: true, name: true, sku: true } } },
        orderBy: { createdAt: 'desc' },
        take, skip,
      }),
      prisma.salesSubscription.count({ where }),
    ])
    return reply.send({ success: true, data: subscriptions, meta: { pagination: { total, page: parseInt(page), limit: take } } })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const sub = await prisma.salesSubscription.create({
      data: {
        tenantId, productId: body.productId, contactId: body.contactId,
        companyId: body.companyId, ownerId: body.ownerId ?? userId,
        planName: body.name ?? body.planName, status: 'active',
        billingInterval: body.billingInterval ?? 'monthly',
        amount: body.amount, currency: body.currency ?? 'USD',
        startDate: body.startDate ? new Date(body.startDate) : new Date(),
        nextBillingDate: body.nextBillingDate ? new Date(body.nextBillingDate) : new Date(),
        trialEndDate: body.trialEndDate ? new Date(body.trialEndDate) : undefined,
        createdBy: userId, updatedBy: userId,
      },
    })
    await logAudit(tenantId, userId, 'SUBSCRIPTION_CREATED', 'sales_subscriptions', sub.id, { planName: body.name ?? body.planName })
    return reply.code(201).send({ success: true, data: sub })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const sub = await prisma.salesSubscription.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { product: true },
    })
    if (!sub) return reply.code(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: sub })
  })

  app.put('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any
    const allowed = ['planName','amount','currency','billingInterval','nextBillingDate','ownerId']
    const data: any = { updatedBy: userId }
    for (const k of allowed) if (body[k] !== undefined) data[k] = k.endsWith('Date') && body[k] ? new Date(body[k]) : body[k]
    await prisma.salesSubscription.updateMany({ where: { id, tenantId, deletedAt: null }, data })
    return reply.send({ success: true })
  })

  app.patch('/:id/pause', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    await prisma.salesSubscription.updateMany({ where: { id, tenantId, deletedAt: null }, data: { status: 'paused', pausedAt: new Date(), updatedBy: userId } })
    await logAudit(tenantId, userId, 'SUBSCRIPTION_PAUSED', 'sales_subscriptions', id, {})
    return reply.send({ success: true })
  })

  app.patch('/:id/resume', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any
    await prisma.salesSubscription.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { status: 'active', pausedAt: null, nextBillingDate: body.nextBillingDate ? new Date(body.nextBillingDate) : new Date(), updatedBy: userId },
    })
    await logAudit(tenantId, userId, 'SUBSCRIPTION_RESUMED', 'sales_subscriptions', id, {})
    return reply.send({ success: true })
  })

  app.patch('/:id/cancel', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any
    await prisma.salesSubscription.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { status: 'cancelled', cancelledAt: new Date(), cancelReason: body.reason, updatedBy: userId },
    })
    await logAudit(tenantId, userId, 'SUBSCRIPTION_CANCELLED', 'sales_subscriptions', id, { reason: body.reason })
    return reply.send({ success: true })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    await prisma.salesSubscription.updateMany({ where: { id, tenantId, deletedAt: null }, data: { deletedAt: new Date(), updatedBy: userId } })
    return reply.send({ success: true })
  })
}

async function logAudit(tenantId: string, userId: string, action: string, entityType: string, entityId: string, meta: any) {
  await prisma.sysAuditLog.create({ data: { tenantId, userId, action, module: 'sales', entityType, entityId, newValues: meta } }).catch(() => {})
}
