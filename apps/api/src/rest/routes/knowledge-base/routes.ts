import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function knowledgeBaseRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/categories', async (req) => {
    const { tenantId } = req
    const cats = await prisma.kbCategory.findMany({
      where: { tenantId, isActive: true },
      include: { _count: { select: { articles: true } } },
      orderBy: { sortOrder: 'asc' },
    })
    return { success: true, data: cats }
  })

  app.post('/categories', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const cat = await prisma.kbCategory.create({ data: { tenantId, createdBy: userId, ...data } as never })
    return { success: true, data: cat }
  })

  app.get('/articles', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId, deletedAt: null }
    if (q.status) where.status = q.status
    if (q.categoryId) where.categoryId = q.categoryId
    if (q.search) where.title = { contains: q.search, mode: 'insensitive' }
    const articles = await prisma.kbArticle.findMany({
      where: where as never,
      include: { category: { select: { name: true } } },
      orderBy: { viewCount: 'desc' },
      take: 50,
    })
    return { success: true, data: articles }
  })

  app.post('/articles', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const article = await prisma.kbArticle.create({ data: { tenantId, createdBy: userId, ...data } as never })
    return { success: true, data: article }
  })

  app.get('/articles/:id', async (req) => {
    const { id } = req.params as { id: string }
    const article = await prisma.kbArticle.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    })
    return { success: true, data: article }
  })

  app.patch('/articles/:id', async (req) => {
    const { userId } = req
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const article = await prisma.kbArticle.update({ where: { id }, data: { ...data, updatedBy: userId } as never })
    return { success: true, data: article }
  })

  app.post('/articles/:id/feedback', async (req) => {
    const { id } = req.params as { id: string }
    const { helpful } = req.body as { helpful: boolean }
    const article = await prisma.kbArticle.update({
      where: { id },
      data: helpful ? { helpfulCount: { increment: 1 } } : {},
    })
    return { success: true, data: article }
  })

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [categories, published, totalViews] = await Promise.all([
      prisma.kbCategory.count({ where: { tenantId, isActive: true } }),
      prisma.kbArticle.count({ where: { tenantId, status: 'published', deletedAt: null } }),
      prisma.kbArticle.aggregate({ where: { tenantId, deletedAt: null }, _sum: { viewCount: true } }),
    ])
    return { success: true, data: { categories, publishedArticles: published, totalViews: totalViews._sum.viewCount ?? 0 } }
  })
}
