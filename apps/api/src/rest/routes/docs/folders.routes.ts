import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function docFolderRoutes(app: FastifyInstance) {
  // GET /docs/folders — list root folders (or by parentId)
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { parentId, page = 1, limit = 50 } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const where = {
      tenantId,
      deletedAt: null,
      isActive: true,
      parentId: parentId ? String(parentId) : null,
    }

    const [folders, total] = await Promise.all([
      prisma.docFolder.findMany({
        where,
        include: { _count: { select: { files: true, children: true } } },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip,
        take: Number(limit),
      }),
      prisma.docFolder.count({ where }),
    ])

    return reply.send({
      success: true,
      data: folders,
      meta: { pagination: { total, page: Number(page), limit: Number(limit) } },
    })
  })

  // POST /docs/folders — create folder
  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { name, description, parentId, color, icon, isPublic, sortOrder } = req.body as any

    // Build path
    let path = `/${name}`
    if (parentId) {
      const parent = await prisma.docFolder.findFirst({ where: { id: parentId, tenantId } })
      if (!parent) return reply.code(404).send({ success: false, error: 'Parent folder not found' })
      path = `${parent.path ?? ''}/${name}`
    }

    const folder = await prisma.docFolder.create({
      data: {
        tenantId,
        parentId: parentId || null,
        name,
        description,
        color,
        icon,
        path,
        isPublic: Boolean(isPublic),
        sortOrder: Number(sortOrder ?? 0),
        createdBy: userId,
      },
    })

    await prisma.docAuditLog.create({
      data: { tenantId, userId, folderId: folder.id, action: 'create', entityType: 'folder', entityName: name },
    })

    return reply.code(201).send({ success: true, data: folder })
  })

  // GET /docs/folders/:id — folder detail with children + files
  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any

    const folder = await prisma.docFolder.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        parent: { select: { id: true, name: true, path: true } },
        children: { where: { deletedAt: null }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
        _count: { select: { files: true } },
      },
    })
    if (!folder) return reply.code(404).send({ success: false, error: 'Folder not found' })

    const files = await prisma.docFile.findMany({
      where: { folderId: id, tenantId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    })

    return reply.send({ success: true, data: { ...folder, files } })
  })

  // PATCH /docs/folders/:id — update folder
  app.patch('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { name, description, color, icon, isPublic, sortOrder } = req.body as any

    const existing = await prisma.docFolder.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Folder not found' })

    const folder = await prisma.docFolder.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        description,
        color,
        icon,
        isPublic: isPublic !== undefined ? Boolean(isPublic) : existing.isPublic,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : existing.sortOrder,
        updatedBy: userId,
      },
    })

    return reply.send({ success: true, data: folder })
  })

  // DELETE /docs/folders/:id — soft delete
  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any

    const folder = await prisma.docFolder.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!folder) return reply.code(404).send({ success: false, error: 'Folder not found' })

    await prisma.docFolder.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: userId },
    })

    await prisma.docAuditLog.create({
      data: { tenantId, userId, folderId: id, action: 'delete', entityType: 'folder', entityName: folder.name },
    })

    return reply.send({ success: true, data: { deleted: true } })
  })
}
