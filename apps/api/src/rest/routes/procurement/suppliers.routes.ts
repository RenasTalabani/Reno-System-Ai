import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function procSupplierRoutes(app: FastifyInstance) {
  // Categories
  app.get('/categories', async (req, reply) => {
    const { tenantId } = req as any
    const items = await prisma.procSupplierCategory.findMany({
      where: { tenantId, deletedAt: null },
      include: { _count: { select: { suppliers: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
    return reply.send({ success: true, data: items })
  })

  app.post('/categories', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { name, code, description, parentId, sortOrder } = req.body as any
    const item = await prisma.procSupplierCategory.create({
      data: { tenantId, name, code, description, parentId, sortOrder: sortOrder ?? 0, createdBy: userId, updatedBy: userId },
    })
    return reply.code(201).send({ success: true, data: item })
  })

  // Suppliers
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { page = '1', limit = '50', search, categoryId, status } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)
    const where: any = { tenantId, deletedAt: null }
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { code: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }]
    if (categoryId) where.categoryId = categoryId
    if (status) where.status = status
    const [total, items] = await Promise.all([
      prisma.procSupplier.count({ where }),
      prisma.procSupplier.findMany({
        where, skip, take: Number(limit),
        include: {
          category: { select: { name: true } },
          _count: { select: { orders: true, evaluations: true } },
        },
        orderBy: { name: 'asc' },
      }),
    ])
    return reply.send({ success: true, data: items, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any
    const count = await prisma.procSupplier.count({ where: { tenantId } })
    const code = body.code ?? `SUP-${String(count + 1).padStart(4, '0')}`
    const item = await prisma.procSupplier.create({
      data: {
        tenantId, code, name: body.name, legalName: body.legalName,
        categoryId: body.categoryId, finVendorId: body.finVendorId,
        taxId: body.taxId, registrationNo: body.registrationNo,
        website: body.website, email: body.email, phone: body.phone,
        address: body.address, city: body.city, country: body.country,
        currency: body.currency ?? 'USD', paymentTerms: body.paymentTerms,
        leadTimeDays: body.leadTimeDays, status: body.status ?? 'active',
        notes: body.notes, createdBy: userId, updatedBy: userId,
      },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'procurement', entityType: 'ProcSupplier', entityId: item.id, newValues: { code, name: body.name } } })
    return reply.code(201).send({ success: true, data: item })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const item = await prisma.procSupplier.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        category: true,
        contacts: { where: { deletedAt: null }, orderBy: { isPrimary: 'desc' } },
        _count: { select: { orders: true, evaluations: true, quotations: true } },
      },
    })
    if (!item) return reply.code(404).send({ success: false, error: 'Supplier not found' })

    // Get price history (last 10 entries)
    const priceHistory = await prisma.procSupplierPriceHistory.findMany({
      where: { tenantId, supplierId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return reply.send({ success: true, data: { ...item, priceHistory } })
  })

  app.patch('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any
    const allowed = ['name', 'legalName', 'categoryId', 'taxId', 'registrationNo', 'website', 'email', 'phone', 'address', 'city', 'country', 'currency', 'paymentTerms', 'leadTimeDays', 'status', 'notes', 'isActive']
    const data: any = { updatedBy: userId }
    allowed.forEach(k => { if (k in body) data[k] = body[k] })
    const item = await prisma.procSupplier.update({ where: { id }, data })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE', module: 'procurement', entityType: 'ProcSupplier', entityId: id, newValues: data } })
    return reply.send({ success: true, data: item })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const hasOrders = await prisma.procOrder.count({ where: { supplierId: id, tenantId } })
    if (hasOrders > 0) return reply.code(400).send({ success: false, error: 'Supplier has purchase orders and cannot be deleted' })
    await prisma.procSupplier.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedBy: userId } })
    return reply.send({ success: true })
  })

  // Contacts
  app.post('/:id/contacts', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const { name, title, email, phone, isPrimary } = req.body as any
    if (isPrimary) await prisma.procSupplierContact.updateMany({ where: { supplierId: id, tenantId }, data: { isPrimary: false } })
    const contact = await prisma.procSupplierContact.create({
      data: { tenantId, supplierId: id, name, title, email, phone, isPrimary: isPrimary ?? false },
    })
    return reply.code(201).send({ success: true, data: contact })
  })

  app.delete('/:id/contacts/:contactId', async (req, reply) => {
    const { contactId } = req.params as any
    await prisma.procSupplierContact.update({ where: { id: contactId }, data: { deletedAt: new Date(), isActive: false } })
    return reply.send({ success: true })
  })

  // Evaluations
  app.get('/:id/evaluations', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const evals = await prisma.procVendorEvaluation.findMany({
      where: { tenantId, supplierId: id, deletedAt: null },
      orderBy: { evaluationDate: 'desc' },
      take: 20,
    })
    return reply.send({ success: true, data: evals })
  })

  app.post('/:id/evaluations', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any

    const scores = [body.qualityScore, body.deliveryScore, body.pricingScore, body.responsivenessScore].filter(Boolean)
    const overallScore = scores.length > 0 ? scores.reduce((s: number, v: number) => s + v, 0) / scores.length : null

    const evaluation = await prisma.procVendorEvaluation.create({
      data: {
        tenantId, supplierId: id, orderId: body.orderId,
        evaluatedById: userId,
        qualityScore: body.qualityScore, deliveryScore: body.deliveryScore,
        pricingScore: body.pricingScore, responsivenessScore: body.responsivenessScore,
        overallScore, notes: body.notes,
        orderedDate: body.orderedDate ? new Date(body.orderedDate) : undefined,
        expectedDate: body.expectedDate ? new Date(body.expectedDate) : undefined,
        actualDate: body.actualDate ? new Date(body.actualDate) : undefined,
        daysLate: body.daysLate, defectCount: body.defectCount,
        createdBy: userId, updatedBy: userId,
      },
    })

    // Recalculate supplier aggregate scores
    const allEvals = await prisma.procVendorEvaluation.findMany({ where: { tenantId, supplierId: id, deletedAt: null } })
    const avg = (field: keyof typeof allEvals[0]) => {
      const vals = allEvals.map(e => e[field]).filter(v => v != null).map(v => Number(v))
      return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null
    }
    await prisma.procSupplier.update({
      where: { id },
      data: {
        qualityScore: avg('qualityScore'), deliveryScore: avg('deliveryScore'),
        pricingScore: avg('pricingScore'), responsivenessScore: avg('responsivenessScore'),
        overallScore: avg('overallScore'), updatedBy: userId,
      },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'EVALUATE', module: 'procurement', entityType: 'ProcSupplier', entityId: id, newValues: { overallScore } } })
    return reply.code(201).send({ success: true, data: evaluation })
  })

  // Scorecard
  app.get('/:id/scorecard', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const supplier = await prisma.procSupplier.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { _count: { select: { orders: true, evaluations: true } } },
    })
    if (!supplier) return reply.code(404).send({ success: false, error: 'Supplier not found' })
    const totalSpend = await prisma.procOrder.aggregate({
      where: { tenantId, supplierId: id, deletedAt: null, status: { not: 'cancelled' } },
      _sum: { totalAmount: true },
    })
    const onTimeOrders = await prisma.procVendorEvaluation.count({
      where: { tenantId, supplierId: id, deletedAt: null, daysLate: { lte: 0 } },
    })
    return reply.send({
      success: true,
      data: {
        supplier,
        scorecard: {
          qualityScore: supplier.qualityScore,
          deliveryScore: supplier.deliveryScore,
          pricingScore: supplier.pricingScore,
          responsivenessScore: supplier.responsivenessScore,
          overallScore: supplier.overallScore,
          aiRiskScore: supplier.aiRiskScore,
          aiPerformanceScore: supplier.aiPerformanceScore,
          totalOrders: supplier._count.orders,
          totalEvaluations: supplier._count.evaluations,
          totalSpend: Number(totalSpend._sum.totalAmount ?? 0),
          onTimeDeliveryRate: supplier._count.evaluations > 0 ? (onTimeOrders / supplier._count.evaluations) * 100 : null,
        },
      },
    })
  })
}
