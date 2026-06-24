import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function mktAiAgentRoutes(app: FastifyInstance) {
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
      prisma.mktAiAgentTemplate.findMany({
        where, orderBy: [{ isFeatured: 'desc' }, { installCount: 'desc' }],
        take: Number(limit), skip: Number(offset),
      }),
      prisma.mktAiAgentTemplate.count({ where }),
    ])
    return reply.send({ success: true, data: items, meta: { total } })
  })

  app.get('/:id', async (req, reply) => {
    const { id } = req.params as any
    const item = await prisma.mktAiAgentTemplate.findFirst({
      where: { id, deletedAt: null },
      include: { reviews: { orderBy: { createdAt: 'desc' }, take: 10 } },
    })
    if (!item) return reply.status(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: item })
  })

  // Install = create BrainAgent from template
  app.post('/:id/install', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { name } = req.body as any

    const template = await prisma.mktAiAgentTemplate.findFirst({ where: { id, deletedAt: null } })
    if (!template) return reply.status(404).send({ success: false, error: 'Template not found' })

    // Store as BrainMemory config entry (agent configs live in brain module)
    const agentConfig = await prisma.brainMemory.create({
      data: {
        tenantId,
        userId,
        type: 'agent_config',
        scope: 'tenant',
        key: `agent:${template.slug}`,
        value: JSON.stringify({
          agentTemplateId: id,
          name: name || template.name,
          systemPrompt: template.systemPrompt,
          capabilities: template.capabilities,
          tools: template.tools,
          modelPreference: template.modelPreference,
        }),
      },
    })

    await Promise.all([
      prisma.mktAiAgentTemplate.update({ where: { id }, data: { installCount: { increment: 1 } } }),
      prisma.mktAuditLog.create({
        data: { tenantId, userId, action: 'install', listingType: 'ai_agent', listingName: template.name },
      }),
    ])

    return reply.status(201).send({ success: true, data: agentConfig })
  })
}
