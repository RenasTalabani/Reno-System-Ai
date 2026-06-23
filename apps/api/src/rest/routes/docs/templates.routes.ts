import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function docTemplateRoutes(app: FastifyInstance) {
  // GET /docs/templates — list templates
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { category, search, page = 1, limit = 20 } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = {
      isActive: true,
      OR: [{ tenantId }, { isSystem: true }],
    }
    if (category) where.category = category
    if (search) where.name = { contains: search, mode: 'insensitive' }

    const [templates, total] = await Promise.all([
      prisma.docTemplate.findMany({ where, orderBy: [{ isSystem: 'desc' }, { usageCount: 'desc' }], skip, take: Number(limit) }),
      prisma.docTemplate.count({ where }),
    ])

    return reply.send({
      success: true,
      data: templates,
      meta: { pagination: { total, page: Number(page), limit: Number(limit) } },
    })
  })

  // GET /docs/templates/categories — distinct categories
  app.get('/categories', async (req, reply) => {
    const { tenantId } = req as any
    const rows = await prisma.docTemplate.findMany({
      where: { isActive: true, OR: [{ tenantId }, { isSystem: true }] },
      select: { category: true },
      distinct: ['category'],
    })
    return reply.send({ success: true, data: rows.map(r => r.category) })
  })

  // POST /docs/templates — create template
  app.post('/', async (req, reply) => {
    const { tenantId } = req as any
    const { name, description, category, fileId, variables, tags } = req.body as any
    if (!name || !category) return reply.code(400).send({ success: false, error: 'name and category required' })

    const template = await prisma.docTemplate.create({
      data: { tenantId, name, description, category, fileId, variables, tags: tags ?? [] },
    })
    return reply.code(201).send({ success: true, data: template })
  })

  // POST /docs/templates/:id/use — increment usage count
  app.post('/:id/use', async (req, reply) => {
    const { id } = req.params as any
    await prisma.docTemplate.update({ where: { id }, data: { usageCount: { increment: 1 } } })
    return reply.send({ success: true, data: { used: true } })
  })
}
