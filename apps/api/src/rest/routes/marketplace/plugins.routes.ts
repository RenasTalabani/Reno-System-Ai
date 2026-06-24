import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function mktPluginRoutes(app: FastifyInstance) {
  // Browse plugins
  app.get('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { category, status = 'approved', featured, search, limit = 20, offset = 0 } = req.query as any

    const where: any = { deletedAt: null, isActive: true }
    if (status) where.status = status
    if (category) where.category = category
    if (featured === 'true') where.isFeatured = true
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { shortDescription: { contains: search, mode: 'insensitive' } },
      { tags: { has: search } },
    ]

    const [plugins, total] = await Promise.all([
      prisma.mktPlugin.findMany({
        where,
        include: { developer: { select: { name: true, avatarUrl: true } } },
        orderBy: [{ isFeatured: 'desc' }, { installCount: 'desc' }],
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.mktPlugin.count({ where }),
    ])

    // Enrich with tenant install status
    const pluginIds = plugins.map((p) => p.id)
    const installs = await prisma.mktTenantPlugin.findMany({
      where: { tenantId, pluginId: { in: pluginIds } },
      select: { pluginId: true, status: true, installedVersion: true },
    })
    const installMap = new Map(installs.map((i) => [i.pluginId, i]))

    return reply.send({
      success: true,
      data: plugins.map((p) => ({ ...p, tenantInstall: installMap.get(p.id) ?? null })),
      meta: { total, limit: Number(limit), offset: Number(offset) },
    })
  })

  // Get plugin detail
  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any

    const plugin = await prisma.mktPlugin.findFirst({
      where: { id, deletedAt: null },
      include: {
        developer: { select: { name: true, email: true, website: true, avatarUrl: true } },
        versions: { orderBy: { createdAt: 'desc' }, take: 10 },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, rating: true, title: true, body: true, createdAt: true, isVerifiedPurchase: true, helpfulCount: true },
        },
      },
    })
    if (!plugin) return reply.status(404).send({ success: false, error: 'Plugin not found' })

    const tenantInstall = await prisma.mktTenantPlugin.findUnique({
      where: { tenantId_pluginId: { tenantId, pluginId: id } },
    })

    return reply.send({ success: true, data: { ...plugin, tenantInstall } })
  })

  // Install plugin for tenant
  app.post('/:id/install', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { grantedPermissions = [], config } = req.body as any

    const plugin = await prisma.mktPlugin.findFirst({ where: { id, status: 'approved', isActive: true } })
    if (!plugin) return reply.status(404).send({ success: false, error: 'Plugin not available' })

    const existing = await prisma.mktTenantPlugin.findUnique({
      where: { tenantId_pluginId: { tenantId, pluginId: id } },
    })
    if (existing) return reply.status(409).send({ success: false, error: 'Plugin already installed' })

    const [install] = await Promise.all([
      prisma.mktTenantPlugin.create({
        data: {
          tenantId, pluginId: id,
          installedVersion: plugin.currentVersion,
          status: 'active',
          grantedPermissions,
          config: config ?? undefined,
          installedBy: userId,
        },
      }),
      prisma.mktPlugin.update({ where: { id }, data: { installCount: { increment: 1 } } }),
      prisma.mktAuditLog.create({
        data: {
          tenantId, userId, action: 'install', listingType: 'plugin',
          pluginId: id, listingName: plugin.name, toVersion: plugin.currentVersion,
        },
      }),
    ])

    return reply.status(201).send({ success: true, data: install })
  })

  // Uninstall plugin
  app.delete('/:id/install', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any

    const install = await prisma.mktTenantPlugin.findUnique({
      where: { tenantId_pluginId: { tenantId, pluginId: id } },
      include: { plugin: { select: { name: true } } },
    })
    if (!install) return reply.status(404).send({ success: false, error: 'Plugin not installed' })

    await Promise.all([
      prisma.mktTenantPlugin.delete({ where: { tenantId_pluginId: { tenantId, pluginId: id } } }),
      prisma.mktPlugin.update({ where: { id }, data: { installCount: { decrement: 1 } } }),
      prisma.mktAuditLog.create({
        data: {
          tenantId, userId, action: 'uninstall', listingType: 'plugin',
          pluginId: id, listingName: install.plugin.name, fromVersion: install.installedVersion,
        },
      }),
    ])

    return reply.send({ success: true, data: { uninstalled: true } })
  })

  // Enable / disable plugin
  app.patch('/:id/toggle', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any

    const install = await prisma.mktTenantPlugin.findUnique({
      where: { tenantId_pluginId: { tenantId, pluginId: id } },
      include: { plugin: { select: { name: true } } },
    })
    if (!install) return reply.status(404).send({ success: false, error: 'Plugin not installed' })

    const newStatus = install.status === 'active' ? 'disabled' : 'active'
    const updated = await prisma.mktTenantPlugin.update({
      where: { tenantId_pluginId: { tenantId, pluginId: id } },
      data: { status: newStatus },
    })

    await prisma.mktAuditLog.create({
      data: {
        tenantId, userId,
        action: newStatus === 'active' ? 'enable' : 'disable',
        listingType: 'plugin', pluginId: id, listingName: install.plugin.name,
      },
    })

    return reply.send({ success: true, data: updated })
  })

  // Upgrade plugin
  app.post('/:id/upgrade', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any

    const [install, plugin] = await Promise.all([
      prisma.mktTenantPlugin.findUnique({ where: { tenantId_pluginId: { tenantId, pluginId: id } } }),
      prisma.mktPlugin.findUnique({ where: { id } }),
    ])
    if (!install) return reply.status(404).send({ success: false, error: 'Plugin not installed' })
    if (!plugin) return reply.status(404).send({ success: false, error: 'Plugin not found' })
    if (install.installedVersion === plugin.currentVersion) {
      return reply.send({ success: true, data: { alreadyUpToDate: true, version: plugin.currentVersion } })
    }

    const updated = await prisma.mktTenantPlugin.update({
      where: { tenantId_pluginId: { tenantId, pluginId: id } },
      data: {
        installedVersion: plugin.currentVersion,
        lastUpgradedAt: new Date(),
        upgradedFromVersion: install.installedVersion,
      },
    })

    await prisma.mktAuditLog.create({
      data: {
        tenantId, userId, action: 'upgrade', listingType: 'plugin', pluginId: id, listingName: plugin.name,
        fromVersion: install.installedVersion, toVersion: plugin.currentVersion,
      },
    })

    return reply.send({ success: true, data: updated })
  })

  // Submit review
  app.post('/:id/reviews', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { rating, title, body } = req.body as any

    const install = await prisma.mktTenantPlugin.findUnique({
      where: { tenantId_pluginId: { tenantId, pluginId: id } },
    })

    const review = await prisma.mktReview.create({
      data: {
        tenantId, userId, listingType: 'plugin', pluginId: id,
        rating: Math.min(5, Math.max(1, Number(rating))),
        title, body,
        isVerifiedPurchase: !!install,
      },
    })

    // Recalculate rating
    const agg = await prisma.mktReview.aggregate({ where: { pluginId: id }, _avg: { rating: true }, _count: true })
    await prisma.mktPlugin.update({
      where: { id },
      data: { rating: agg._avg.rating ?? 0, ratingCount: agg._count },
    })

    return reply.status(201).send({ success: true, data: review })
  })

  // Submit for review (developer action)
  app.post('/:id/submit-review', async (req, reply) => {
    const { userId } = req as any
    const { id } = req.params as any

    const plugin = await prisma.mktPlugin.findFirst({ where: { id, deletedAt: null } })
    if (!plugin) return reply.status(404).send({ success: false, error: 'Plugin not found' })
    if (plugin.status !== 'draft') return reply.status(409).send({ success: false, error: 'Already submitted' })

    const updated = await prisma.mktPlugin.update({
      where: { id },
      data: { status: 'pending_review' },
    })

    return reply.send({ success: true, data: updated })
  })
}
