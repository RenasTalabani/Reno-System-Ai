import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function procQuotationRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { page = '1', limit = '50', rfqId, supplierId, status } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)
    const where: any = { tenantId, deletedAt: null }
    if (rfqId) where.rfqId = rfqId
    if (supplierId) where.supplierId = supplierId
    if (status) where.status = status
    const [total, items] = await Promise.all([
      prisma.procSupplierQuotation.count({ where }),
      prisma.procSupplierQuotation.findMany({
        where, skip, take: Number(limit),
        include: {
          supplier: { select: { name: true, code: true } },
          rfq: { select: { number: true, title: true } },
          _count: { select: { lines: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])
    return reply.send({ success: true, data: items, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const count = await prisma.procSupplierQuotation.count({ where: { tenantId } })
    const number = `QUOT-${String(count + 1).padStart(5, '0')}`

    const totalAmount = (body.lines ?? []).reduce((sum: number, l: any) => {
      return sum + Number(l.quantity ?? 0) * Number(l.unitPrice ?? 0)
    }, 0)

    const quotation = await prisma.procSupplierQuotation.create({
      data: {
        tenantId, number, rfqId: body.rfqId, supplierId: body.supplierId,
        currency: body.currency ?? 'USD',
        totalAmount,
        validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
        paymentTerms: body.paymentTerms ? Number(body.paymentTerms) : undefined,
        deliveryTerms: body.deliveryTerms,
        leadTimeDays: body.leadTimeDays,
        notes: body.notes,
        createdBy: userId, updatedBy: userId,
        lines: {
          create: (body.lines ?? []).map((l: any) => ({
            tenantId, productId: l.productId,
            productCode: l.productCode, description: l.description ?? '',
            quantity: l.quantity, unitId: l.unitId, unitPrice: l.unitPrice,
            totalPrice: Number(l.quantity ?? 0) * Number(l.unitPrice ?? 0),
            leadTimeDays: l.leadTimeDays, notes: l.notes,
            currency: body.currency ?? 'USD',
          })),
        },
      },
      include: { lines: true },
    })

    // Record price history for traceability / AI benchmarking
    await Promise.all(
      (body.lines ?? []).filter((l: any) => l.productId && l.unitPrice).map((l: any) =>
        prisma.procSupplierPriceHistory.create({
          data: {
            tenantId, supplierId: body.supplierId, productId: l.productId,
            unitPrice: l.unitPrice, currency: body.currency ?? 'USD',
            source: 'quotation', sourceId: quotation.id,
          },
        })
      )
    )

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'procurement', entityType: 'ProcSupplierQuotation', entityId: quotation.id, newValues: { number, totalAmount } } })
    return reply.code(201).send({ success: true, data: quotation })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const item = await prisma.procSupplierQuotation.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        supplier: { select: { name: true, code: true, email: true } },
        rfq: { select: { number: true, title: true } },
        lines: true,
      },
    })
    if (!item) return reply.code(404).send({ success: false, error: 'Quotation not found' })
    return reply.send({ success: true, data: item })
  })

  app.patch('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const existing = await prisma.procSupplierQuotation.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Not found' })
    if (!['received'].includes(existing.status)) return reply.code(400).send({ success: false, error: 'Only received quotations can be edited' })
    const body = req.body as any
    const allowed = ['currency', 'validUntil', 'paymentTerms', 'deliveryTerms', 'leadTimeDays', 'notes', 'evaluationNotes', 'evaluationScore']
    const data: any = { updatedBy: userId }
    allowed.forEach(k => { if (k in body) data[k] = body[k] })
    if (data.validUntil) data.validUntil = new Date(data.validUntil)
    if (data.paymentTerms) data.paymentTerms = Number(data.paymentTerms)
    const item = await prisma.procSupplierQuotation.update({ where: { id }, data })
    return reply.send({ success: true, data: item })
  })

  app.post('/:id/accept', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const existing = await prisma.procSupplierQuotation.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Not found' })
    if (!['received', 'evaluated'].includes(existing.status)) return reply.code(400).send({ success: false, error: 'Cannot accept this quotation in current status' })
    const updated = await prisma.procSupplierQuotation.update({
      where: { id },
      data: { status: 'accepted', isPreferred: true, updatedBy: userId },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'ACCEPT', module: 'procurement', entityType: 'ProcSupplierQuotation', entityId: id, newValues: { status: 'accepted' } } })
    return reply.send({ success: true, data: updated })
  })

  app.post('/:id/reject', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { reason } = req.body as any ?? {}
    const existing = await prisma.procSupplierQuotation.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Not found' })
    if (!['received', 'evaluated'].includes(existing.status)) return reply.code(400).send({ success: false, error: 'Cannot reject this quotation in current status' })
    const updated = await prisma.procSupplierQuotation.update({
      where: { id },
      data: { status: 'rejected', evaluationNotes: reason, updatedBy: userId },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'REJECT', module: 'procurement', entityType: 'ProcSupplierQuotation', entityId: id, newValues: { status: 'rejected', reason } } })
    return reply.send({ success: true, data: updated })
  })

  // Compare quotations for the same RFQ
  app.get('/compare/:rfqId', async (req, reply) => {
    const { tenantId } = req as any
    const { rfqId } = req.params as any
    const quotations = await prisma.procSupplierQuotation.findMany({
      where: { tenantId, rfqId, deletedAt: null },
      include: {
        supplier: { select: { name: true, code: true, overallScore: true, leadTimeDays: true } },
        lines: { select: { productId: true, unitPrice: true, quantity: true, totalPrice: true, leadTimeDays: true } },
      },
      orderBy: { totalAmount: 'asc' },
    })
    return reply.send({ success: true, data: quotations })
  })
}
