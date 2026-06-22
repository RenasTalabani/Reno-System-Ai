import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function crmCompanyRoutes(app: FastifyInstance) {
  // GET /companies
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { search, status, industry, limit = '50', page = '1' } = req.query as any
    const take = Math.min(parseInt(limit), 200)
    const skip = (parseInt(page) - 1) * take

    const where: any = { tenantId, deletedAt: null }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { domain: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (status) where.status = status
    if (industry) where.industry = industry

    const [companies, total] = await Promise.all([
      prisma.crmCompany.findMany({
        where,
        include: {
          _count: { select: { contacts: true, opportunities: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.crmCompany.count({ where }),
    ])

    return reply.send({ success: true, data: companies, meta: { pagination: { total, page: parseInt(page), limit: take } } })
  })

  // POST /companies
  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const company = await prisma.crmCompany.create({
      data: {
        tenantId,
        name: body.name,
        domain: body.domain,
        industry: body.industry,
        companySize: body.companySize,
        phone: body.phone,
        email: body.email,
        website: body.website,
        linkedInUrl: body.linkedInUrl,
        address: body.address,
        country: body.country,
        city: body.city,
        estimatedRevenue: body.estimatedRevenue,
        currency: body.currency ?? 'USD',
        employeeCount: body.employeeCount,
        status: body.status ?? 'prospect',
        ownerId: body.ownerId ?? userId,
        notes: body.notes,
        createdBy: userId,
        updatedBy: userId,
      },
    })
    return reply.code(201).send({ success: true, data: company })
  })

  // GET /companies/:id
  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as { id: string }
    const company = await prisma.crmCompany.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        contacts: {
          where: { deletedAt: null },
          select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true, contactType: true, status: true },
          orderBy: { firstName: 'asc' },
        },
        opportunities: {
          where: { deletedAt: null },
          include: { stage: true },
          orderBy: { createdAt: 'desc' },
        },
        activities: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 15,
        },
        crmNotes: {
          where: { deletedAt: null },
          orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        },
        contracts: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
        attachments: { where: { deletedAt: null } },
        _count: { select: { contacts: true, opportunities: true } },
      },
    })
    if (!company) return reply.code(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: company })
  })

  // PUT /companies/:id
  app.put('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as { id: string }
    const body = req.body as any
    const allowed = ['name','domain','industry','companySize','phone','email','website','linkedInUrl','address','country','city','estimatedRevenue','currency','employeeCount','status','ownerId','notes','healthScore','customerLifetimeValue','churnRisk']
    const data: any = { updatedBy: userId }
    for (const k of allowed) if (body[k] !== undefined) data[k] = body[k]
    const result = await prisma.crmCompany.updateMany({ where: { id, tenantId, deletedAt: null }, data })
    if (!result.count) return reply.code(404).send({ success: false, error: 'Not found' })
    const company = await prisma.crmCompany.findUnique({ where: { id } })
    return reply.send({ success: true, data: company })
  })

  // DELETE /companies/:id
  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as { id: string }
    await prisma.crmCompany.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date(), updatedBy: userId },
    })
    return reply.send({ success: true })
  })
}
