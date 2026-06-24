import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function mktIndustryPackRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { industry, featured, limit = 20, offset = 0 } = req.query as any
    const where: any = { deletedAt: null, isActive: true, status: 'approved' }
    if (industry) where.industry = industry
    if (featured === 'true') where.isFeatured = true
    const [items, total] = await Promise.all([
      prisma.mktIndustryPack.findMany({
        where, orderBy: [{ isFeatured: 'desc' }, { installCount: 'desc' }],
        take: Number(limit), skip: Number(offset),
      }),
      prisma.mktIndustryPack.count({ where }),
    ])
    return reply.send({ success: true, data: items, meta: { total } })
  })

  app.get('/:id', async (req, reply) => {
    const { id } = req.params as any
    const item = await prisma.mktIndustryPack.findFirst({ where: { id, deletedAt: null } })
    if (!item) return reply.status(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: item })
  })

  // Install industry pack — installs all included plugins
  app.post('/:id/install', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any

    const pack = await prisma.mktIndustryPack.findFirst({ where: { id, deletedAt: null } })
    if (!pack) return reply.status(404).send({ success: false, error: 'Industry pack not found' })

    // Find included plugins
    const plugins = await prisma.mktPlugin.findMany({
      where: { slug: { in: pack.includedPlugins }, status: 'approved', isActive: true },
    })

    const installed: string[] = []
    const skipped: string[] = []

    for (const plugin of plugins) {
      const exists = await prisma.mktTenantPlugin.findUnique({
        where: { tenantId_pluginId: { tenantId, pluginId: plugin.id } },
      })
      if (exists) { skipped.push(plugin.slug); continue }

      await prisma.mktTenantPlugin.create({
        data: {
          tenantId, pluginId: plugin.id,
          installedVersion: plugin.currentVersion,
          status: 'active',
          grantedPermissions: plugin.permissions,
          installedBy: userId,
        },
      })
      await prisma.mktPlugin.update({ where: { id: plugin.id }, data: { installCount: { increment: 1 } } })
      installed.push(plugin.slug)
    }

    // Find & install included themes
    const themes = await prisma.mktTheme.findMany({
      where: { slug: { in: pack.includedThemes }, status: 'approved', isActive: true },
    })
    for (const theme of themes) {
      const exists = await prisma.mktTenantTheme.findUnique({
        where: { tenantId_themeId: { tenantId, themeId: theme.id } },
      })
      if (!exists) {
        await prisma.mktTenantTheme.create({
          data: { tenantId, themeId: theme.id, isActive: false, installedBy: userId },
        })
        await prisma.mktTheme.update({ where: { id: theme.id }, data: { installCount: { increment: 1 } } })
      }
    }

    await Promise.all([
      prisma.mktIndustryPack.update({ where: { id }, data: { installCount: { increment: 1 } } }),
      prisma.mktAuditLog.create({
        data: { tenantId, userId, action: 'install', listingType: 'industry_pack', listingName: pack.name },
      }),
    ])

    return reply.status(201).send({ success: true, data: { installed, skipped, themesInstalled: themes.length } })
  })
}
