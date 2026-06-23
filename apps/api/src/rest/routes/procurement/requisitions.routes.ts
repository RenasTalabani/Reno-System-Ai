import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function procRequisitionRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { page = '1', limit = '50', status, priority } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)
    const where: any = { tenantId, deletedAt: null }
    if (status) where.status = status
    if (priority) where.priority = priority
    const [total, items] = await Promise.all([
      prisma.procRequisition.count({ where }),
      prisma.procRequisition.findMany({
        where, skip, take: Number(limit),
        include: { _count: { select: { lines: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ])
    return reply.send({ success: true, data: items, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const count = await prisma.procRequisition.count({ where: { tenantId } })
    const number = `REQ-${String(count + 1).padStart(5, '0')}`
    const req2 = await prisma.procRequisition.create({
      data: {
        tenantId, number, title: body.title,
        requestedById: userId, requestedByName: body.requestedByName,
        departmentId: body.departmentId, warehouseId: body.warehouseId,
        requiredDate: body.requiredDate ? new Date(body.requiredDate) : undefined,
        priority: body.priority ?? 'normal', reason: body.reason, notes: body.notes,
        createdBy: userId, updatedBy: userId,
        lines: {
          create: (body.lines ?? []).map((l: any) => ({
            tenantId, productId: l.productId, productCode: l.productCode,
            description: l.description, quantity: l.quantity, unitId: l.unitId,
            estimatedPrice: l.estimatedPrice, currency: l.currency ?? 'USD',
            accountId: l.accountId, notes: l.notes,
          })),
        },
      },
      include: { lines: true },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'procurement', entityType: 'ProcRequisition', entityId: req2.id, newValues: { number } } })
    return reply.code(201).send({ success: true, data: req2 })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const item = await prisma.procRequisition.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { lines: true, rfqs: { select: { id: true, number: true, status: true } } },
    })
    if (!item) return reply.code(404).send({ success: false, error: 'Requisition not found' })
    return reply.send({ success: true, data: item })
  })

  app.patch('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const existing = await prisma.procRequisition.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Not found' })
    if (!['draft'].includes(existing.status)) return reply.code(400).send({ success: false, error: 'Only draft requisitions can be edited' })
    const body = req.body as any
    const allowed = ['title', 'departmentId', 'warehouseId', 'requiredDate', 'priority', 'reason', 'notes']
    const data: any = { updatedBy: userId }
    allowed.forEach(k => { if (k in body) data[k] = body[k] })
    if (data.requiredDate) data.requiredDate = new Date(data.requiredDate)
    const item = await prisma.procRequisition.update({ where: { id }, data })
    return reply.send({ success: true, data: item })
  })

  app.post('/:id/submit', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const existing = await prisma.procRequisition.findFirst({ where: { id, tenantId }, include: { lines: true } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Not found' })
    if (existing.status !== 'draft') return reply.code(400).send({ success: false, error: `Requisition is already ${existing.status}` })
    if (existing.lines.length === 0) return reply.code(400).send({ success: false, error: 'Requisition has no lines' })
    const updated = await prisma.procRequisition.update({ where: { id }, data: { status: 'submitted', updatedBy: userId } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'SUBMIT', module: 'procurement', entityType: 'ProcRequisition', entityId: id, newValues: { status: 'submitted' } } })
    return reply.send({ success: true, data: updated })
  })

  app.post('/:id/approve', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { notes } = req.body as any ?? {}
    const existing = await prisma.procRequisition.findFirst({ where: { id, tenantId } })
    if (!existing || existing.status !== 'submitted') return reply.code(400).send({ success: false, error: 'Requisition must be submitted to approve' })
    const updated = await prisma.procRequisition.update({
      where: { id },
      data: { status: 'approved', approvedById: userId, approvedAt: new Date(), updatedBy: userId },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'APPROVE', module: 'procurement', entityType: 'ProcRequisition', entityId: id, newValues: { status: 'approved', notes } } })
    return reply.send({ success: true, data: updated })
  })

  app.post('/:id/reject', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { reason } = req.body as any ?? {}
    const existing = await prisma.procRequisition.findFirst({ where: { id, tenantId } })
    if (!existing || !['submitted'].includes(existing.status)) return reply.code(400).send({ success: false, error: 'Only submitted requisitions can be rejected' })
    const updated = await prisma.procRequisition.update({
      where: { id },
      data: { status: 'rejected', rejectedById: userId, rejectedAt: new Date(), rejectionReason: reason, updatedBy: userId },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'REJECT', module: 'procurement', entityType: 'ProcRequisition', entityId: id, newValues: { status: 'rejected', reason } } })
    return reply.send({ success: true, data: updated })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const existing = await prisma.procRequisition.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Not found' })
    if (!['draft', 'rejected'].includes(existing.status)) return reply.code(400).send({ success: false, error: 'Cannot delete this requisition' })
    await prisma.procRequisition.update({ where: { id }, data: { status: 'cancelled', deletedAt: new Date(), isActive: false, updatedBy: userId } })
    return reply.send({ success: true })
  })
}
