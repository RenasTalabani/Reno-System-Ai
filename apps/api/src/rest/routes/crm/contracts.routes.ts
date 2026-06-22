import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function crmContractRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { status, companyId, opportunityId, limit = '50', page = '1' } = req.query as any
    const take = Math.min(parseInt(limit), 200)
    const skip = (parseInt(page) - 1) * take

    const where: any = { tenantId, deletedAt: null }
    if (status) where.status = status
    if (companyId) where.companyId = companyId
    if (opportunityId) where.opportunityId = opportunityId

    const [contracts, total] = await Promise.all([
      prisma.crmContract.findMany({
        where,
        include: {
          company: { select: { id: true, name: true } },
          opportunity: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.crmContract.count({ where }),
    ])

    return reply.send({ success: true, data: contracts, meta: { pagination: { total, page: parseInt(page), limit: take } } })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any

    // Auto-generate contract number
    const count = await prisma.crmContract.count({ where: { tenantId } })
    const contractNumber = body.contractNumber ?? `CNT-${String(count + 1).padStart(4, '0')}`

    const contract = await prisma.crmContract.create({
      data: {
        tenantId,
        title: body.title,
        contractNumber,
        value: body.value ?? 0,
        currency: body.currency ?? 'USD',
        status: body.status ?? 'draft',
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        companyId: body.companyId,
        contactId: body.contactId,
        opportunityId: body.opportunityId,
        ownerId: body.ownerId ?? userId,
        terms: body.terms,
        notes: body.notes,
        createdBy: userId,
        updatedBy: userId,
      },
    })
    return reply.code(201).send({ success: true, data: contract })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as { id: string }
    const contract = await prisma.crmContract.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        company: true,
        opportunity: true,
      },
    })
    if (!contract) return reply.code(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: contract })
  })

  app.put('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as { id: string }
    const body = req.body as any
    const allowed = ['title','value','currency','status','startDate','endDate','signedAt','signedBy','documentUrl','terms','notes','ownerId']
    const data: any = { updatedBy: userId }
    for (const k of allowed) {
      if (body[k] !== undefined) {
        data[k] = (k === 'startDate' || k === 'endDate' || k === 'signedAt') && body[k] ? new Date(body[k]) : body[k]
      }
    }
    await prisma.crmContract.updateMany({ where: { id, tenantId, deletedAt: null }, data })
    return reply.send({ success: true })
  })

  // PATCH /contracts/:id/sign
  app.patch('/:id/sign', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as { id: string }
    const { signedBy } = req.body as any
    await prisma.crmContract.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { status: 'signed', signedAt: new Date(), signedBy, updatedBy: userId },
    })
    return reply.send({ success: true })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as { id: string }
    await prisma.crmContract.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date(), updatedBy: userId },
    })
    return reply.send({ success: true })
  })
}
