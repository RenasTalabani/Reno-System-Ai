import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function mktInstalledRoutes(app: FastifyInstance) {
  // All installed items for tenant
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any

    const [plugins, themes] = await Promise.all([
      prisma.mktTenantPlugin.findMany({
        where: { tenantId },
        include: {
          plugin: {
            select: { id: true, name: true, slug: true, category: true, iconUrl: true, currentVersion: true, status: true },
          },
        },
        orderBy: { installedAt: 'desc' },
      }),
      prisma.mktTenantTheme.findMany({
        where: { tenantId },
        include: {
          theme: {
            select: { id: true, name: true, slug: true, thumbnailUrl: true, primaryColor: true, secondaryColor: true },
          },
        },
        orderBy: { installedAt: 'desc' },
      }),
    ])

    return reply.send({
      success: true,
      data: {
        plugins,
        themes,
        summary: {
          totalPlugins: plugins.length,
          activePlugins: plugins.filter((p) => p.status === 'active').length,
          disabledPlugins: plugins.filter((p) => p.status === 'disabled').length,
          upgradablePlugins: plugins.filter((p) => p.plugin.currentVersion !== p.installedVersion).length,
          totalThemes: themes.length,
          activeTheme: themes.find((t) => t.isActive)?.theme ?? null,
        },
      },
    })
  })

  // Audit log for tenant marketplace actions
  app.get('/audit', async (req, reply) => {
    const { tenantId } = req as any
    const { limit = 50, offset = 0 } = req.query as any

    const [logs, total] = await Promise.all([
      prisma.mktAuditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.mktAuditLog.count({ where: { tenantId } }),
    ])

    return reply.send({ success: true, data: logs, meta: { total } })
  })
}
