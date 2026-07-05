import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'

export async function brainTemplateRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // GET /brain/templates
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { category, agentId } = req.query as any

    const where: any = {
      OR: [{ tenantId }, { isSystem: true }],
      isActive: true,
    }
    if (category) where.category = category
    if (agentId) where.agentId = agentId

    const templates = await prisma.brainPromptTemplate.findMany({
      where,
      include: { agent: { select: { name: true, slug: true } } },
      orderBy: [{ isSystem: 'desc' }, { usageCount: 'desc' }],
    })

    return reply.send({ success: true, data: templates })
  })

  // POST /brain/templates
  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any

    const slug = body.slug ?? `${body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`

    const template = await prisma.brainPromptTemplate.create({
      data: {
        tenantId,
        agentId: body.agentId,
        name: body.name,
        slug,
        description: body.description,
        template: body.template,
        variables: body.variables,
        category: body.category,
        createdBy: userId,
      },
    })

    return reply.code(201).send({ success: true, data: template })
  })

  // POST /brain/templates/:id/use — increment usage count
  app.post('/:id/use', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any

    const template = await prisma.brainPromptTemplate.findFirst({
      where: { id, OR: [{ tenantId }, { isSystem: true }] },
    })
    if (!template) return reply.code(404).send({ success: false, error: 'Template not found' })

    await prisma.brainPromptTemplate.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    })

    // Render template with variables
    const vars = (req.body as any)?.variables ?? {}
    let rendered = template.template
    for (const [key, val] of Object.entries(vars)) {
      rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(val))
    }

    return reply.send({ success: true, data: { rendered, template } })
  })

  // DELETE /brain/templates/:id
  app.delete('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any

    await prisma.brainPromptTemplate.updateMany({
      where: { id, tenantId, isSystem: false },
      data: { isActive: false },
    })

    return reply.send({ success: true })
  })
}
