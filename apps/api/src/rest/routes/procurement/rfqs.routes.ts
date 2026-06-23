import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function procRfqRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { page = '1', limit = '50', status, supplierId } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)
    const where: any = { tenantId, deletedAt: null }
    if (status) where.status = status
    if (supplierId) where.suppliers = { some: { supplierId } }
    const [total, items] = await Promise.all([
      prisma.procRfq.count({ where }),
      prisma.procRfq.findMany({
        where, skip, take: Number(limit),
        include: {
          requisition: { select: { number: true, title: true } },
          _count: { select: { lines: true, suppliers: true, quotations: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])
    return reply.send({ success: true, data: items, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const count = await prisma.procRfq.count({ where: { tenantId } })
    const number = `RFQ-${String(count + 1).padStart(5, '0')}`
    const rfq = await prisma.procRfq.create({
      data: {
        tenantId, number, title: body.title,
        requisitionId: body.requisitionId,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        currency: body.currency ?? 'USD',
        terms: body.terms,
        notes: body.notes,
        createdBy: userId, updatedBy: userId,
        lines: {
          create: (body.lines ?? []).map((l: any) => ({
            tenantId, productId: l.productId, productCode: l.productCode,
            description: l.description ?? '', quantity: l.quantity, unitId: l.unitId,
            notes: l.notes,
          })),
        },
        suppliers: body.supplierIds
          ? {
              create: (body.supplierIds as string[]).map(sid => ({
                tenantId, supplierId: sid,
              })),
            }
          : undefined,
      },
      include: { lines: true, suppliers: true },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'procurement', entityType: 'ProcRfq', entityId: rfq.id, newValues: { number } } })
    return reply.code(201).send({ success: true, data: rfq })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const item = await prisma.procRfq.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        requisition: { select: { number: true, title: true } },
        lines: true,
        suppliers: {
          include: { supplier: { select: { id: true, name: true, code: true, email: true } } },
        },
        quotations: {
          include: { supplier: { select: { name: true, code: true } } },
          where: { deletedAt: null },
        },
      },
    })
    if (!item) return reply.code(404).send({ success: false, error: 'RFQ not found' })
    return reply.send({ success: true, data: item })
  })

  app.patch('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const existing = await prisma.procRfq.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Not found' })
    if (!['draft'].includes(existing.status)) return reply.code(400).send({ success: false, error: 'Only draft RFQs can be edited' })
    const body = req.body as any
    const allowed = ['title', 'dueDate', 'currency', 'terms', 'notes']
    const data: any = { updatedBy: userId }
    allowed.forEach(k => { if (k in body) data[k] = body[k] })
    if (data.dueDate) data.dueDate = new Date(data.dueDate)
    const item = await prisma.procRfq.update({ where: { id }, data })
    return reply.send({ success: true, data: item })
  })

  app.post('/:id/suppliers', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { supplierIds } = req.body as any
    const existing = await prisma.procRfq.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Not found' })
    if (!['draft', 'sent'].includes(existing.status)) return reply.code(400).send({ success: false, error: 'Cannot add suppliers in current status' })
    const creates = await Promise.all(
      (supplierIds as string[]).map(sid =>
        prisma.procRfqSupplier.upsert({
          where: { tenantId_rfqId_supplierId: { tenantId, rfqId: id, supplierId: sid } },
          create: { tenantId, rfqId: id, supplierId: sid },
          update: {},
        })
      )
    )
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'ADD_SUPPLIERS', module: 'procurement', entityType: 'ProcRfq', entityId: id, newValues: { supplierIds } } })
    return reply.send({ success: true, data: creates })
  })

  app.post('/:id/send', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const existing = await prisma.procRfq.findFirst({
      where: { id, tenantId },
      include: { lines: true, suppliers: true },
    })
    if (!existing) return reply.code(404).send({ success: false, error: 'Not found' })
    if (existing.status !== 'draft') return reply.code(400).send({ success: false, error: `RFQ is already ${existing.status}` })
    if (existing.lines.length === 0) return reply.code(400).send({ success: false, error: 'RFQ has no lines' })
    if (existing.suppliers.length === 0) return reply.code(400).send({ success: false, error: 'RFQ has no suppliers' })
    const updated = await prisma.procRfq.update({
      where: { id },
      data: { status: 'sent', updatedBy: userId },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'SEND', module: 'procurement', entityType: 'ProcRfq', entityId: id, newValues: { status: 'sent', supplierCount: existing.suppliers.length } } })
    return reply.send({ success: true, data: updated })
  })

  app.post('/:id/close', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const existing = await prisma.procRfq.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Not found' })
    if (existing.status !== 'sent') return reply.code(400).send({ success: false, error: 'Only sent RFQs can be closed' })
    const updated = await prisma.procRfq.update({ where: { id }, data: { status: 'closed', updatedBy: userId } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CLOSE', module: 'procurement', entityType: 'ProcRfq', entityId: id, newValues: { status: 'closed' } } })
    return reply.send({ success: true, data: updated })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const existing = await prisma.procRfq.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Not found' })
    if (!['draft'].includes(existing.status)) return reply.code(400).send({ success: false, error: 'Only draft RFQs can be deleted' })
    await prisma.procRfq.update({ where: { id }, data: { status: 'cancelled', deletedAt: new Date(), isActive: false, updatedBy: userId } })
    return reply.send({ success: true })
  })
}
