import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function mktWorkflowTemplateRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { category, featured, search, limit = 20, offset = 0 } = req.query as any
    const where: any = { deletedAt: null, isActive: true, status: 'approved' }
    if (category) where.category = category
    if (featured === 'true') where.isFeatured = true
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ]
    const [items, total] = await Promise.all([
      prisma.mktWorkflowTemplate.findMany({
        where, orderBy: [{ isFeatured: 'desc' }, { installCount: 'desc' }],
        take: Number(limit), skip: Number(offset),
      }),
      prisma.mktWorkflowTemplate.count({ where }),
    ])
    return reply.send({ success: true, data: items, meta: { total } })
  })

  app.get('/:id', async (req, reply) => {
    const { id } = req.params as any
    const item = await prisma.mktWorkflowTemplate.findFirst({
      where: { id, deletedAt: null },
      include: { reviews: { orderBy: { createdAt: 'desc' }, take: 10 } },
    })
    if (!item) return reply.status(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: item })
  })

  // Install = clone workflow definition into tenant's automation
  app.post('/:id/install', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any

    const template = await prisma.mktWorkflowTemplate.findFirst({ where: { id, deletedAt: null } })
    if (!template) return reply.status(404).send({ success: false, error: 'Template not found' })

    const slug = `${template.slug}-${Date.now()}`
    const workflow = await prisma.autoWorkflow.create({
      data: {
        tenantId,
        slug,
        name: template.name,
        description: template.description,
        triggerType: template.triggerType,
        triggerConfig: (template.definition as any).triggerConfig ?? {},
        steps: (template.definition as any).steps ?? [],
        isActive: false,
        createdBy: userId,
        updatedBy: userId,
      },
    })

    await Promise.all([
      prisma.mktWorkflowTemplate.update({ where: { id }, data: { installCount: { increment: 1 } } }),
      prisma.mktAuditLog.create({
        data: { tenantId, userId, action: 'install', listingType: 'workflow_template', listingName: template.name },
      }),
    ])

    return reply.status(201).send({ success: true, data: workflow })
  })
}
