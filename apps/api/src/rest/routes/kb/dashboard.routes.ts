import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function kbDashboardRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any

    const [totalArticles, publishedArticles, totalCategories, topArticles, recentArticles] = await Promise.all([
      prisma.kbArticle.count({ where: { tenantId, deletedAt: null } }),
      prisma.kbArticle.count({ where: { tenantId, deletedAt: null, status: 'published' } }),
      prisma.kbCategory.count({ where: { tenantId, deletedAt: null } }),
      prisma.kbArticle.findMany({
        where: { tenantId, deletedAt: null, status: 'published' },
        orderBy: { viewCount: 'desc' },
        take: 5,
        select: { id: true, title: true, slug: true, viewCount: true, helpfulCount: true, category: { select: { name: true } } },
      }),
      prisma.kbArticle.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        take: 8,
        select: { id: true, title: true, slug: true, status: true, updatedAt: true, category: { select: { name: true } } },
      }),
    ])

    const totalViewsResult = await prisma.kbArticle.aggregate({
      where: { tenantId, deletedAt: null },
      _sum: { viewCount: true },
    })

    return reply.send({
      success: true,
      data: {
        stats: {
          totalArticles,
          publishedArticles,
          draftArticles: totalArticles - publishedArticles,
          totalCategories,
          totalViews: totalViewsResult._sum.viewCount ?? 0,
        },
        topArticles,
        recentArticles,
      },
    })
  })
}
