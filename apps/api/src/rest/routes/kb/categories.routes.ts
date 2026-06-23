import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function kbCategoryRoutes(app: FastifyInstance) {
  // GET /kb/categories — list categories (tree)
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any

    const categories = await prisma.kbCategory.findMany({
      where: { tenantId, deletedAt: null, isActive: true, parentId: null },
      include: {
        children: {
          where: { deletedAt: null, isActive: true },
          include: { _count: { select: { articles: true } } },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
        _count: { select: { articles: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })

    return reply.send({ success: true, data: categories })
  })

  // POST /kb/categories — create category
  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { name, description, parentId, icon, color, slug, isPublic, sortOrder } = req.body as any
    if (!name) return reply.code(400).send({ success: false, error: 'name required' })

    const resolvedSlug = slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    const category = await prisma.kbCategory.create({
      data: {
        tenantId,
        parentId: parentId || null,
        name,
        description,
        slug: resolvedSlug,
        icon,
        color,
        isPublic: isPublic !== false,
        sortOrder: Number(sortOrder ?? 0),
        createdBy: userId,
      },
    })

    return reply.code(201).send({ success: true, data: category })
  })

  // GET /kb/categories/:id — category detail with articles
  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any

    const category = await prisma.kbCategory.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        children: { where: { deletedAt: null }, orderBy: [{ sortOrder: 'asc' }] },
        parent: { select: { id: true, name: true, slug: true } },
        _count: { select: { articles: true } },
      },
    })
    if (!category) return reply.code(404).send({ success: false, error: 'Category not found' })

    const articles = await prisma.kbArticle.findMany({
      where: { categoryId: id, tenantId, deletedAt: null, status: 'published' },
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
      take: 20,
      select: { id: true, title: true, slug: true, excerpt: true, tags: true, viewCount: true, updatedAt: true, isPinned: true },
    })

    return reply.send({ success: true, data: { ...category, articles } })
  })

  // PATCH /kb/categories/:id — update
  app.patch('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { name, description, icon, color, isPublic, sortOrder } = req.body as any

    const existing = await prisma.kbCategory.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Category not found' })

    const category = await prisma.kbCategory.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        description,
        icon,
        color,
        isPublic: isPublic !== undefined ? Boolean(isPublic) : existing.isPublic,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : existing.sortOrder,
        updatedBy: userId,
      },
    })

    return reply.send({ success: true, data: category })
  })

  // DELETE /kb/categories/:id — soft delete
  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any

    const category = await prisma.kbCategory.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!category) return reply.code(404).send({ success: false, error: 'Category not found' })

    await prisma.kbCategory.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: userId },
    })

    return reply.send({ success: true, data: { deleted: true } })
  })
}
