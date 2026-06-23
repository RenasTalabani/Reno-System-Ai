import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function salesTaxRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const taxes = await prisma.salesTax.findMany({ where: { tenantId, deletedAt: null }, orderBy: { name: 'asc' } })
    return reply.send({ success: true, data: taxes })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const tax = await prisma.salesTax.create({
      data: {
        tenantId, name: body.name, code: body.code, rate: body.rate ?? 0,
        taxType: body.taxType ?? 'percentage', isCompound: body.isCompound ?? false,
        isDefault: body.isDefault ?? false, scope: body.scope ?? 'global',
        country: body.country, region: body.region,
        createdBy: userId, updatedBy: userId,
      },
    })
    return reply.code(201).send({ success: true, data: tax })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const tax = await prisma.salesTax.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!tax) return reply.code(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: tax })
  })

  app.put('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any
    const allowed = ['name','code','rate','taxType','isCompound','isDefault','scope','country','region']
    const data: any = { updatedBy: userId }
    for (const k of allowed) if (body[k] !== undefined) data[k] = body[k]
    await prisma.salesTax.updateMany({ where: { id, tenantId, deletedAt: null }, data })
    return reply.send({ success: true })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    await prisma.salesTax.updateMany({ where: { id, tenantId, deletedAt: null }, data: { deletedAt: new Date(), updatedBy: userId } })
    return reply.send({ success: true })
  })
}
