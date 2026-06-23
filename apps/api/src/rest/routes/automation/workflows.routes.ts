import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { runWorkflow } from '../../../automation/engine.js'

export async function autoWorkflowRoutes(app: FastifyInstance) {
  // GET /automation/workflows
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { category, triggerType, isEnabled, page = '1', limit = '20' } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = { tenantId, deletedAt: null }
    if (category) where.category = category
    if (triggerType) where.triggerType = triggerType
    if (isEnabled !== undefined) where.isEnabled = isEnabled === 'true'

    const [items, total] = await Promise.all([
      prisma.autoWorkflow.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
        select: {
          id: true, name: true, description: true, slug: true, category: true, tags: true,
          triggerType: true, triggerConfig: true, isEnabled: true, requiresApproval: true,
          totalRuns: true, successRuns: true, failedRuns: true, lastRunAt: true, lastRunStatus: true,
          nextRunAt: true, brainGenerated: true, createdAt: true, updatedAt: true, createdBy: true,
          _count: { select: { executions: true } },
        },
      }),
      prisma.autoWorkflow.count({ where }),
    ])

    return reply.send({ success: true, data: items, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  // POST /automation/workflows
  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any

    const slug = body.slug ?? `${body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`

    const workflow = await prisma.autoWorkflow.create({
      data: {
        tenantId,
        name: body.name,
        description: body.description,
        slug,
        category: body.category,
        tags: body.tags ?? [],
        triggerType: body.triggerType,
        triggerConfig: body.triggerConfig ?? {},
        steps: body.steps ?? [],
        isEnabled: body.isEnabled ?? false,
        requiresApproval: body.requiresApproval ?? false,
        maxRetries: body.maxRetries ?? 3,
        retryDelayMs: body.retryDelayMs ?? 5000,
        timeoutMs: body.timeoutMs ?? 60000,
        nextRunAt: body.triggerType === 'scheduled' && body.triggerConfig?.nextRunAt
          ? new Date(body.triggerConfig.nextRunAt)
          : undefined,
        createdBy: userId,
        updatedBy: userId,
      },
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'create', module: 'automation', entityType: 'AutoWorkflow', entityId: workflow.id, newValues: { name: workflow.name } },
    })

    return reply.code(201).send({ success: true, data: workflow })
  })

  // GET /automation/workflows/:id
  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any

    const workflow = await prisma.autoWorkflow.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        _count: { select: { executions: true } },
        webhooks: { where: { isActive: true }, select: { id: true, token: true, name: true, lastCalledAt: true, callCount: true } },
      },
    })
    if (!workflow) return reply.code(404).send({ success: false, error: 'Workflow not found' })

    return reply.send({ success: true, data: workflow })
  })

  // PATCH /automation/workflows/:id
  app.patch('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any

    const workflow = await prisma.autoWorkflow.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: {
        ...body,
        updatedBy: userId,
        updatedAt: new Date(),
      },
    })
    if (workflow.count === 0) return reply.code(404).send({ success: false, error: 'Workflow not found' })

    const updated = await prisma.autoWorkflow.findUnique({ where: { id } })
    return reply.send({ success: true, data: updated })
  })

  // DELETE /automation/workflows/:id
  app.delete('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any

    await prisma.autoWorkflow.updateMany({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isEnabled: false },
    })

    return reply.send({ success: true })
  })

  // POST /automation/workflows/:id/toggle — enable/disable
  app.post('/:id/toggle', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any

    const workflow = await prisma.autoWorkflow.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!workflow) return reply.code(404).send({ success: false, error: 'Workflow not found' })

    const updated = await prisma.autoWorkflow.update({
      where: { id },
      data: { isEnabled: !workflow.isEnabled, updatedBy: userId },
    })

    return reply.send({ success: true, data: { isEnabled: updated.isEnabled } })
  })

  // POST /automation/workflows/:id/run — manual trigger
  app.post('/:id/run', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { payload } = req.body as any ?? {}

    const workflow = await prisma.autoWorkflow.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!workflow) return reply.code(404).send({ success: false, error: 'Workflow not found' })

    const result = await runWorkflow(id, 'manual', userId, payload ?? {}, tenantId)

    return reply.send({ success: true, data: result })
  })
}
