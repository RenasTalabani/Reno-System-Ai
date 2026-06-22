import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function crmContactRoutes(app: FastifyInstance) {
  // GET /contacts
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { search, contactType, status, companyId, ownerId, limit = '50', page = '1' } = req.query as any
    const take = Math.min(parseInt(limit), 200)
    const skip = (parseInt(page) - 1) * take

    const where: any = { tenantId, deletedAt: null }
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (contactType) where.contactType = contactType
    if (status) where.status = status
    if (companyId) where.companyId = companyId
    if (ownerId) where.ownerId = ownerId

    const [contacts, total] = await Promise.all([
      prisma.crmContact.findMany({
        where,
        include: {
          company: { select: { id: true, name: true, industry: true } },
          _count: { select: { opportunities: true, activities: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.crmContact.count({ where }),
    ])

    return reply.send({ success: true, data: contacts, meta: { pagination: { total, page: parseInt(page), limit: take } } })
  })

  // POST /contacts
  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const contact = await prisma.crmContact.create({
      data: {
        tenantId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        mobile: body.mobile,
        jobTitle: body.jobTitle,
        department: body.department,
        linkedInUrl: body.linkedInUrl,
        contactType: body.contactType ?? 'lead',
        source: body.source,
        status: body.status ?? 'new',
        companyId: body.companyId,
        ownerId: body.ownerId ?? userId,
        notes: body.notes,
        whatsappNumber: body.whatsappNumber,
        preferredChannel: body.preferredChannel,
        timezone: body.timezone,
        language: body.language,
        address: body.address,
        tags: body.tags ?? [],
        createdBy: userId,
        updatedBy: userId,
      },
      include: { company: { select: { id: true, name: true } } },
    })

    await logAudit(tenantId, userId, 'crm.contact.created', 'CrmContact', contact.id, { name: `${contact.firstName} ${contact.lastName}` })
    return reply.code(201).send({ success: true, data: contact })
  })

  // GET /contacts/:id
  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as { id: string }
    const contact = await prisma.crmContact.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        company: true,
        opportunities: {
          where: { deletedAt: null },
          include: { stage: true },
          orderBy: { createdAt: 'desc' },
        },
        activities: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        crmNotes: {
          where: { deletedAt: null },
          orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        },
        emailLogs: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        attachments: { where: { deletedAt: null } },
        _count: { select: { opportunities: true, activities: true } },
      },
    })
    if (!contact) return reply.code(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: contact })
  })

  // PUT /contacts/:id
  app.put('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as { id: string }
    const body = req.body as any
    const allowed = ['firstName','lastName','email','phone','mobile','jobTitle','department','linkedInUrl','contactType','source','status','companyId','ownerId','notes','whatsappNumber','preferredChannel','timezone','language','address','tags','doNotContact','doNotEmail','leadScore','nextFollowUpAt']
    const data: any = { updatedBy: userId }
    for (const k of allowed) if (body[k] !== undefined) data[k] = body[k]
    const result = await prisma.crmContact.updateMany({ where: { id, tenantId, deletedAt: null }, data })
    if (!result.count) return reply.code(404).send({ success: false, error: 'Not found' })
    const contact = await prisma.crmContact.findUnique({ where: { id } })
    return reply.send({ success: true, data: contact })
  })

  // DELETE /contacts/:id
  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as { id: string }
    await prisma.crmContact.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date(), updatedBy: userId },
    })
    return reply.send({ success: true })
  })

  // PATCH /contacts/:id/convert — Convert lead to customer
  app.patch('/:id/convert', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as { id: string }
    await prisma.crmContact.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { contactType: 'customer', status: 'active', convertedAt: new Date(), updatedBy: userId },
    })
    return reply.send({ success: true })
  })

  // GET /contacts/:id/timeline
  app.get('/:id/timeline', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as { id: string }
    const [activities, notes, emailLogs, opportunities] = await Promise.all([
      prisma.crmActivity.findMany({
        where: { tenantId, contactId: id, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.crmNote.findMany({
        where: { tenantId, contactId: id, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.crmEmailLog.findMany({
        where: { tenantId, contactId: id, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.crmOpportunity.findMany({
        where: { tenantId, contactId: id, deletedAt: null },
        include: { stage: true },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const timeline = [
      ...activities.map(a => ({ ...a, _type: 'activity' })),
      ...notes.map(n => ({ ...n, _type: 'note' })),
      ...emailLogs.map(e => ({ ...e, _type: 'email' })),
      ...opportunities.map(o => ({ ...o, _type: 'opportunity' })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return reply.send({ success: true, data: timeline })
  })
}

async function logAudit(tenantId: string, userId: string, action: string, entityType: string, entityId: string, meta: any) {
  await prisma.sysAuditLog.create({
    data: {
      tenantId,
      userId,
      action,
      module: 'crm',
      entityType,
      entityId,
      newValues: meta,
    },
  }).catch(() => {})
}
