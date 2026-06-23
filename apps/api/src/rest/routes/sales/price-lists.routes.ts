import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function salesPriceListRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const priceLists = await prisma.salesPriceList.findMany({ where: { tenantId, deletedAt: null }, orderBy: [{ isDefault: 'desc' }, { name: 'asc' }] })
    return reply.send({ success: true, data: priceLists })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const priceList = await prisma.salesPriceList.create({
      data: {
        tenantId, name: body.name, description: body.description,
        currency: body.currency ?? 'USD', discount: body.discount ?? 0,
        isDefault: body.isDefault ?? false,
        validFrom: body.validFrom ? new Date(body.validFrom) : undefined,
        validTo: body.validTo ? new Date(body.validTo) : undefined,
        createdBy: userId, updatedBy: userId,
      },
    })
    return reply.code(201).send({ success: true, data: priceList })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const priceList = await prisma.salesPriceList.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!priceList) return reply.code(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: priceList })
  })

  app.put('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any
    const allowed = ['name','description','currency','discount','isDefault','validFrom','validTo']
    const data: any = { updatedBy: userId }
    for (const k of allowed) {
      if (body[k] !== undefined) {
        data[k] = (k === 'validFrom' || k === 'validTo') && body[k] ? new Date(body[k]) : body[k]
      }
    }
    await prisma.salesPriceList.updateMany({ where: { id, tenantId, deletedAt: null }, data })
    return reply.send({ success: true })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    await prisma.salesPriceList.updateMany({ where: { id, tenantId, deletedAt: null }, data: { deletedAt: new Date(), updatedBy: userId } })
    return reply.send({ success: true })
  })
}
