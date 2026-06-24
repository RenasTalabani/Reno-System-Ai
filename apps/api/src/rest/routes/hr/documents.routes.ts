import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

export async function hrDocumentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // GET /hr/documents
  app.get('/', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const page = Math.max(1, parseInt(q.page ?? '1'))
    const limit = Math.min(100, parseInt(q.limit ?? '20'))

    const where: any = { tenantId, deletedAt: null }
    if (q.employeeId) where.employeeId = q.employeeId
    if (q.type) where.type = q.type
    if (q.isConfidential !== undefined) where.isConfidential = q.isConfidential === 'true'
    if (q.status) where.status = q.status
    if (q.expiring) {
      const in30Days = new Date()
      in30Days.setDate(in30Days.getDate() + 30)
      where.expiryDate = { lte: in30Days, gte: new Date() }
    }

    const [total, documents] = await Promise.all([
      prisma.hrDocument.count({ where }),
      prisma.hrDocument.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        },
      }),
    ])

    return reply.send(buildSuccessResponse(documents, {
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }))
  })

  // GET /hr/documents/:id
  app.get('/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any

    const document = await prisma.hrDocument.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
    })

    if (!document) throw new RenoError(ErrorCode.NOT_FOUND, 'Document not found', 404)
    return reply.send(buildSuccessResponse(document))
  })

  // POST /hr/documents
  app.post('/', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any

    const document = await prisma.hrDocument.create({
      data: {
        tenantId,
        employeeId: body.employeeId,
        type: body.type ?? body.documentType,
        name: body.name ?? body.documentName,
        fileUrl: body.fileUrl,
        fileSize: body.fileSize ?? body.fileSizeBytes,
        mimeType: body.mimeType ?? body.fileMimeType,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
        isConfidential: body.isConfidential ?? false,
        status: body.status ?? 'valid',
        notes: body.notes,
        createdBy: userId,
      },
    })

    await prisma.sysAuditLog.create({
      data: {
        tenantId, userId, action: 'UPLOAD_DOCUMENT', module: 'hr',
        entityType: 'hr_documents', entityId: document.id,
        newValues: { employeeId: body.employeeId, type: document.type, name: document.name },
        ipAddress: request.ip,
      },
    })

    return reply.status(201).send(buildSuccessResponse(document))
  })

  // PUT /hr/documents/:id
  app.put('/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const body = request.body as any

    const existing = await prisma.hrDocument.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!existing) throw new RenoError(ErrorCode.NOT_FOUND, 'Document not found', 404)

    const updated = await prisma.hrDocument.update({
      where: { id },
      data: {
        type: body.type,
        name: body.name,
        fileUrl: body.fileUrl,
        fileSize: body.fileSize,
        mimeType: body.mimeType,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
        isConfidential: body.isConfidential,
        status: body.status,
        notes: body.notes,
        updatedBy: userId,
      },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // PATCH /hr/documents/:id/verify
  app.patch('/:id/verify', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any

    const document = await prisma.hrDocument.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!document) throw new RenoError(ErrorCode.NOT_FOUND, 'Document not found', 404)

    const updated = await prisma.hrDocument.update({
      where: { id },
      data: { status: 'verified', updatedBy: userId },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // DELETE /hr/documents/:id — soft delete
  app.delete('/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any

    await prisma.hrDocument.updateMany({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false, updatedBy: userId },
    })

    await prisma.sysAuditLog.create({
      data: {
        tenantId, userId, action: 'DELETE_DOCUMENT', module: 'hr',
        entityType: 'hr_documents', entityId: id, ipAddress: request.ip,
      },
    })

    return reply.send(buildSuccessResponse({ id }))
  })

  // GET /hr/documents/expiring/soon — documents expiring within N days
  app.get('/expiring/soon', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const days = parseInt(q.days ?? '30')

    const future = new Date()
    future.setDate(future.getDate() + days)

    const documents = await prisma.hrDocument.findMany({
      where: { tenantId, deletedAt: null, expiryDate: { lte: future, gte: new Date() } },
      orderBy: { expiryDate: 'asc' },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, workEmail: true } },
      },
    })

    return reply.send(buildSuccessResponse(documents))
  })
}
