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
    if (q.documentType) where.documentType = q.documentType
    if (q.isConfidential !== undefined) where.isConfidential = q.isConfidential === 'true'
    if (q.isVerified !== undefined) where.isVerified = q.isVerified === 'true'
    if (q.expiring) {
      const in30Days = new Date()
      in30Days.setDate(in30Days.getDate() + 30)
      where.expiryDate = { lte: in30Days, gte: new Date() }
    }

    const [total, documents] = await Promise.all([
      prisma.hrEmployeeDocument.count({ where }),
      prisma.hrEmployeeDocument.findMany({
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

    const document = await prisma.hrEmployeeDocument.findFirst({
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

    const document = await prisma.hrEmployeeDocument.create({
      data: {
        tenantId, employeeId: body.employeeId,
        documentType: body.documentType, documentName: body.documentName,
        documentNumber: body.documentNumber, fileUrl: body.fileUrl,
        fileMimeType: body.fileMimeType, fileSizeBytes: body.fileSizeBytes,
        issuedDate: body.issuedDate ? new Date(body.issuedDate) : undefined,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
        issuingAuthority: body.issuingAuthority,
        isConfidential: body.isConfidential ?? false,
        notes: body.notes,
        createdBy: userId,
      },
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'UPLOAD_DOCUMENT', module: 'hr', entityType: 'hr_employee_documents', entityId: document.id, newValues: { employeeId: body.employeeId, documentType: body.documentType, documentName: body.documentName }, ipAddress: request.ip },
    })

    return reply.status(201).send(buildSuccessResponse(document))
  })

  // PUT /hr/documents/:id
  app.put('/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const body = request.body as any

    const existing = await prisma.hrEmployeeDocument.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!existing) throw new RenoError(ErrorCode.NOT_FOUND, 'Document not found', 404)

    const updated = await prisma.hrEmployeeDocument.update({
      where: { id },
      data: {
        ...body,
        issuedDate: body.issuedDate ? new Date(body.issuedDate) : undefined,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
        updatedBy: userId,
      },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // PATCH /hr/documents/:id/verify
  app.patch('/:id/verify', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any

    const document = await prisma.hrEmployeeDocument.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!document) throw new RenoError(ErrorCode.NOT_FOUND, 'Document not found', 404)

    const updated = await prisma.hrEmployeeDocument.update({
      where: { id },
      data: { isVerified: true, verifiedBy: userId, verifiedAt: new Date(), updatedBy: userId },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // DELETE /hr/documents/:id — soft delete
  app.delete('/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any

    await prisma.hrEmployeeDocument.updateMany({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false, updatedBy: userId },
    })

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'DELETE_DOCUMENT', module: 'hr', entityType: 'hr_employee_documents', entityId: id, ipAddress: request.ip },
    })

    return reply.send(buildSuccessResponse({ id }))
  })

  // GET /hr/documents/expiring — documents expiring within N days
  app.get('/expiring/soon', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const days = parseInt(q.days ?? '30')

    const future = new Date()
    future.setDate(future.getDate() + days)

    const documents = await prisma.hrEmployeeDocument.findMany({
      where: { tenantId, deletedAt: null, expiryDate: { lte: future, gte: new Date() } },
      orderBy: { expiryDate: 'asc' },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, workEmail: true } },
      },
    })

    return reply.send(buildSuccessResponse(documents))
  })
}
