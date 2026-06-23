import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function autoTemplateRoutes(app: FastifyInstance) {
  // GET /automation/templates
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { category } = req.query as any

    const where: any = {
      isActive: true,
      OR: [{ tenantId }, { isSystem: true }],
    }
    if (category) where.category = category

    const templates = await prisma.autoTemplate.findMany({
      where,
      orderBy: [{ isSystem: 'desc' }, { usageCount: 'desc' }],
    })

    return reply.send({ success: true, data: templates })
  })

  // POST /automation/templates/:id/install — create workflow from template
  app.post('/:id/install', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { name, description } = req.body as any ?? {}

    const template = await prisma.autoTemplate.findFirst({
      where: { id, isActive: true, OR: [{ tenantId }, { isSystem: true }] },
    })
    if (!template) return reply.code(404).send({ success: false, error: 'Template not found' })

    const def = template.definition as any
    const slug = `${(name ?? template.name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`

    const workflow = await prisma.autoWorkflow.create({
      data: {
        tenantId,
        name: name ?? template.name,
        description: description ?? template.description,
        slug,
        category: template.category,
        tags: template.tags,
        triggerType: template.triggerType,
        triggerConfig: def.triggerConfig ?? {},
        steps: def.steps ?? [],
        isEnabled: false,
        requiresApproval: def.requiresApproval ?? false,
        maxRetries: def.maxRetries ?? 3,
        retryDelayMs: 5000,
        timeoutMs: 60000,
        createdBy: userId,
        updatedBy: userId,
      },
    })

    await prisma.autoTemplate.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    })

    return reply.code(201).send({ success: true, data: workflow })
  })

  // POST /automation/templates — create custom template
  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any

    const template = await prisma.autoTemplate.create({
      data: {
        tenantId,
        isSystem: false,
        name: body.name,
        description: body.description,
        category: body.category,
        tags: body.tags ?? [],
        icon: body.icon,
        useCase: body.useCase,
        triggerType: body.triggerType,
        definition: body.definition ?? {},
        isPublic: body.isPublic ?? false,
      },
    })

    return reply.code(201).send({ success: true, data: template })
  })
}
