import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function docDashboardRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any

    const [totalFiles, totalFolders, recentFiles, auditLogs, mimeBreakdown] = await Promise.all([
      prisma.docFile.count({ where: { tenantId, deletedAt: null } }),
      prisma.docFolder.count({ where: { tenantId, deletedAt: null } }),
      prisma.docFile.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        take: 8,
        select: { id: true, name: true, mimeType: true, sizeBytes: true, updatedAt: true, folder: { select: { name: true } } },
      }),
      prisma.docAuditLog.findMany({
        where: { tenantId },
        orderBy: { occurredAt: 'desc' },
        take: 10,
        select: { id: true, action: true, entityName: true, entityType: true, occurredAt: true },
      }),
      prisma.docFile.groupBy({
        by: ['mimeType'],
        where: { tenantId, deletedAt: null },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 8,
      }),
    ])

    const totalSizeResult = await prisma.docFile.aggregate({
      where: { tenantId, deletedAt: null },
      _sum: { sizeBytes: true },
    })

    // KB article stats
    const [totalArticles, publishedArticles] = await Promise.all([
      prisma.kbArticle.count({ where: { tenantId, deletedAt: null } }),
      prisma.kbArticle.count({ where: { tenantId, deletedAt: null, status: 'published' } }),
    ])

    return reply.send({
      success: true,
      data: {
        documents: {
          totalFiles,
          totalFolders,
          totalSizeBytes: Number(totalSizeResult._sum.sizeBytes ?? 0),
          mimeBreakdown: mimeBreakdown.map(m => ({ mimeType: m.mimeType, count: m._count.id })),
        },
        knowledge: { totalArticles, publishedArticles, draftArticles: totalArticles - publishedArticles },
        recentFiles: recentFiles.map(f => ({ ...f, sizeBytes: Number(f.sizeBytes) })),
        recentActivity: auditLogs,
      },
    })
  })

  // GET /docs/search — search files and folders
  app.get('/search', async (req, reply) => {
    const { tenantId } = req as any
    const { q, limit = 20 } = req.query as any
    if (!q) return reply.send({ success: true, data: { files: [], folders: [] } })

    const [files, folders] = await Promise.all([
      prisma.docFile.findMany({
        where: { tenantId, deletedAt: null, name: { contains: String(q), mode: 'insensitive' } },
        take: Number(limit),
        include: { folder: { select: { name: true } } },
      }),
      prisma.docFolder.findMany({
        where: { tenantId, deletedAt: null, name: { contains: String(q), mode: 'insensitive' } },
        take: Number(limit),
      }),
    ])

    return reply.send({
      success: true,
      data: {
        files: files.map(f => ({ ...f, sizeBytes: Number(f.sizeBytes) })),
        folders,
      },
    })
  })

  // GET /docs/audit — document audit trail
  app.get('/audit', async (req, reply) => {
    const { tenantId } = req as any
    const { fileId, action, page = 1, limit = 20 } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = { tenantId }
    if (fileId) where.fileId = fileId
    if (action) where.action = action

    const [logs, total] = await Promise.all([
      prisma.docAuditLog.findMany({ where, orderBy: { occurredAt: 'desc' }, skip, take: Number(limit) }),
      prisma.docAuditLog.count({ where }),
    ])

    return reply.send({
      success: true,
      data: logs,
      meta: { pagination: { total, page: Number(page), limit: Number(limit) } },
    })
  })
}
