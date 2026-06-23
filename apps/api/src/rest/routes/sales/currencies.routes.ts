import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function salesCurrencyRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const currencies = await prisma.salesCurrency.findMany({ where: { tenantId, deletedAt: null }, orderBy: [{ isBase: 'desc' }, { code: 'asc' }] })
    return reply.send({ success: true, data: currencies })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const currency = await prisma.salesCurrency.create({
      data: {
        tenantId, code: body.code, name: body.name, symbol: body.symbol ?? body.code,
        exchangeRate: body.exchangeRate ?? 1, isBase: body.isBase ?? false,
        decimalPlaces: body.decimalPlaces ?? 2, isActive: true,
        createdBy: userId, updatedBy: userId,
      },
    })
    return reply.code(201).send({ success: true, data: currency })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const currency = await prisma.salesCurrency.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!currency) return reply.code(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: currency })
  })

  app.put('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any
    const allowed = ['name','symbol','exchangeRate','isActive','decimalPlaces']
    const data: any = { updatedBy: userId }
    for (const k of allowed) if (body[k] !== undefined) data[k] = body[k]
    await prisma.salesCurrency.updateMany({ where: { id, tenantId, deletedAt: null }, data })
    return reply.send({ success: true })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    await prisma.salesCurrency.updateMany({ where: { id, tenantId, deletedAt: null }, data: { deletedAt: new Date(), updatedBy: userId } })
    return reply.send({ success: true })
  })
}
