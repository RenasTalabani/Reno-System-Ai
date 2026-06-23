import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function kbArticleRoutes(app: FastifyInstance) {
  // GET /kb/articles — list articles
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { categoryId, status, search, tags, page = 1, limit = 20 } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = { tenantId, deletedAt: null, isActive: true }
    if (categoryId) where.categoryId = categoryId
    if (status) where.status = status
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [articles, total] = await Promise.all([
      prisma.kbArticle.findMany({
        where,
        select: {
          id: true, title: true, slug: true, excerpt: true, tags: true, status: true,
          isPinned: true, isPublic: true, viewCount: true, helpfulCount: true,
          publishedAt: true, updatedAt: true, createdAt: true,
          category: { select: { id: true, name: true, slug: true, color: true } },
        },
        orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
        skip,
        take: Number(limit),
      }),
      prisma.kbArticle.count({ where }),
    ])

    return reply.send({
      success: true,
      data: articles,
      meta: { pagination: { total, page: Number(page), limit: Number(limit) } },
    })
  })

  // GET /kb/articles/search — search articles
  app.get('/search', async (req, reply) => {
    const { tenantId } = req as any
    const { q, limit = 10 } = req.query as any
    if (!q) return reply.send({ success: true, data: [] })

    const articles = await prisma.kbArticle.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: 'published',
        OR: [
          { title: { contains: String(q), mode: 'insensitive' } },
          { excerpt: { contains: String(q), mode: 'insensitive' } },
          { content: { contains: String(q), mode: 'insensitive' } },
        ],
      },
      select: { id: true, title: true, slug: true, excerpt: true, category: { select: { name: true, color: true } } },
      orderBy: { viewCount: 'desc' },
      take: Number(limit),
    })

    return reply.send({ success: true, data: articles })
  })

  // POST /kb/articles — create article
  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { title, content, excerpt, categoryId, tags, isPublic, isPinned, slug } = req.body as any
    if (!title || !content) return reply.code(400).send({ success: false, error: 'title and content required' })

    const resolvedSlug = slug ?? `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now()}`

    const article = await prisma.kbArticle.create({
      data: {
        tenantId,
        categoryId: categoryId || null,
        title,
        slug: resolvedSlug,
        content,
        excerpt: excerpt ?? content.slice(0, 200),
        tags: tags ?? [],
        status: 'draft',
        isPublic: Boolean(isPublic),
        isPinned: Boolean(isPinned),
        createdBy: userId,
      },
    })

    // Save initial version
    await prisma.kbArticleVersion.create({
      data: { tenantId, articleId: article.id, version: 1, title, content, comment: 'Initial version', createdBy: userId },
    })

    return reply.code(201).send({ success: true, data: article })
  })

  // GET /kb/articles/:id — view article
  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any

    const article = await prisma.kbArticle.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        category: { select: { id: true, name: true, slug: true, color: true } },
        _count: { select: { versions: true } },
      },
    })
    if (!article) return reply.code(404).send({ success: false, error: 'Article not found' })

    await prisma.kbArticle.update({ where: { id }, data: { viewCount: { increment: 1 } } })

    return reply.send({ success: true, data: article })
  })

  // PATCH /kb/articles/:id — update article
  app.patch('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { title, content, excerpt, categoryId, tags, isPublic, isPinned } = req.body as any

    const existing = await prisma.kbArticle.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Article not found' })

    const newVersion = existing.currentVersion + 1

    const [article] = await Promise.all([
      prisma.kbArticle.update({
        where: { id },
        data: {
          title: title ?? existing.title,
          content: content ?? existing.content,
          excerpt: excerpt ?? existing.excerpt,
          categoryId: categoryId !== undefined ? (categoryId || null) : existing.categoryId,
          tags: tags ?? existing.tags,
          isPublic: isPublic !== undefined ? Boolean(isPublic) : existing.isPublic,
          isPinned: isPinned !== undefined ? Boolean(isPinned) : existing.isPinned,
          currentVersion: newVersion,
          updatedBy: userId,
        },
      }),
      content && prisma.kbArticleVersion.create({
        data: {
          tenantId,
          articleId: id,
          version: newVersion,
          title: title ?? existing.title,
          content,
          createdBy: userId,
        },
      }),
    ])

    return reply.send({ success: true, data: article })
  })

  // POST /kb/articles/:id/publish — publish article
  app.post('/:id/publish', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any

    const article = await prisma.kbArticle.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!article) return reply.code(404).send({ success: false, error: 'Article not found' })

    await prisma.kbArticle.update({
      where: { id },
      data: { status: 'published', publishedAt: article.publishedAt ?? new Date(), updatedBy: userId },
    })

    return reply.send({ success: true, data: { published: true } })
  })

  // POST /kb/articles/:id/archive — archive article
  app.post('/:id/archive', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any

    await prisma.kbArticle.update({
      where: { id },
      data: { status: 'archived', updatedBy: userId },
    })

    return reply.send({ success: true, data: { archived: true } })
  })

  // POST /kb/articles/:id/helpful — mark helpful
  app.post('/:id/helpful', async (req, reply) => {
    const { id } = req.params as any
    await prisma.kbArticle.update({ where: { id }, data: { helpfulCount: { increment: 1 } } })
    return reply.send({ success: true, data: { counted: true } })
  })

  // GET /kb/articles/:id/versions — version history
  app.get('/:id/versions', async (req, reply) => {
    const { id } = req.params as any
    const versions = await prisma.kbArticleVersion.findMany({
      where: { articleId: id },
      orderBy: { version: 'desc' },
      select: { id: true, version: true, title: true, comment: true, createdAt: true, createdBy: true },
    })
    return reply.send({ success: true, data: versions })
  })

  // DELETE /kb/articles/:id — soft delete
  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any

    const article = await prisma.kbArticle.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!article) return reply.code(404).send({ success: false, error: 'Article not found' })

    await prisma.kbArticle.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: userId },
    })

    return reply.send({ success: true, data: { deleted: true } })
  })
}
