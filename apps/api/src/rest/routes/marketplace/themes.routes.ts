import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function mktThemeRoutes(app: FastifyInstance) {
  // Browse themes
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { category, featured, search, limit = 20, offset = 0 } = req.query as any

    const where: any = { deletedAt: null, isActive: true, status: 'approved' }
    if (category) where.category = category
    if (featured === 'true') where.isFeatured = true
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ]

    const [themes, total] = await Promise.all([
      prisma.mktTheme.findMany({
        where,
        include: { developer: { select: { name: true, avatarUrl: true } } },
        orderBy: [{ isFeatured: 'desc' }, { installCount: 'desc' }],
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.mktTheme.count({ where }),
    ])

    const themeIds = themes.map((t) => t.id)
    const installs = await prisma.mktTenantTheme.findMany({
      where: { tenantId, themeId: { in: themeIds } },
      select: { themeId: true, isActive: true },
    })
    const installMap = new Map(installs.map((i) => [i.themeId, i]))

    return reply.send({
      success: true,
      data: themes.map((t) => ({ ...t, tenantInstall: installMap.get(t.id) ?? null })),
      meta: { total, limit: Number(limit), offset: Number(offset) },
    })
  })

  // Get active theme for tenant
  app.get('/active', async (req, reply) => {
    const { tenantId } = req as any
    const active = await prisma.mktTenantTheme.findFirst({
      where: { tenantId, isActive: true },
      include: { theme: true },
    })
    return reply.send({ success: true, data: active })
  })

  // Theme detail
  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any

    const theme = await prisma.mktTheme.findFirst({
      where: { id, deletedAt: null },
      include: {
        developer: { select: { name: true, website: true, avatarUrl: true } },
        reviews: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    })
    if (!theme) return reply.status(404).send({ success: false, error: 'Theme not found' })

    const tenantInstall = await prisma.mktTenantTheme.findUnique({
      where: { tenantId_themeId: { tenantId, themeId: id } },
    })

    return reply.send({ success: true, data: { ...theme, tenantInstall } })
  })

  // Install theme
  app.post('/:id/install', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any

    const theme = await prisma.mktTheme.findFirst({ where: { id, status: 'approved', isActive: true } })
    if (!theme) return reply.status(404).send({ success: false, error: 'Theme not available' })

    const existing = await prisma.mktTenantTheme.findUnique({
      where: { tenantId_themeId: { tenantId, themeId: id } },
    })
    if (existing) return reply.status(409).send({ success: false, error: 'Theme already installed' })

    const [install] = await Promise.all([
      prisma.mktTenantTheme.create({
        data: { tenantId, themeId: id, isActive: false, installedBy: userId },
      }),
      prisma.mktTheme.update({ where: { id }, data: { installCount: { increment: 1 } } }),
      prisma.mktAuditLog.create({
        data: { tenantId, userId, action: 'install', listingType: 'theme', listingName: theme.name },
      }),
    ])

    return reply.status(201).send({ success: true, data: install })
  })

  // Apply theme (set as active)
  app.post('/:id/apply', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { customConfig } = req.body as any

    const install = await prisma.mktTenantTheme.findUnique({
      where: { tenantId_themeId: { tenantId, themeId: id } },
      include: { theme: { select: { name: true } } },
    })
    if (!install) return reply.status(404).send({ success: false, error: 'Theme not installed. Install it first.' })

    // Deactivate all other themes for tenant
    await prisma.mktTenantTheme.updateMany({
      where: { tenantId, isActive: true },
      data: { isActive: false },
    })

    const updated = await prisma.mktTenantTheme.update({
      where: { tenantId_themeId: { tenantId, themeId: id } },
      data: { isActive: true, activatedAt: new Date(), customConfig: customConfig ?? undefined },
      include: { theme: true },
    })

    await prisma.mktAuditLog.create({
      data: { tenantId, userId, action: 'apply_theme', listingType: 'theme', listingName: install.theme.name },
    })

    return reply.send({ success: true, data: updated })
  })

  // Uninstall theme
  app.delete('/:id/install', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any

    const install = await prisma.mktTenantTheme.findUnique({
      where: { tenantId_themeId: { tenantId, themeId: id } },
      include: { theme: { select: { name: true } } },
    })
    if (!install) return reply.status(404).send({ success: false, error: 'Theme not installed' })
    if (install.isActive) return reply.status(409).send({ success: false, error: 'Cannot uninstall the active theme' })

    await Promise.all([
      prisma.mktTenantTheme.delete({ where: { tenantId_themeId: { tenantId, themeId: id } } }),
      prisma.mktTheme.update({ where: { id }, data: { installCount: { decrement: 1 } } }),
      prisma.mktAuditLog.create({
        data: { tenantId, userId, action: 'uninstall', listingType: 'theme', listingName: install.theme.name },
      }),
    ])

    return reply.send({ success: true, data: { uninstalled: true } })
  })

  // Update custom config
  app.patch('/:id/config', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const { customConfig } = req.body as any

    const updated = await prisma.mktTenantTheme.update({
      where: { tenantId_themeId: { tenantId, themeId: id } },
      data: { customConfig },
      include: { theme: true },
    })

    return reply.send({ success: true, data: updated })
  })

  // Submit review
  app.post('/:id/reviews', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const { rating, title, body } = req.body as any

    const install = await prisma.mktTenantTheme.findUnique({
      where: { tenantId_themeId: { tenantId, themeId: id } },
    })

    const review = await prisma.mktReview.create({
      data: {
        tenantId, userId, listingType: 'theme', themeId: id,
        rating: Math.min(5, Math.max(1, Number(rating))),
        title, body, isVerifiedPurchase: !!install,
      },
    })

    const agg = await prisma.mktReview.aggregate({ where: { themeId: id }, _avg: { rating: true }, _count: true })
    await prisma.mktTheme.update({ where: { id }, data: { rating: agg._avg.rating ?? 0, ratingCount: agg._count } })

    return reply.status(201).send({ success: true, data: review })
  })
}
