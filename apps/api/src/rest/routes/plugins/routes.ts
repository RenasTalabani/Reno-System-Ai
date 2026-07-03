import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function pluginsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // T1: registry
  app.get('/registry', async () => ({
    categories: ['integration', 'analytics', 'automation', 'ai', 'communication', 'productivity', 'security'],
    pluginStatuses: ['draft', 'in-review', 'published', 'suspended', 'archived'],
    installStatuses: ['active', 'disabled', 'needs-update'],
    permissionScopes: ['read:crm', 'write:crm', 'read:finance', 'write:finance', 'read:hr', 'send:notifications', 'execute:workflows'],
  }))

  // T2: create plugin
  app.post('/plugins', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { name, slug, description, category = 'integration', author, metadata } = req.body as any
    const plugin = await prisma.plgPlugin.create({
      data: { tenantId: r.tenantId, name, slug, description, category, author, status: 'draft', metadata: metadata as never },
    })
    await prisma.plgVersion.create({
      data: { tenantId: r.tenantId, pluginId: plugin.id, version: '0.1.0', changelog: 'Initial version', status: 'published' },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'CREATE', module: 'plugins', entityType: 'PlgPlugin', entityId: plugin.id, newValues: { name, slug } as never } as never }).catch(() => null)
    return plugin
  })

  // T3: list plugins (marketplace browse)
  app.get('/plugins', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { category, status } = req.query as any
    const where: any = { tenantId: r.tenantId }
    if (category) where.category = category
    if (status) where.status = status
    const plugins = await prisma.plgPlugin.findMany({ where, orderBy: [{ installCount: 'desc' }, { avgRating: 'desc' }], include: { _count: { select: { versions: true, reviews: true, installations: true } } } })
    return { plugins, total: plugins.length }
  })

  // T4: get plugin details
  app.get('/plugins/:pid', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { pid } = req.params as any
    return prisma.plgPlugin.findFirstOrThrow({ where: { id: pid, tenantId: r.tenantId }, include: { versions: { orderBy: { createdAt: 'desc' } }, permissions: true, _count: { select: { reviews: true, installations: true } } } })
  })

  // T5: update plugin
  app.patch('/plugins/:pid', async (req) => {
    const { pid } = req.params as any
    const data = req.body as any
    return prisma.plgPlugin.update({ where: { id: pid }, data: { ...data, metadata: data.metadata as never } })
  })

  // T6: submit for review
  app.post('/plugins/:pid/submit', async (req) => {
    const { pid } = req.params as any
    return prisma.plgPlugin.update({ where: { id: pid }, data: { status: 'in-review' } })
  })

  // T7: publish plugin (admin approval)
  app.post('/plugins/:pid/publish', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { pid } = req.params as any
    const plugin = await prisma.plgPlugin.update({ where: { id: pid }, data: { status: 'published' } })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'PUBLISH', module: 'plugins', entityType: 'PlgPlugin', entityId: pid, newValues: { status: 'published' } as never } as never }).catch(() => null)
    return plugin
  })

  // T8: release new version
  app.post('/plugins/:pid/versions', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { pid } = req.params as any
    const { version, changelog, manifest } = req.body as any
    const v = await prisma.plgVersion.create({
      data: { tenantId: r.tenantId, pluginId: pid, version, changelog, manifest: manifest as never, status: 'published' },
    })
    await prisma.plgPlugin.update({ where: { id: pid }, data: { latestVersion: version } })
    return v
  })

  // T9: list versions
  app.get('/plugins/:pid/versions', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { pid } = req.params as any
    const versions = await prisma.plgVersion.findMany({ where: { pluginId: pid, tenantId: r.tenantId }, orderBy: { createdAt: 'desc' } })
    return { versions, total: versions.length }
  })

  // T10: request permission scopes
  app.post('/plugins/:pid/permissions', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { pid } = req.params as any
    const { scope, reason } = req.body as any
    return prisma.plgPermission.create({
      data: { tenantId: r.tenantId, pluginId: pid, scope, reason, isGranted: false },
    })
  })

  // T11: grant permission (tenant admin explicit approval — RBAC golden rule)
  app.post('/permissions/:permId/grant', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { permId } = req.params as any
    const perm = await prisma.plgPermission.update({
      where: { id: permId },
      data: { isGranted: true, grantedBy: r.userId, grantedAt: new Date() },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'GRANT_PLUGIN_PERMISSION', module: 'plugins', entityType: 'PlgPermission', entityId: permId, newValues: { scope: perm.scope } as never } as never }).catch(() => null)
    return perm
  })

  // T12: install plugin (blocked if ungranted permissions exist)
  app.post('/plugins/:pid/install', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { pid } = req.params as any
    const { config } = req.body as any
    const plugin = await prisma.plgPlugin.findFirstOrThrow({ where: { id: pid, tenantId: r.tenantId } })
    if (plugin.status !== 'published') return { error: 'plugin is not published' }
    const ungranted = await prisma.plgPermission.count({ where: { pluginId: pid, isGranted: false } })
    if (ungranted > 0) return { error: 'permissions pending approval', ungranted }
    const install = await prisma.plgInstallation.create({
      data: { tenantId: r.tenantId, pluginId: pid, version: plugin.latestVersion, status: 'active', config: config as never, installedBy: r.userId },
    })
    await prisma.plgPlugin.update({ where: { id: pid }, data: { installCount: { increment: 1 } } })
    await prisma.plgWebhookEvent.create({ data: { tenantId: r.tenantId, pluginRef: plugin.slug, eventType: 'plugin.installed', payload: { version: plugin.latestVersion } as never } })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'INSTALL', module: 'plugins', entityType: 'PlgInstallation', entityId: install.id, newValues: { plugin: plugin.slug } as never } as never }).catch(() => null)
    return install
  })

  // T13: list installations
  app.get('/installations', async (req) => {
    const r = req as unknown as { tenantId: string }
    const installations = await prisma.plgInstallation.findMany({ where: { tenantId: r.tenantId }, include: { plugin: { select: { name: true, slug: true, latestVersion: true } } } })
    return { installations, total: installations.length }
  })

  // T14: toggle installation (enable/disable)
  app.post('/installations/:iid/toggle', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { iid } = req.params as any
    const inst = await prisma.plgInstallation.findFirstOrThrow({ where: { id: iid, tenantId: r.tenantId } })
    const status = inst.status === 'active' ? 'disabled' : 'active'
    await prisma.plgInstallation.update({ where: { id: iid }, data: { status } })
    return { success: true, status }
  })

  // T15: update installation (upgrade version / config)
  app.patch('/installations/:iid', async (req) => {
    const { iid } = req.params as any
    const data = req.body as any
    return prisma.plgInstallation.update({ where: { id: iid }, data: { ...data, config: data.config as never } })
  })

  // T16: uninstall
  app.delete('/installations/:iid', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { iid } = req.params as any
    const inst = await prisma.plgInstallation.findFirst({ where: { id: iid, tenantId: r.tenantId }, include: { plugin: true } })
    await prisma.plgInstallation.delete({ where: { id: iid } })
    if (inst) {
      await prisma.plgPlugin.update({ where: { id: inst.pluginId }, data: { installCount: { decrement: 1 } } }).catch(() => null)
      await prisma.plgWebhookEvent.create({ data: { tenantId: r.tenantId, pluginRef: inst.plugin.slug, eventType: 'plugin.uninstalled', payload: {} as never } })
    }
    return { success: true }
  })

  // T17: add review (recomputes avg rating)
  app.post('/plugins/:pid/reviews', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { pid } = req.params as any
    const { rating = 5, comment } = req.body as any
    const review = await prisma.plgReview.create({
      data: { tenantId: r.tenantId, pluginId: pid, rating: Math.max(1, Math.min(5, rating)), comment, reviewer: r.userId },
    })
    const agg = await prisma.plgReview.aggregate({ where: { pluginId: pid }, _avg: { rating: true } })
    await prisma.plgPlugin.update({ where: { id: pid }, data: { avgRating: Number((agg._avg.rating ?? 0).toFixed(2)) } })
    return review
  })

  // T18: list reviews
  app.get('/plugins/:pid/reviews', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { pid } = req.params as any
    const reviews = await prisma.plgReview.findMany({ where: { pluginId: pid, tenantId: r.tenantId }, orderBy: { createdAt: 'desc' } })
    return { reviews, total: reviews.length }
  })

  // T19: plugin webhook events
  app.get('/webhook-events', async (req) => {
    const r = req as unknown as { tenantId: string }
    const events = await prisma.plgWebhookEvent.findMany({ where: { tenantId: r.tenantId }, orderBy: { createdAt: 'desc' }, take: 100 })
    return { events, total: events.length }
  })

  // T20: marketplace featured (top rated + most installed)
  app.get('/featured', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [topRated, mostInstalled] = await Promise.all([
      prisma.plgPlugin.findMany({ where: { tenantId: r.tenantId, status: 'published' }, orderBy: { avgRating: 'desc' }, take: 5 }),
      prisma.plgPlugin.findMany({ where: { tenantId: r.tenantId, status: 'published' }, orderBy: { installCount: 'desc' }, take: 5 }),
    ])
    return { topRated, mostInstalled }
  })

  // T21: search plugins
  app.get('/search', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { q = '' } = req.query as any
    const plugins = await prisma.plgPlugin.findMany({
      where: { tenantId: r.tenantId, OR: [{ name: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] },
      take: 50,
    })
    return { plugins, total: plugins.length }
  })

  // T22: stats
  app.get('/stats', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [plugins, versions, installations, reviews, permissions, events] = await Promise.all([
      prisma.plgPlugin.count({ where: { tenantId: r.tenantId } }),
      prisma.plgVersion.count({ where: { tenantId: r.tenantId } }),
      prisma.plgInstallation.count({ where: { tenantId: r.tenantId } }),
      prisma.plgReview.count({ where: { tenantId: r.tenantId } }),
      prisma.plgPermission.count({ where: { tenantId: r.tenantId } }),
      prisma.plgWebhookEvent.count({ where: { tenantId: r.tenantId } }),
    ])
    return { plugins, versions, installations, reviews, permissions, webhookEvents: events }
  })

  // T23: suspend plugin
  app.post('/plugins/:pid/suspend', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { pid } = req.params as any
    const plugin = await prisma.plgPlugin.update({ where: { id: pid }, data: { status: 'suspended' } })
    await prisma.plgInstallation.updateMany({ where: { pluginId: pid }, data: { status: 'disabled' } })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'SUSPEND', module: 'plugins', entityType: 'PlgPlugin', entityId: pid, newValues: { status: 'suspended' } as never } as never }).catch(() => null)
    return plugin
  })

  // T24: download version (increments counter)
  app.post('/plugins/:pid/versions/:vid/download', async (req) => {
    const { vid } = req.params as any
    const v = await prisma.plgVersion.update({ where: { id: vid }, data: { downloads: { increment: 1 } } })
    return { success: true, downloads: v.downloads }
  })

  // T25: list plugin permissions
  app.get('/plugins/:pid/permissions', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { pid } = req.params as any
    const permissions = await prisma.plgPermission.findMany({ where: { pluginId: pid, tenantId: r.tenantId } })
    return { permissions, total: permissions.length }
  })

  // T26: revoke permission
  app.post('/permissions/:permId/revoke', async (req) => {
    const { permId } = req.params as any
    await prisma.plgPermission.update({ where: { id: permId }, data: { isGranted: false, grantedBy: null, grantedAt: null } })
    return { success: true }
  })

  // T27: delete review
  app.delete('/reviews/:rid', async (req) => {
    const { rid } = req.params as any
    await prisma.plgReview.delete({ where: { id: rid } })
    return { success: true }
  })

  // T28: delete plugin
  app.delete('/plugins/:pid', async (req) => {
    const { pid } = req.params as any
    await prisma.plgPlugin.delete({ where: { id: pid } })
    return { success: true }
  })
}
