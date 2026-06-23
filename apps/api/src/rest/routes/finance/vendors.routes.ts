import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function finVendorRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { search, limit = '50', page = '1' } = req.query as any
    const take = Math.min(parseInt(limit), 200)
    const skip = (parseInt(page) - 1) * take
    const where: any = { tenantId, deletedAt: null }
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
    const [vendors, total] = await Promise.all([
      prisma.finVendor.findMany({ where, include: { _count: { select: { bills: true } } }, orderBy: { name: 'asc' }, take, skip }),
      prisma.finVendor.count({ where }),
    ])
    return reply.send({ success: true, data: vendors, meta: { pagination: { total, page: parseInt(page), limit: take } } })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const vendor = await prisma.finVendor.create({
      data: {
        tenantId, name: body.name, code: body.code, email: body.email,
        phone: body.phone, address: body.address, taxId: body.taxId,
        currency: body.currency ?? 'USD', paymentTerms: body.paymentTerms ?? 30,
        apAccountId: body.apAccountId, notes: body.notes,
        createdBy: userId, updatedBy: userId,
      },
    })
    return reply.code(201).send({ success: true, data: vendor })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const vendor = await prisma.finVendor.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        bills: { where: { deletedAt: null, status: { not: 'void' } }, orderBy: { date: 'desc' }, take: 10 },
        _count: { select: { bills: true, payments: true } },
      },
    })
    if (!vendor) return reply.code(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: vendor })
  })

  app.put('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any
    const allowed = ['name','code','email','phone','address','taxId','currency','paymentTerms','apAccountId','notes','isActive']
    const data: any = { updatedBy: userId }
    for (const k of allowed) if (body[k] !== undefined) data[k] = body[k]
    await prisma.finVendor.updateMany({ where: { id, tenantId, deletedAt: null }, data })
    return reply.send({ success: true })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    await prisma.finVendor.updateMany({ where: { id, tenantId, deletedAt: null }, data: { deletedAt: new Date(), updatedBy: userId } })
    return reply.send({ success: true })
  })
}
