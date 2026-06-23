import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function salesDiscountRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { search, limit = '50', page = '1' } = req.query as any
    const take = Math.min(parseInt(limit), 200)
    const skip = (parseInt(page) - 1) * take
    const where: any = { tenantId, deletedAt: null }
    if (search) where.OR = [{ code: { contains: search, mode: 'insensitive' } }, { name: { contains: search, mode: 'insensitive' } }]
    const [discounts, total] = await Promise.all([
      prisma.salesDiscount.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip }),
      prisma.salesDiscount.count({ where }),
    ])
    return reply.send({ success: true, data: discounts, meta: { pagination: { total, page: parseInt(page), limit: take } } })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const discount = await prisma.salesDiscount.create({
      data: {
        tenantId, name: body.name, code: body.code.toUpperCase(),
        discountType: body.discountType ?? 'percentage', value: body.value ?? 0,
        minOrderValue: body.minOrderValue, maxUses: body.maxUses,
        validFrom: body.validFrom ? new Date(body.validFrom) : undefined,
        validTo: body.validTo ? new Date(body.validTo) : undefined,
        isActive: body.isActive ?? true,
        createdBy: userId, updatedBy: userId,
      },
    })
    return reply.code(201).send({ success: true, data: discount })
  })

  app.get('/validate/:code', async (req, reply) => {
    const { tenantId } = req as any
    const { code } = req.params as any
    const discount = await prisma.salesDiscount.findFirst({
      where: {
        tenantId, code: code.toUpperCase(), deletedAt: null, isActive: true,
        OR: [{ validTo: null }, { validTo: { gte: new Date() } }],
      },
    })
    if (!discount) return reply.code(404).send({ success: false, error: 'Invalid or expired discount code' })
    if (discount.maxUses && discount.usedCount >= discount.maxUses) {
      return reply.code(400).send({ success: false, error: 'Discount code usage limit reached' })
    }
    return reply.send({ success: true, data: discount })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const discount = await prisma.salesDiscount.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!discount) return reply.code(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: discount })
  })

  app.put('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any
    const allowed = ['name','code','discountType','value','minOrderValue','maxUses','validFrom','validTo','isActive']
    const data: any = { updatedBy: userId }
    for (const k of allowed) {
      if (body[k] !== undefined) {
        data[k] = (k === 'validFrom' || k === 'validTo') && body[k] ? new Date(body[k]) : body[k]
        if (k === 'code') data[k] = body[k].toUpperCase()
      }
    }
    await prisma.salesDiscount.updateMany({ where: { id, tenantId, deletedAt: null }, data })
    return reply.send({ success: true })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    await prisma.salesDiscount.updateMany({ where: { id, tenantId, deletedAt: null }, data: { deletedAt: new Date(), updatedBy: userId } })
    return reply.send({ success: true })
  })
}
