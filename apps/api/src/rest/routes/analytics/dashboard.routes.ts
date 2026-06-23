import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function biDashboardRoutes(app: FastifyInstance) {
  // GET /analytics/dashboards
  app.get('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { type, page = '1', limit = '20' } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = { tenantId, deletedAt: null }
    if (type) where.type = type

    const [items, total] = await Promise.all([
      prisma.biDashboard.findMany({
        where,
        include: { _count: { select: { widgets: true } } },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: Number(limit),
      }),
      prisma.biDashboard.count({ where }),
    ])

    return reply.send({ success: true, data: items, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  // POST /analytics/dashboards
  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any

    // If isDefault, unset existing defaults of same type
    if (body.isDefault) {
      await prisma.biDashboard.updateMany({
        where: { tenantId, type: body.type ?? 'custom', isDefault: true, deletedAt: null },
        data: { isDefault: false },
      })
    }

    const slug = body.slug ?? body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now()

    const dashboard = await prisma.biDashboard.create({
      data: {
        tenantId,
        name: body.name,
        slug,
        description: body.description,
        type: body.type ?? 'custom',
        module: body.module,
        isDefault: body.isDefault ?? false,
        isPublic: body.isPublic ?? false,
        layout: body.layout,
        filters: body.filters,
        refreshRate: body.refreshRate ? Number(body.refreshRate) : null,
        createdBy: userId,
        updatedBy: userId,
      },
    })

    return reply.code(201).send({ success: true, data: dashboard })
  })

  // GET /analytics/dashboards/:id
  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any

    const dashboard = await prisma.biDashboard.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        widgets: { where: { isActive: true }, orderBy: [{ positionY: 'asc' }, { positionX: 'asc' }] },
        _count: { select: { widgets: true, permissions: true } },
      },
    })

    if (!dashboard) return reply.code(404).send({ success: false, error: 'Dashboard not found' })
    return reply.send({ success: true, data: dashboard })
  })

  // PATCH /analytics/dashboards/:id
  app.patch('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any

    const existing = await prisma.biDashboard.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Dashboard not found' })

    if (body.isDefault) {
      await prisma.biDashboard.updateMany({
        where: { tenantId, type: existing.type, isDefault: true, deletedAt: null, id: { not: id } },
        data: { isDefault: false },
      })
    }

    const dashboard = await prisma.biDashboard.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        description: body.description !== undefined ? body.description : existing.description,
        isDefault: body.isDefault !== undefined ? body.isDefault : existing.isDefault,
        isPublic: body.isPublic !== undefined ? body.isPublic : existing.isPublic,
        layout: body.layout !== undefined ? body.layout : existing.layout,
        filters: body.filters !== undefined ? body.filters : existing.filters,
        refreshRate: body.refreshRate !== undefined ? Number(body.refreshRate) : existing.refreshRate,
        updatedBy: userId,
      },
    })

    return reply.send({ success: true, data: dashboard })
  })

  // DELETE /analytics/dashboards/:id
  app.delete('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any

    const existing = await prisma.biDashboard.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Dashboard not found' })

    await prisma.biDashboard.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } })
    return reply.send({ success: true })
  })

  // POST /analytics/dashboards/:id/widgets
  app.post('/:id/widgets', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const body = req.body as any

    const dashboard = await prisma.biDashboard.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!dashboard) return reply.code(404).send({ success: false, error: 'Dashboard not found' })

    const widget = await prisma.biWidget.create({
      data: {
        tenantId,
        dashboardId: id,
        title: body.title,
        type: body.type,
        module: body.module,
        dataSource: body.dataSource,
        config: body.config,
        positionX: body.positionX ?? 0,
        positionY: body.positionY ?? 0,
        width: body.width ?? 4,
        height: body.height ?? 3,
        refreshRate: body.refreshRate ? Number(body.refreshRate) : null,
      },
    })

    return reply.code(201).send({ success: true, data: widget })
  })

  // PATCH /analytics/dashboards/:id/widgets/:widgetId
  app.patch('/:id/widgets/:widgetId', async (req, reply) => {
    const { tenantId } = req as any
    const { id, widgetId } = req.params as any
    const body = req.body as any

    const widget = await prisma.biWidget.findFirst({ where: { id: widgetId, dashboardId: id, tenantId } })
    if (!widget) return reply.code(404).send({ success: false, error: 'Widget not found' })

    const updated = await prisma.biWidget.update({
      where: { id: widgetId },
      data: {
        title: body.title ?? widget.title,
        config: body.config !== undefined ? body.config : widget.config,
        positionX: body.positionX !== undefined ? Number(body.positionX) : widget.positionX,
        positionY: body.positionY !== undefined ? Number(body.positionY) : widget.positionY,
        width: body.width !== undefined ? Number(body.width) : widget.width,
        height: body.height !== undefined ? Number(body.height) : widget.height,
      },
    })

    return reply.send({ success: true, data: updated })
  })

  // DELETE /analytics/dashboards/:id/widgets/:widgetId
  app.delete('/:id/widgets/:widgetId', async (req, reply) => {
    const { tenantId } = req as any
    const { id, widgetId } = req.params as any

    await prisma.biWidget.deleteMany({ where: { id: widgetId, dashboardId: id, tenantId } })
    return reply.send({ success: true })
  })

  // POST /analytics/dashboards/:id/permissions
  app.post('/:id/permissions', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const body = req.body as any

    const perm = await prisma.biDashboardPermission.upsert({
      where: { dashboardId_userId: { dashboardId: id, userId: body.userId } },
      create: {
        tenantId,
        dashboardId: id,
        userId: body.userId,
        canView: body.canView ?? true,
        canEdit: body.canEdit ?? false,
        canShare: body.canShare ?? false,
      },
      update: {
        canView: body.canView ?? true,
        canEdit: body.canEdit ?? false,
        canShare: body.canShare ?? false,
      },
    })

    return reply.code(201).send({ success: true, data: perm })
  })
}
