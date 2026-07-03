import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function extensionsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // T1: registry
  app.get('/registry', async () => ({
    extTypes: ['widget', 'theme', 'panel', 'toolbar', 'sidebar-item', 'page'],
    statuses: ['draft', 'published', 'deprecated'],
    placements: ['dashboard', 'sidebar', 'topbar', 'crm', 'finance', 'reports'],
    widgetTypes: ['chart', 'kpi', 'table', 'feed', 'calendar', 'custom'],
  }))

  // T2: create extension (auto v0.1.0)
  app.post('/extensions', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { name, slug, extType = 'widget', description, author, metadata } = req.body as any
    const ext = await prisma.extExtension.create({
      data: { tenantId: r.tenantId, name, slug, extType, description, author, status: 'draft', metadata: metadata as never },
    })
    await prisma.extVersion.create({
      data: { tenantId: r.tenantId, extensionId: ext.id, version: '0.1.0', changelog: 'Initial version' },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'CREATE', module: 'extensions', entityType: 'ExtExtension', entityId: ext.id, newValues: { name, slug } as never } as never }).catch(() => null)
    return ext
  })

  // T3: list extensions
  app.get('/extensions', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { extType, status } = req.query as any
    const where: any = { tenantId: r.tenantId }
    if (extType) where.extType = extType
    if (status) where.status = status
    const extensions = await prisma.extExtension.findMany({ where, orderBy: { installCount: 'desc' }, include: { _count: { select: { versions: true, installs: true, ratings: true } } } })
    return { extensions, total: extensions.length }
  })

  // T4: get extension
  app.get('/extensions/:eid', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { eid } = req.params as any
    return prisma.extExtension.findFirstOrThrow({ where: { id: eid, tenantId: r.tenantId }, include: { versions: { orderBy: { createdAt: 'desc' } } } })
  })

  // T5: publish extension
  app.post('/extensions/:eid/publish', async (req) => {
    const { eid } = req.params as any
    return prisma.extExtension.update({ where: { id: eid }, data: { status: 'published' } })
  })

  // T6: release version
  app.post('/extensions/:eid/versions', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { eid } = req.params as any
    const { version, changelog, bundle } = req.body as any
    const v = await prisma.extVersion.create({
      data: { tenantId: r.tenantId, extensionId: eid, version, changelog, bundle: bundle as never },
    })
    await prisma.extExtension.update({ where: { id: eid }, data: { latestVersion: version } })
    return v
  })

  // T7: install extension to placement
  app.post('/extensions/:eid/install', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { eid } = req.params as any
    const { placement = 'dashboard', settings } = req.body as any
    const ext = await prisma.extExtension.findFirstOrThrow({ where: { id: eid, tenantId: r.tenantId } })
    if (ext.status !== 'published') return { error: 'extension is not published' }
    const install = await prisma.extInstall.create({
      data: { tenantId: r.tenantId, extensionId: eid, version: ext.latestVersion, placement, isEnabled: true, settings: settings as never, installedBy: r.userId },
    })
    await prisma.extExtension.update({ where: { id: eid }, data: { installCount: { increment: 1 } } })
    return install
  })

  // T8: list installs
  app.get('/installs', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { placement } = req.query as any
    const where: any = { tenantId: r.tenantId }
    if (placement) where.placement = placement
    const installs = await prisma.extInstall.findMany({ where, include: { extension: { select: { name: true, slug: true, extType: true, latestVersion: true } } } })
    return { installs, total: installs.length }
  })

  // T9: toggle install
  app.post('/installs/:iid/toggle', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { iid } = req.params as any
    const inst = await prisma.extInstall.findFirstOrThrow({ where: { id: iid, tenantId: r.tenantId } })
    const updated = await prisma.extInstall.update({ where: { id: iid }, data: { isEnabled: !inst.isEnabled } })
    return { success: true, isEnabled: updated.isEnabled }
  })

  // T10: update install settings
  app.patch('/installs/:iid', async (req) => {
    const { iid } = req.params as any
    const data = req.body as any
    return prisma.extInstall.update({ where: { id: iid }, data: { ...data, settings: data.settings as never } })
  })

  // T11: create theme
  app.post('/themes', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { name, colors, typography, isDark = false, author } = req.body as any
    return prisma.extTheme.create({
      data: { tenantId: r.tenantId, name, colors: colors as never, typography: typography as never, isDark, author },
    })
  })

  // T12: list themes
  app.get('/themes', async (req) => {
    const r = req as unknown as { tenantId: string }
    const themes = await prisma.extTheme.findMany({ where: { tenantId: r.tenantId } })
    return { themes, total: themes.length }
  })

  // T13: activate theme (deactivates others)
  app.post('/themes/:thid/activate', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { thid } = req.params as any
    await prisma.extTheme.updateMany({ where: { tenantId: r.tenantId }, data: { isActive: false } })
    const theme = await prisma.extTheme.update({ where: { id: thid }, data: { isActive: true } })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'ACTIVATE_THEME', module: 'extensions', entityType: 'ExtTheme', entityId: thid, newValues: { name: theme.name } as never } as never }).catch(() => null)
    return theme
  })

  // T14: get active theme
  app.get('/themes/active', async (req) => {
    const r = req as unknown as { tenantId: string }
    const theme = await prisma.extTheme.findFirst({ where: { tenantId: r.tenantId, isActive: true } })
    return theme ?? { name: 'default', isActive: true, colors: { primary: '#3b82f6' }, isDark: false }
  })

  // T15: create widget
  app.post('/widgets', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { name, widgetType = 'chart', dataSource, config, placement = 'dashboard' } = req.body as any
    const count = await prisma.extWidget.count({ where: { tenantId: r.tenantId, placement } })
    return prisma.extWidget.create({
      data: { tenantId: r.tenantId, name, widgetType, dataSource, config: config as never, placement, position: count, isVisible: true },
    })
  })

  // T16: list widgets by placement
  app.get('/widgets', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { placement } = req.query as any
    const where: any = { tenantId: r.tenantId }
    if (placement) where.placement = placement
    const widgets = await prisma.extWidget.findMany({ where, orderBy: { position: 'asc' } })
    return { widgets, total: widgets.length }
  })

  // T17: reorder widgets
  app.post('/widgets/reorder', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { widgetIds = [] } = req.body as any
    let position = 0
    for (const id of widgetIds) {
      await prisma.extWidget.updateMany({ where: { id, tenantId: r.tenantId }, data: { position } })
      position++
    }
    return { success: true, reordered: widgetIds.length }
  })

  // T18: toggle widget visibility
  app.post('/widgets/:wid/toggle', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { wid } = req.params as any
    const w = await prisma.extWidget.findFirstOrThrow({ where: { id: wid, tenantId: r.tenantId } })
    const updated = await prisma.extWidget.update({ where: { id: wid }, data: { isVisible: !w.isVisible } })
    return { success: true, isVisible: updated.isVisible }
  })

  // T19: rate extension
  app.post('/extensions/:eid/ratings', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { eid } = req.params as any
    const { rating = 5, comment } = req.body as any
    const created = await prisma.extRating.create({
      data: { tenantId: r.tenantId, extensionId: eid, rating: Math.max(1, Math.min(5, rating)), comment, rater: r.userId },
    })
    const agg = await prisma.extRating.aggregate({ where: { extensionId: eid }, _avg: { rating: true } })
    await prisma.extExtension.update({ where: { id: eid }, data: { avgRating: Number((agg._avg.rating ?? 0).toFixed(2)) } })
    return created
  })

  // T20: list ratings
  app.get('/extensions/:eid/ratings', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { eid } = req.params as any
    const ratings = await prisma.extRating.findMany({ where: { extensionId: eid, tenantId: r.tenantId }, orderBy: { createdAt: 'desc' } })
    return { ratings, total: ratings.length }
  })

  // T21: store overview
  app.get('/overview', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [extensions, installs, themes, widgets] = await Promise.all([
      prisma.extExtension.count({ where: { tenantId: r.tenantId } }),
      prisma.extInstall.count({ where: { tenantId: r.tenantId, isEnabled: true } }),
      prisma.extTheme.count({ where: { tenantId: r.tenantId } }),
      prisma.extWidget.count({ where: { tenantId: r.tenantId, isVisible: true } }),
    ])
    const active = await prisma.extTheme.findFirst({ where: { tenantId: r.tenantId, isActive: true }, select: { name: true } })
    return { extensions, activeInstalls: installs, themes, visibleWidgets: widgets, activeTheme: active?.name ?? 'default' }
  })

  // T22: stats
  app.get('/stats', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [extensions, versions, installs, themes, widgets, ratings] = await Promise.all([
      prisma.extExtension.count({ where: { tenantId: r.tenantId } }),
      prisma.extVersion.count({ where: { tenantId: r.tenantId } }),
      prisma.extInstall.count({ where: { tenantId: r.tenantId } }),
      prisma.extTheme.count({ where: { tenantId: r.tenantId } }),
      prisma.extWidget.count({ where: { tenantId: r.tenantId } }),
      prisma.extRating.count({ where: { tenantId: r.tenantId } }),
    ])
    return { extensions, versions, installs, themes, widgets, ratings }
  })

  // T23: render layout (widgets grouped by placement)
  app.get('/layout/:placement', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { placement } = req.params as any
    const [widgets, installs] = await Promise.all([
      prisma.extWidget.findMany({ where: { tenantId: r.tenantId, placement, isVisible: true }, orderBy: { position: 'asc' } }),
      prisma.extInstall.findMany({ where: { tenantId: r.tenantId, placement, isEnabled: true }, include: { extension: { select: { name: true, extType: true } } } }),
    ])
    return { placement, widgets, extensions: installs }
  })

  // T24: deprecate extension
  app.post('/extensions/:eid/deprecate', async (req) => {
    const { eid } = req.params as any
    return prisma.extExtension.update({ where: { id: eid }, data: { status: 'deprecated' } })
  })

  // T25: uninstall
  app.delete('/installs/:iid', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { iid } = req.params as any
    const inst = await prisma.extInstall.findFirst({ where: { id: iid, tenantId: r.tenantId } })
    await prisma.extInstall.delete({ where: { id: iid } })
    if (inst) await prisma.extExtension.update({ where: { id: inst.extensionId }, data: { installCount: { decrement: 1 } } }).catch(() => null)
    return { success: true }
  })

  // T26: delete widget
  app.delete('/widgets/:wid', async (req) => {
    const { wid } = req.params as any
    await prisma.extWidget.delete({ where: { id: wid } })
    return { success: true }
  })

  // T27: delete theme
  app.delete('/themes/:thid', async (req) => {
    const { thid } = req.params as any
    await prisma.extTheme.delete({ where: { id: thid } })
    return { success: true }
  })

  // T28: delete extension
  app.delete('/extensions/:eid', async (req) => {
    const { eid } = req.params as any
    await prisma.extExtension.delete({ where: { id: eid } })
    return { success: true }
  })
}
