import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function crmOpportunityRoutes(app: FastifyInstance) {
  // GET /opportunities
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { search, status, stageId, pipelineId, ownerId, contactId, companyId, limit = '100', page = '1' } = req.query as any
    const take = Math.min(parseInt(limit), 500)
    const skip = (parseInt(page) - 1) * take

    const where: any = { tenantId, deletedAt: null }
    if (search) where.name = { contains: search, mode: 'insensitive' }
    if (status) where.status = status
    if (stageId) where.stageId = stageId
    if (pipelineId) where.pipelineId = pipelineId
    if (ownerId) where.ownerId = ownerId
    if (contactId) where.contactId = contactId
    if (companyId) where.companyId = companyId

    const [opportunities, total] = await Promise.all([
      prisma.crmOpportunity.findMany({
        where,
        include: {
          stage: true,
          pipeline: { select: { id: true, name: true } },
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
          company: { select: { id: true, name: true } },
          _count: { select: { activities: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.crmOpportunity.count({ where }),
    ])

    return reply.send({ success: true, data: opportunities, meta: { pagination: { total, page: parseInt(page), limit: take } } })
  })

  // GET /opportunities/pipeline-view — Kanban grouped by stage
  app.get('/pipeline-view', async (req, reply) => {
    const { tenantId } = req as any
    const { pipelineId } = req.query as { pipelineId?: string }

    let resolvedPipelineId = pipelineId
    if (!resolvedPipelineId) {
      const defaultPipeline = await prisma.crmPipeline.findFirst({
        where: { tenantId, isDefault: true, deletedAt: null },
        select: { id: true },
      })
      resolvedPipelineId = defaultPipeline?.id
    }

    if (!resolvedPipelineId) return reply.send({ success: true, data: { stages: [], opportunities: [] } })

    const [stages, opportunities] = await Promise.all([
      prisma.crmPipelineStage.findMany({
        where: { pipelineId: resolvedPipelineId, tenantId, deletedAt: null },
        orderBy: { position: 'asc' },
      }),
      prisma.crmOpportunity.findMany({
        where: { tenantId, pipelineId: resolvedPipelineId, deletedAt: null },
        include: {
          stage: true,
          contact: { select: { id: true, firstName: true, lastName: true } },
          company: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const grouped = stages.map(stage => ({
      ...stage,
      opportunities: opportunities.filter(o => o.stageId === stage.id),
      totalValue: opportunities
        .filter(o => o.stageId === stage.id)
        .reduce((sum, o) => sum + Number(o.value), 0),
    }))

    return reply.send({ success: true, data: { stages: grouped, pipelineId: resolvedPipelineId } })
  })

  // POST /opportunities
  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any

    // Resolve pipelineId if not given — use default
    let pipelineId = body.pipelineId
    if (!pipelineId) {
      const def = await prisma.crmPipeline.findFirst({ where: { tenantId, isDefault: true, deletedAt: null }, select: { id: true } })
      pipelineId = def?.id
    }

    // Resolve stageId — first stage if not given
    let stageId = body.stageId
    if (!stageId && pipelineId) {
      const first = await prisma.crmPipelineStage.findFirst({
        where: { pipelineId, tenantId, deletedAt: null },
        orderBy: { position: 'asc' },
        select: { id: true },
      })
      stageId = first?.id
    }

    const opportunity = await prisma.crmOpportunity.create({
      data: {
        tenantId,
        pipelineId,
        stageId,
        name: body.name,
        value: body.value ?? 0,
        currency: body.currency ?? 'USD',
        probability: body.probability ?? 0,
        source: body.source,
        expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : undefined,
        status: body.status ?? 'open',
        description: body.description,
        contactId: body.contactId,
        companyId: body.companyId,
        ownerId: body.ownerId ?? userId,
        tags: body.tags ?? [],
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        stage: true,
        contact: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
      },
    })

    await logAudit(tenantId, userId, 'crm.opportunity.created', 'CrmOpportunity', opportunity.id, { name: opportunity.name })
    return reply.code(201).send({ success: true, data: opportunity })
  })

  // GET /opportunities/:id
  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as { id: string }
    const opportunity = await prisma.crmOpportunity.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        stage: true,
        pipeline: true,
        contact: true,
        company: true,
        activities: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 20 },
        crmNotes: { where: { deletedAt: null }, orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }] },
        contracts: { where: { deletedAt: null } },
        attachments: { where: { deletedAt: null } },
      },
    })
    if (!opportunity) return reply.code(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: opportunity })
  })

  // PUT /opportunities/:id
  app.put('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as { id: string }
    const body = req.body as any

    const current = await prisma.crmOpportunity.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!current) return reply.code(404).send({ success: false, error: 'Not found' })

    const data: any = { updatedBy: userId }
    const allowed = ['name','value','currency','probability','source','expectedCloseDate','status','description','contactId','companyId','ownerId','tags','stageId','lostReason']
    for (const k of allowed) {
      if (body[k] !== undefined) {
        data[k] = k === 'expectedCloseDate' && body[k] ? new Date(body[k]) : body[k]
      }
    }

    // Auto-set actualCloseDate when won/lost
    if (body.status === 'won' || body.status === 'lost') data.actualCloseDate = new Date()

    await prisma.crmOpportunity.update({ where: { id }, data })

    if (body.stageId && body.stageId !== current.stageId) {
      await logAudit(tenantId, userId, 'crm.opportunity.stage_changed', 'CrmOpportunity', id, {
        from: current.stageId,
        to: body.stageId,
      })
    }

    const updated = await prisma.crmOpportunity.findUnique({
      where: { id },
      include: { stage: true, contact: { select: { id: true, firstName: true, lastName: true } }, company: { select: { id: true, name: true } } },
    })
    return reply.send({ success: true, data: updated })
  })

  // DELETE /opportunities/:id
  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as { id: string }
    await prisma.crmOpportunity.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date(), updatedBy: userId },
    })
    return reply.send({ success: true })
  })

  // PATCH /opportunities/:id/move — Move to different stage
  app.patch('/:id/move', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as { id: string }
    const { stageId } = req.body as { stageId: string }
    await prisma.crmOpportunity.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { stageId, updatedBy: userId },
    })
    return reply.send({ success: true })
  })
}

async function logAudit(tenantId: string, userId: string, action: string, entityType: string, entityId: string, meta: any) {
  await prisma.sysAuditLog.create({
    data: { tenantId, userId, action, module: 'crm', entityType, entityId, newValues: meta },
  }).catch(() => {})
}
