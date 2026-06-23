import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { getStorageProvider, buildStorageKey, generateFileId } from '../../../documents/storage.js'

export async function docFileRoutes(app: FastifyInstance) {
  // GET /docs/files — list files
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { folderId, search, mimeType, page = 1, limit = 20 } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = { tenantId, deletedAt: null, isActive: true }
    if (folderId) where.folderId = folderId
    if (mimeType) where.mimeType = { contains: mimeType }
    if (search) where.name = { contains: search, mode: 'insensitive' }

    const [files, total] = await Promise.all([
      prisma.docFile.findMany({
        where,
        include: { folder: { select: { id: true, name: true } } },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.docFile.count({ where }),
    ])

    return reply.send({
      success: true,
      data: files.map(f => ({ ...f, sizeBytes: Number(f.sizeBytes) })),
      meta: { pagination: { total, page: Number(page), limit: Number(limit) } },
    })
  })

  // POST /docs/files/upload-url — get presigned upload URL
  app.post('/upload-url', async (req, reply) => {
    const { tenantId } = req as any
    const { fileName, mimeType } = req.body as any
    if (!fileName || !mimeType) return reply.code(400).send({ success: false, error: 'fileName and mimeType required' })

    const fileId = generateFileId()
    const storageKey = buildStorageKey(tenantId, fileId, fileName)
    const storage = getStorageProvider()
    const uploadUrl = await storage.getUploadUrl(storageKey, mimeType)

    return reply.send({ success: true, data: { fileId, storageKey, uploadUrl } })
  })

  // POST /docs/files — create file record after upload
  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { folderId, name, mimeType, extension, sizeBytes, storageKey, storageProvider, tags, description, isPublic, isTemplate, checksum } = req.body as any

    if (!name || !mimeType || !storageKey) {
      return reply.code(400).send({ success: false, error: 'name, mimeType, storageKey required' })
    }

    const file = await prisma.docFile.create({
      data: {
        tenantId,
        folderId: folderId || null,
        name,
        description,
        mimeType,
        extension: extension ?? name.split('.').pop() ?? null,
        sizeBytes: BigInt(sizeBytes ?? 0),
        storageKey,
        storageProvider: storageProvider ?? 'minio',
        tags: tags ?? [],
        isPublic: Boolean(isPublic),
        isTemplate: Boolean(isTemplate),
        checksum,
        createdBy: userId,
      },
    })

    // First version snapshot
    await prisma.docFileVersion.create({
      data: {
        tenantId,
        fileId: file.id,
        version: 1,
        storageKey,
        sizeBytes: BigInt(sizeBytes ?? 0),
        checksum,
        comment: 'Initial version',
        createdBy: userId,
      },
    })

    await prisma.docAuditLog.create({
      data: { tenantId, userId, fileId: file.id, action: 'upload', entityType: 'file', entityName: name },
    })

    return reply.code(201).send({ success: true, data: { ...file, sizeBytes: Number(file.sizeBytes) } })
  })

  // GET /docs/files/recent — recently accessed
  app.get('/recent', async (req, reply) => {
    const { tenantId } = req as any
    const files = await prisma.docFile.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: { folder: { select: { id: true, name: true } } },
    })
    return reply.send({
      success: true,
      data: files.map(f => ({ ...f, sizeBytes: Number(f.sizeBytes) })),
    })
  })

  // GET /docs/files/:id — file detail
  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any

    const file = await prisma.docFile.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        folder: { select: { id: true, name: true, path: true } },
        _count: { select: { versions: true } },
      },
    })
    if (!file) return reply.code(404).send({ success: false, error: 'File not found' })

    // Increment view count
    await prisma.docFile.update({ where: { id }, data: { viewCount: { increment: 1 } } })

    return reply.send({ success: true, data: { ...file, sizeBytes: Number(file.sizeBytes) } })
  })

  // GET /docs/files/:id/download — presigned download URL
  app.get('/:id/download', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any

    const file = await prisma.docFile.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!file) return reply.code(404).send({ success: false, error: 'File not found' })

    const storage = getStorageProvider()
    const downloadUrl = await storage.getDownloadUrl(file.storageKey)

    await prisma.docFile.update({ where: { id }, data: { downloadCount: { increment: 1 } } })
    await prisma.docAuditLog.create({
      data: { tenantId, userId, fileId: id, action: 'download', entityType: 'file', entityName: file.name },
    })

    return reply.send({ success: true, data: { downloadUrl, fileName: file.name, mimeType: file.mimeType } })
  })

  // PATCH /docs/files/:id — update metadata
  app.patch('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { name, description, folderId, tags, isPublic, isTemplate } = req.body as any

    const existing = await prisma.docFile.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!existing) return reply.code(404).send({ success: false, error: 'File not found' })

    const file = await prisma.docFile.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        description,
        folderId: folderId !== undefined ? (folderId || null) : existing.folderId,
        tags: tags ?? existing.tags,
        isPublic: isPublic !== undefined ? Boolean(isPublic) : existing.isPublic,
        isTemplate: isTemplate !== undefined ? Boolean(isTemplate) : existing.isTemplate,
        updatedBy: userId,
      },
    })

    return reply.send({ success: true, data: { ...file, sizeBytes: Number(file.sizeBytes) } })
  })

  // POST /docs/files/:id/new-version — upload new version
  app.post('/:id/new-version', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { storageKey, sizeBytes, checksum, comment } = req.body as any

    const existing = await prisma.docFile.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!existing) return reply.code(404).send({ success: false, error: 'File not found' })

    const newVersion = existing.currentVersion + 1

    const [file] = await Promise.all([
      prisma.docFile.update({
        where: { id },
        data: { storageKey, sizeBytes: BigInt(sizeBytes ?? 0), checksum, currentVersion: newVersion, updatedBy: userId },
      }),
      prisma.docFileVersion.create({
        data: { tenantId, fileId: id, version: newVersion, storageKey, sizeBytes: BigInt(sizeBytes ?? 0), checksum, comment, createdBy: userId },
      }),
      prisma.docAuditLog.create({
        data: { tenantId, userId, fileId: id, action: 'version_upload', entityType: 'file', entityName: existing.name, metadata: { version: newVersion } },
      }),
    ])

    return reply.send({ success: true, data: { ...file, sizeBytes: Number(file.sizeBytes), newVersion } })
  })

  // GET /docs/files/:id/versions — version history
  app.get('/:id/versions', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any

    const versions = await prisma.docFileVersion.findMany({
      where: { fileId: id, tenantId },
      orderBy: { version: 'desc' },
    })

    return reply.send({
      success: true,
      data: versions.map(v => ({ ...v, sizeBytes: Number(v.sizeBytes) })),
    })
  })

  // POST /docs/files/:id/approve — approve document
  app.post('/:id/approve', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any

    const file = await prisma.docFile.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!file) return reply.code(404).send({ success: false, error: 'File not found' })

    await prisma.docFile.update({
      where: { id },
      data: { approvalStatus: 'approved', approvedAt: new Date(), approvedBy: userId, updatedBy: userId },
    })
    await prisma.docAuditLog.create({
      data: { tenantId, userId, fileId: id, action: 'approve', entityType: 'file', entityName: file.name },
    })

    return reply.send({ success: true, data: { approved: true } })
  })

  // POST /docs/files/:id/reject — reject document
  app.post('/:id/reject', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { reason } = req.body as any

    const file = await prisma.docFile.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!file) return reply.code(404).send({ success: false, error: 'File not found' })

    await prisma.docFile.update({
      where: { id },
      data: { approvalStatus: 'rejected', updatedBy: userId },
    })
    await prisma.docAuditLog.create({
      data: { tenantId, userId, fileId: id, action: 'reject', entityType: 'file', entityName: file.name, metadata: { reason } },
    })

    return reply.send({ success: true, data: { rejected: true } })
  })

  // DELETE /docs/files/:id — soft delete
  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any

    const file = await prisma.docFile.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!file) return reply.code(404).send({ success: false, error: 'File not found' })

    await prisma.docFile.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: userId },
    })
    await prisma.docAuditLog.create({
      data: { tenantId, userId, fileId: id, action: 'delete', entityType: 'file', entityName: file.name },
    })

    return reply.send({ success: true, data: { deleted: true } })
  })
}
