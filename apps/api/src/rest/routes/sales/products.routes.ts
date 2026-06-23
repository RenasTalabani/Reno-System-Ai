import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function salesProductRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { search, productType, category, limit = '50', page = '1' } = req.query as any
    const take = Math.min(parseInt(limit), 200)
    const skip = (parseInt(page) - 1) * take
    const where: any = { tenantId, deletedAt: null }
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }]
    if (productType) where.productType = productType
    if (category) where.category = category
    const [products, total] = await Promise.all([
      prisma.salesProduct.findMany({ where, include: { tax: { select: { id: true, name: true, rate: true } } }, orderBy: { name: 'asc' }, take, skip }),
      prisma.salesProduct.count({ where }),
    ])
    return reply.send({ success: true, data: products, meta: { pagination: { total, page: parseInt(page), limit: take } } })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const product = await prisma.salesProduct.create({
      data: {
        tenantId, name: body.name, sku: body.sku, description: body.description,
        productType: body.productType ?? 'product', unitPrice: body.unitPrice ?? 0,
        currency: body.currency ?? 'USD', unit: body.unit ?? 'unit',
        billingInterval: body.billingInterval, category: body.category,
        taxId: body.taxId, imageUrl: body.imageUrl, tags: body.tags ?? [],
        createdBy: userId, updatedBy: userId,
      },
    })
    return reply.code(201).send({ success: true, data: product })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const product = await prisma.salesProduct.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { tax: true },
    })
    if (!product) return reply.code(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: product })
  })

  app.put('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any
    const allowed = ['name','sku','description','productType','unitPrice','currency','unit','billingInterval','category','taxId','imageUrl','tags']
    const data: any = { updatedBy: userId }
    for (const k of allowed) if (body[k] !== undefined) data[k] = body[k]
    await prisma.salesProduct.updateMany({ where: { id, tenantId, deletedAt: null }, data })
    return reply.send({ success: true })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    await prisma.salesProduct.updateMany({ where: { id, tenantId, deletedAt: null }, data: { deletedAt: new Date(), updatedBy: userId } })
    return reply.send({ success: true })
  })
}
