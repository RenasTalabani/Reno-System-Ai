import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import {
  BUILT_IN_WIDGET_DEFINITIONS, BUILT_IN_TEMPLATES,
  simulateWidgetData, generateAiRecommendations, buildTemplateWidgets,
} from './dashboard-engine.js'

async function seedWidgetDefs() {
  const count = await prisma.cdbWidgetDefinition.count()
  if (count < BUILT_IN_WIDGET_DEFINITIONS.length) {
    await prisma.cdbWidgetDefinition.createMany({
      data: BUILT_IN_WIDGET_DEFINITIONS as never[],
      skipDuplicates: true,
    })
  }
}

async function seedTemplates(tenantId: string) {
  const count = await prisma.cdbDashboardTemplate.count({ where: { tenantId, isBuiltIn: true } })
  if (count === 0) {
    await prisma.cdbDashboardTemplate.createMany({
      data: BUILT_IN_TEMPLATES.map(t => ({ ...t, tenantId, widgets: t.widgets as never, layout: [] as never })),
    })
  }
}

async function ensureMetrics(dashboardId: string) {
  await prisma.cdbDashboardMetrics.upsert({
    where: { dashboardId },
    create: { dashboardId },
    update: {},
  })
}

export async function dashboardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Widget Registry ───────────────────────────────────────────────────────────
  app.get('/registry', async () => {
    await seedWidgetDefs()
    const defs = await prisma.cdbWidgetDefinition.findMany({ where: { isActive: true }, orderBy: [{ category: 'asc' }, { name: 'asc' }] })
    const byCategory: Record<string, typeof defs> = {}
    for (const d of defs) {
      if (!byCategory[d.category]) byCategory[d.category] = []
      byCategory[d.category].push(d)
    }
    return { definitions: defs, byCategory, total: defs.length }
  })

  // ── Templates ─────────────────────────────────────────────────────────────────
  app.get('/templates', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    await seedTemplates(tenantId)
    const templates = await prisma.cdbDashboardTemplate.findMany({ where: { tenantId }, orderBy: { department: 'asc' } })
    return { templates }
  })

  app.post('/from-template/:tid', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { tid } = req.params as { tid: string }
    const body = req.body as { name?: string } | null

    const template = await prisma.cdbDashboardTemplate.findFirst({ where: { id: tid, tenantId } })
    if (!template) return rep.status(404).send({ error: 'Template not found' })

    await seedWidgetDefs()
    const dashboard = await prisma.cdbDashboard.create({
      data: {
        tenantId, ownerId: userId,
        name: (body as any)?.name ?? template.name,
        description: template.description,
        icon: template.icon,
      },
    })

    const tWidgets = (template.widgets as Array<{ key: string; title: string; x: number; y: number; w: number; h: number }>) ?? []
    if (tWidgets.length > 0) {
      await prisma.cdbWidget.createMany({
        data: tWidgets.map(w => ({
          tenantId, dashboardId: dashboard.id,
          definitionKey: w.key, title: w.title,
          x: w.x, y: w.y, w: w.w, h: w.h,
        })),
      })
    }

    await ensureMetrics(dashboard.id)
    await prisma.cdbDashboardMetrics.update({ where: { dashboardId: dashboard.id }, data: { widgetCount: tWidgets.length } })

    prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE_FROM_TEMPLATE', module: 'dashboards', entityType: 'CdbDashboard', entityId: dashboard.id, newValues: { template: template.name } as never } as never }).catch(() => null)

    return { ...dashboard, widgetCount: tWidgets.length }
  })

  // ── Dashboard CRUD ────────────────────────────────────────────────────────────
  app.get('/', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const [mine, shared] = await Promise.all([
      prisma.cdbDashboard.findMany({
        where: { tenantId, ownerId: userId },
        include: { metrics: true, _count: { select: { widgets: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.cdbDashboard.findMany({
        where: { tenantId, shares: { some: { sharedWithUserId: userId } } },
        include: { metrics: true, _count: { select: { widgets: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
    ])
    return { mine, shared, total: mine.length + shared.length }
  })

  app.post('/', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { name: string; description?: string; icon?: string; theme?: string; columns?: number; tags?: string[]; isPublic?: boolean }

    const dashboard = await prisma.cdbDashboard.create({
      data: {
        tenantId, ownerId: userId,
        name: body.name, description: body.description,
        icon: body.icon, theme: body.theme ?? 'default',
        columns: body.columns ?? 12,
        tags: (body.tags ?? []) as never,
        isPublic: body.isPublic ?? false,
      },
    })
    await ensureMetrics(dashboard.id)
    prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'dashboards', entityType: 'CdbDashboard', entityId: dashboard.id, newValues: { name: body.name } as never } as never }).catch(() => null)
    return dashboard
  })

  app.get('/:id', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const dashboard = await prisma.cdbDashboard.findFirst({
      where: { id, tenantId },
      include: { widgets: { orderBy: [{ y: 'asc' }, { x: 'asc' }] }, metrics: true, shares: true, _count: { select: { versions: true } } },
    })
    if (!dashboard) return rep.status(404).send({ error: 'Dashboard not found' })
    return dashboard
  })

  app.patch('/:id', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = req.body as { name?: string; description?: string; icon?: string; theme?: string; columns?: number; layout?: unknown[]; tags?: string[]; isPublic?: boolean; isDefault?: boolean }

    const existing = await prisma.cdbDashboard.findFirst({ where: { id, tenantId } })
    if (!existing) return rep.status(404).send({ error: 'Dashboard not found' })

    const updated = await prisma.cdbDashboard.update({
      where: { id },
      data: {
        name: body.name ?? undefined, description: body.description ?? undefined,
        icon: body.icon ?? undefined, theme: body.theme ?? undefined,
        columns: body.columns ?? undefined, layout: body.layout as never ?? undefined,
        tags: body.tags as never ?? undefined,
        isPublic: body.isPublic ?? undefined, isDefault: body.isDefault ?? undefined,
      },
    })
    prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE', module: 'dashboards', entityType: 'CdbDashboard', entityId: id, newValues: body as never } as never }).catch(() => null)
    return updated
  })

  app.delete('/:id', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const existing = await prisma.cdbDashboard.findFirst({ where: { id, tenantId } })
    if (!existing) return rep.status(404).send({ error: 'Dashboard not found' })
    await prisma.cdbDashboard.delete({ where: { id } })
    prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'DELETE', module: 'dashboards', entityType: 'CdbDashboard', entityId: id, newValues: { name: existing.name } as never } as never }).catch(() => null)
    return { success: true, id }
  })

  // ── Widgets ───────────────────────────────────────────────────────────────────
  app.get('/:id/widgets', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const dash = await prisma.cdbDashboard.findFirst({ where: { id, tenantId } })
    if (!dash) return rep.status(404).send({ error: 'Dashboard not found' })
    const widgets = await prisma.cdbWidget.findMany({ where: { dashboardId: id }, orderBy: [{ y: 'asc' }, { x: 'asc' }] })
    return { widgets }
  })

  app.post('/:id/widgets', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = req.body as { definitionKey: string; title?: string; x?: number; y?: number; w?: number; h?: number; config?: Record<string, unknown> }

    const dash = await prisma.cdbDashboard.findFirst({ where: { id, tenantId } })
    if (!dash) return rep.status(404).send({ error: 'Dashboard not found' })

    await seedWidgetDefs()
    const def = await prisma.cdbWidgetDefinition.findUnique({ where: { key: body.definitionKey } })

    const widget = await prisma.cdbWidget.create({
      data: {
        tenantId, dashboardId: id,
        definitionKey: body.definitionKey,
        title: body.title ?? def?.name ?? body.definitionKey,
        x: body.x ?? 0, y: body.y ?? 0,
        w: body.w ?? 4, h: body.h ?? 3,
        config: (body.config ?? def?.defaultConfig ?? {}) as never,
      },
    })

    // Update widget count
    const wCount = await prisma.cdbWidget.count({ where: { dashboardId: id } })
    await prisma.cdbDashboardMetrics.upsert({
      where: { dashboardId: id },
      create: { dashboardId: id, widgetCount: wCount },
      update: { widgetCount: wCount },
    })

    prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'ADD_WIDGET', module: 'dashboards', entityType: 'CdbWidget', entityId: widget.id, newValues: { definitionKey: body.definitionKey, dashboardId: id } as never } as never }).catch(() => null)
    return widget
  })

  app.patch('/:id/widgets/:wid', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id, wid } = req.params as { id: string; wid: string }
    const body = req.body as { title?: string; x?: number; y?: number; w?: number; h?: number; config?: Record<string, unknown> }

    const widget = await prisma.cdbWidget.findFirst({ where: { id: wid, dashboardId: id, tenantId } })
    if (!widget) return rep.status(404).send({ error: 'Widget not found' })

    const updated = await prisma.cdbWidget.update({
      where: { id: wid },
      data: {
        title: body.title ?? undefined, x: body.x ?? undefined, y: body.y ?? undefined,
        w: body.w ?? undefined, h: body.h ?? undefined,
        config: body.config as never ?? undefined,
      },
    })
    return updated
  })

  app.delete('/:id/widgets/:wid', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id, wid } = req.params as { id: string; wid: string }
    const widget = await prisma.cdbWidget.findFirst({ where: { id: wid, dashboardId: id, tenantId } })
    if (!widget) return rep.status(404).send({ error: 'Widget not found' })
    await prisma.cdbWidget.delete({ where: { id: wid } })
    return { success: true, id: wid }
  })

  // ── Widget Live Data ─────────────────────────────────────────────────────────
  app.get('/:id/data/:wid', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id, wid } = req.params as { id: string; wid: string }

    const widget = await prisma.cdbWidget.findFirst({ where: { id: wid, dashboardId: id, tenantId } })
    if (!widget) return rep.status(404).send({ error: 'Widget not found' })

    await seedWidgetDefs()
    const def = await prisma.cdbWidgetDefinition.findUnique({ where: { key: widget.definitionKey } })
    const data = simulateWidgetData(widget.definitionKey, def?.category ?? 'kpi', def?.chartType ?? 'number', widget.config as Record<string, unknown>)

    await prisma.cdbWidget.update({ where: { id: wid }, data: { dataCache: data as never, lastDataFetch: new Date() } })
    return { widgetId: wid, definitionKey: widget.definitionKey, data, fetchedAt: new Date().toISOString() }
  })

  // ── Versions ──────────────────────────────────────────────────────────────────
  app.get('/:id/versions', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const dash = await prisma.cdbDashboard.findFirst({ where: { id, tenantId } })
    if (!dash) return rep.status(404).send({ error: 'Dashboard not found' })
    const versions = await prisma.cdbDashboardVersion.findMany({ where: { dashboardId: id }, orderBy: { version: 'desc' } })
    return { versions }
  })

  app.post('/:id/versions', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = req.body as { label?: string }

    const dash = await prisma.cdbDashboard.findFirst({
      where: { id, tenantId },
      include: { widgets: true },
    })
    if (!dash) return rep.status(404).send({ error: 'Dashboard not found' })

    const lastVersion = await prisma.cdbDashboardVersion.findFirst({ where: { dashboardId: id }, orderBy: { version: 'desc' } })
    const nextVersion = (lastVersion?.version ?? 0) + 1

    const snapshot = { name: dash.name, description: dash.description, layout: dash.layout, widgets: dash.widgets, savedAt: new Date().toISOString() }
    const version = await prisma.cdbDashboardVersion.create({
      data: { tenantId, dashboardId: id, version: nextVersion, label: body.label ?? `v${nextVersion}`, snapshot: snapshot as never, createdBy: userId },
    })
    return version
  })

  app.post('/:id/versions/:vid/restore', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id, vid } = req.params as { id: string; vid: string }

    const ver = await prisma.cdbDashboardVersion.findFirst({ where: { id: vid, dashboardId: id, tenantId } })
    if (!ver) return rep.status(404).send({ error: 'Version not found' })

    const snap = ver.snapshot as { name?: string; description?: string; layout?: unknown }
    await prisma.cdbDashboard.update({ where: { id }, data: { name: snap.name ?? undefined, description: snap.description ?? undefined, layout: snap.layout as never ?? undefined } })
    prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'RESTORE_VERSION', module: 'dashboards', entityType: 'CdbDashboardVersion', entityId: vid, newValues: { version: ver.version } as never } as never }).catch(() => null)
    return { success: true, restoredVersion: ver.version }
  })

  // ── Sharing ───────────────────────────────────────────────────────────────────
  app.get('/:id/shares', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const dash = await prisma.cdbDashboard.findFirst({ where: { id, tenantId } })
    if (!dash) return rep.status(404).send({ error: 'Dashboard not found' })
    const shares = await prisma.cdbDashboardShare.findMany({ where: { dashboardId: id }, orderBy: { createdAt: 'desc' } })
    return { shares }
  })

  app.post('/:id/shares', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = req.body as { sharedWithUserId?: string; sharedWithRole?: string; canEdit?: boolean }

    const dash = await prisma.cdbDashboard.findFirst({ where: { id, tenantId } })
    if (!dash) return rep.status(404).send({ error: 'Dashboard not found' })

    const share = await prisma.cdbDashboardShare.create({
      data: { tenantId, dashboardId: id, sharedWithUserId: body.sharedWithUserId ?? null, sharedWithRole: body.sharedWithRole ?? null, canEdit: body.canEdit ?? false },
    })
    prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'SHARE', module: 'dashboards', entityType: 'CdbDashboardShare', entityId: share.id, newValues: body as never } as never }).catch(() => null)
    return share
  })

  app.delete('/:id/shares/:sid', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id, sid } = req.params as { id: string; sid: string }
    const share = await prisma.cdbDashboardShare.findFirst({ where: { id: sid, dashboardId: id, tenantId } })
    if (!share) return rep.status(404).send({ error: 'Share not found' })
    await prisma.cdbDashboardShare.delete({ where: { id: sid } })
    return { success: true, id: sid }
  })

  // ── Metrics & View Tracking ───────────────────────────────────────────────────
  app.get('/:id/metrics', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const dash = await prisma.cdbDashboard.findFirst({ where: { id, tenantId } })
    if (!dash) return rep.status(404).send({ error: 'Dashboard not found' })
    await ensureMetrics(id)
    const metrics = await prisma.cdbDashboardMetrics.findUnique({ where: { dashboardId: id } })
    const widgetCount = await prisma.cdbWidget.count({ where: { dashboardId: id } })
    return { ...metrics, widgetCount }
  })

  app.post('/:id/track-view', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const dash = await prisma.cdbDashboard.findFirst({ where: { id, tenantId } })
    if (!dash) return rep.status(404).send({ error: 'Dashboard not found' })
    await ensureMetrics(id)
    const loadMs = Math.round(50 + Math.random() * 200)
    const metrics = await prisma.cdbDashboardMetrics.update({
      where: { dashboardId: id },
      data: { viewCount: { increment: 1 }, lastViewedAt: new Date(), avgLoadMs: loadMs },
    })
    return metrics
  })

  // ── AI Recommendations ────────────────────────────────────────────────────────
  app.post('/:id/ai-recommend', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }

    const dash = await prisma.cdbDashboard.findFirst({ where: { id, tenantId }, include: { widgets: true } })
    if (!dash) return rep.status(404).send({ error: 'Dashboard not found' })

    // Delete old unread recs
    await prisma.cdbAiRecommendation.deleteMany({ where: { dashboardId: id, isApplied: false } })

    const widgetKeys = dash.widgets.map(w => w.definitionKey)
    const recs = generateAiRecommendations(dash.name, widgetKeys)

    const created = await prisma.cdbAiRecommendation.createMany({
      data: recs.map(r => ({ ...r, tenantId, dashboardId: id })),
    })

    const results = await prisma.cdbAiRecommendation.findMany({ where: { dashboardId: id, isApplied: false }, orderBy: { confidence: 'desc' } })
    prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'AI_RECOMMEND', module: 'dashboards', entityType: 'CdbAiRecommendation', entityId: id, newValues: { count: created.count } as never } as never }).catch(() => null)
    return { recommendations: results, count: results.length }
  })
}
