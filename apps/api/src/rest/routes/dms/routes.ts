import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function dmsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [totalFolders, totalDocs, recentDocs] = await Promise.all([
      prisma.dmsFolder.count({ where: { tenantId } }),
      prisma.dmsDoc.count({ where: { tenantId } }),
      prisma.dmsDoc.count({ where: { tenantId, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
    ])
    return { success: true, data: { totalFolders, totalDocs, recentDocs } }
  })

  app.get('/folders', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.parentId) where.parentId = q.parentId
    else where.parentId = null
    const folders = await prisma.dmsFolder.findMany({
      where: where as never,
      include: { _count: { select: { children: true, docs: true } } },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: folders }
  })

  app.post('/folders', async (req) => {
    const { tenantId, userId } = req
    const { name, parentId } = req.body as { name: string; parentId?: string }
    const parentPath = parentId
      ? (await prisma.dmsFolder.findUnique({ where: { id: parentId } }))?.path ?? ''
      : ''
    const path = parentPath ? parentPath + '/' + name : '/' + name
    const folder = await prisma.dmsFolder.create({
      data: { tenantId, name, path, parentId: parentId ?? null, createdBy: userId } as never,
    })
    return { success: true, data: folder }
  })

  app.get('/docs', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId, status: 'active' }
    if (q.folderId) where.folderId = q.folderId
    if (q.search) where.name = { contains: q.search, mode: 'insensitive' }
    const docs = await prisma.dmsDoc.findMany({
      where: where as never,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return { success: true, data: docs }
  })

  app.post('/docs', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const doc = await prisma.dmsDoc.create({ data: { tenantId, uploadedBy: userId, ...data } as never })
    return { success: true, data: doc }
  })

  app.patch('/docs/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const doc = await prisma.dmsDoc.update({ where: { id }, data: data as never })
    return { success: true, data: doc }
  })

  app.delete('/docs/:id', async (req) => {
    const { id } = req.params as { id: string }
    await prisma.dmsDoc.update({ where: { id }, data: { status: 'deleted' } })
    return { success: true }
  })
}
