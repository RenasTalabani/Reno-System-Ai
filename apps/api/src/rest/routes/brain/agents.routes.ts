import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'

export async function brainAgentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // GET /brain/agents
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any

    const agents = await prisma.brainAgent.findMany({
      where: { OR: [{ tenantId }, { isSystem: true }], isActive: true },
      include: { _count: { select: { conversations: true } }, permissions: true },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    })

    return reply.send({ success: true, data: agents })
  })

  // GET /brain/agents/:slug
  app.get('/:slug', async (req, reply) => {
    const { tenantId } = req as any
    const { slug } = req.params as any

    const agent = await prisma.brainAgent.findFirst({
      where: { slug, OR: [{ tenantId }, { isSystem: true }], isActive: true },
      include: { permissions: true, _count: { select: { conversations: true } } },
    })

    if (!agent) return reply.code(404).send({ success: false, error: 'Agent not found' })
    return reply.send({ success: true, data: agent })
  })

  // POST /brain/agents — create custom agent
  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any

    const slug = body.slug ?? `${body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`

    const agent = await prisma.brainAgent.create({
      data: {
        tenantId,
        slug,
        name: body.name,
        title: body.title ?? body.name,
        description: body.description,
        systemPrompt: body.systemPrompt,
        persona: body.persona,
        modules: body.modules ?? [],
        capabilities: body.capabilities ?? [],
        model: body.model ?? 'claude-sonnet-4-6',
        provider: body.provider ?? 'anthropic',
        maxTokens: body.maxTokens ?? 4096,
        temperature: body.temperature ?? 0.7,
        iconName: body.iconName,
        color: body.color,
        requiresApproval: body.requiresApproval ?? false,
        createdBy: userId,
      },
    })

    // Create permissions for specified modules
    if (Array.isArray(body.modules)) {
      await prisma.brainPermission.createMany({
        data: body.modules.map((m: string) => ({
          tenantId,
          agentId: agent.id,
          module: m,
          canRead: true,
          canSuggest: true,
          canAct: false,
        })),
      })
    }

    return reply.code(201).send({ success: true, data: agent })
  })

  // PATCH /brain/agents/:slug
  app.patch('/:slug', async (req, reply) => {
    const { tenantId } = req as any
    const { slug } = req.params as any
    const body = req.body as any

    const agent = await prisma.brainAgent.findFirst({
      where: { slug, tenantId, isSystem: false },
    })
    if (!agent) return reply.code(404).send({ success: false, error: 'Agent not found or is system agent' })

    const updated = await prisma.brainAgent.update({
      where: { id: agent.id },
      data: {
        name: body.name ?? agent.name,
        description: body.description !== undefined ? body.description : agent.description,
        systemPrompt: body.systemPrompt !== undefined ? body.systemPrompt : agent.systemPrompt,
        persona: body.persona !== undefined ? body.persona : agent.persona,
        model: body.model ?? agent.model,
        maxTokens: body.maxTokens ?? agent.maxTokens,
        temperature: body.temperature ?? agent.temperature,
        isActive: body.isActive !== undefined ? body.isActive : agent.isActive,
      },
    })

    return reply.send({ success: true, data: updated })
  })
}
