import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'

const CHANNELS = ['in_app', 'email', 'push', 'sms', 'slack', 'teams']
const PRIORITIES = ['critical', 'high', 'normal', 'low']
const TRIGGERS = ['user.created', 'report.generated', 'export.done', 'threshold.breach', 'schedule.fired', 'system.alert', 'custom']
const TARGET_TYPES = ['all', 'user', 'role', 'department']

function interpolate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`)
}

function nextDigestAt(frequency: string): Date {
  const d = new Date()
  if (frequency === 'hourly') d.setHours(d.getHours() + 1)
  else if (frequency === 'daily') { d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0) }
  else d.setDate(d.getDate() + 7)
  return d
}

export async function notificationCenterRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Registry ──────────────────────────────────────────────────────────────────

  // T1: GET /notification-center/registry
  app.get('/registry', async (_req, rep) => {
    return rep.send({
      channels: CHANNELS.map(c => ({
        key: c, label: c.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        supportsTemplate: true, supportsDigest: ['email'].includes(c),
      })),
      priorities: PRIORITIES,
      triggerTypes: TRIGGERS,
      targetTypes: TARGET_TYPES,
      features: ['templates', 'rules', 'preferences', 'digests', 'broadcasts', 'channels', 'history', 'stats'],
    })
  })

  // ── Templates ─────────────────────────────────────────────────────────────────

  // T2: POST /notification-center/templates
  app.post('/templates', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { name: string; eventType: string; titleTpl: string; bodyTpl: string; channels?: string[]; priority?: string; description?: string; variables?: string[] }
    if (!body.name || !body.eventType || !body.titleTpl || !body.bodyTpl)
      return rep.status(400).send({ error: 'name, eventType, titleTpl, bodyTpl required' })

    const tpl = await prisma.ntcTemplate.create({
      data: {
        tenantId, name: body.name, eventType: body.eventType,
        titleTpl: body.titleTpl, bodyTpl: body.bodyTpl,
        description: body.description ?? null,
        channels: (body.channels ?? ['in_app']) as never,
        priority: body.priority ?? 'normal',
        variables: (body.variables ?? []) as never,
      } as never,
    })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'TEMPLATE_CREATE', module: 'notification-center', entityType: 'NtcTemplate', entityId: (tpl as unknown as { id: string }).id, newValues: { eventType: body.eventType } as never },
    }).catch(() => null)
    return rep.status(201).send(tpl)
  })

  // T3: GET /notification-center/templates
  app.get('/templates', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const templates = await prisma.ntcTemplate.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } })
    return rep.send({ templates, total: templates.length })
  })

  // T4: GET /notification-center/templates/:id
  app.get('/templates/:id', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const tpl = await prisma.ntcTemplate.findFirst({ where: { id, tenantId }, include: { rules: true } })
    if (!tpl) return rep.status(404).send({ error: 'Template not found' })
    return rep.send(tpl)
  })

  // T5: PATCH /notification-center/templates/:id
  app.patch('/templates/:id', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const body = req.body as Record<string, unknown>
    const tpl = await prisma.ntcTemplate.findFirst({ where: { id, tenantId } })
    if (!tpl) return rep.status(404).send({ error: 'Template not found' })
    const updated = await prisma.ntcTemplate.update({ where: { id }, data: body as never })
    return rep.send(updated)
  })

  // T6: DELETE /notification-center/templates/:id
  app.delete('/templates/:id', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const tpl = await prisma.ntcTemplate.findFirst({ where: { id, tenantId } })
    if (!tpl) return rep.status(404).send({ error: 'Template not found' })
    await prisma.ntcTemplate.delete({ where: { id } })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'TEMPLATE_DELETE', module: 'notification-center', entityType: 'NtcTemplate', entityId: id, newValues: {} as never },
    }).catch(() => null)
    return rep.send({ success: true, id })
  })

  // ── Rules ─────────────────────────────────────────────────────────────────────

  // T7: POST /notification-center/rules
  app.post('/rules', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { templateId: string; name: string; triggerType: string; targetType: string; conditions?: object; targetIds?: string[] }
    if (!body.templateId || !body.name || !body.triggerType || !body.targetType)
      return rep.status(400).send({ error: 'templateId, name, triggerType, targetType required' })

    const tpl = await prisma.ntcTemplate.findFirst({ where: { id: body.templateId, tenantId } })
    if (!tpl) return rep.status(404).send({ error: 'Template not found' })

    const rule = await prisma.ntcRule.create({
      data: {
        tenantId, templateId: body.templateId, name: body.name,
        triggerType: body.triggerType, targetType: body.targetType,
        conditions: (body.conditions ?? {}) as never,
        targetIds: (body.targetIds ?? []) as never,
      } as never,
    })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'RULE_CREATE', module: 'notification-center', entityType: 'NtcRule', entityId: (rule as unknown as { id: string }).id, newValues: { triggerType: body.triggerType } as never },
    }).catch(() => null)
    return rep.status(201).send(rule)
  })

  // T8: GET /notification-center/rules
  app.get('/rules', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const rules = await prisma.ntcRule.findMany({
      where: { tenantId },
      include: { template: { select: { name: true, eventType: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return rep.send({ rules, total: rules.length })
  })

  // T9: PATCH /notification-center/rules/:id
  app.patch('/rules/:id', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const body = req.body as Record<string, unknown>
    const rule = await prisma.ntcRule.findFirst({ where: { id, tenantId } })
    if (!rule) return rep.status(404).send({ error: 'Rule not found' })
    const updated = await prisma.ntcRule.update({ where: { id }, data: body as never })
    return rep.send(updated)
  })

  // T10: DELETE /notification-center/rules/:id
  app.delete('/rules/:id', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const rule = await prisma.ntcRule.findFirst({ where: { id, tenantId } })
    if (!rule) return rep.status(404).send({ error: 'Rule not found' })
    await prisma.ntcRule.delete({ where: { id } })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'RULE_DELETE', module: 'notification-center', entityType: 'NtcRule', entityId: id, newValues: {} as never },
    }).catch(() => null)
    return rep.send({ success: true, id })
  })

  // ── Send ──────────────────────────────────────────────────────────────────────

  // T11: POST /notification-center/send — send using template
  app.post('/send', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { templateId: string; recipientIds: string[]; variables?: Record<string, string>; channels?: string[] }
    if (!body.templateId || !body.recipientIds?.length)
      return rep.status(400).send({ error: 'templateId and recipientIds required' })

    const tpl = await prisma.ntcTemplate.findFirst({ where: { id: body.templateId, tenantId } })
    if (!tpl) return rep.status(404).send({ error: 'Template not found' })
    const tplData = tpl as unknown as { titleTpl: string; bodyTpl: string; priority: string; channels: string[] }

    const vars = body.variables ?? {}
    const title = interpolate(tplData.titleTpl, vars)
    const bodyText = interpolate(tplData.bodyTpl, vars)
    const channels = body.channels ?? tplData.channels ?? ['in_app']

    const notifications = await prisma.$transaction(
      body.recipientIds.map(uid =>
        prisma.sysNotification.create({
          data: { tenantId, userId: uid, type: (tpl as unknown as { eventType: string }).eventType, title, body: bodyText, channel: channels[0] ?? 'in_app', sentAt: new Date(), createdBy: userId } as never,
        }),
      ),
    )

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'NOTIFICATION_SEND', module: 'notification-center', entityType: 'SysNotification', entityId: body.templateId, newValues: { recipients: body.recipientIds.length, channels } as never },
    }).catch(() => null)

    // Simulate rule trigger tracking
    await prisma.ntcRule.updateMany({
      where: { tenantId, templateId: body.templateId, isActive: true },
      data: { runCount: { increment: 1 }, lastTriggeredAt: new Date() } as never,
    })

    return rep.status(201).send({ sent: notifications.length, title, channels, notifications })
  })

  // ── Broadcast ─────────────────────────────────────────────────────────────────

  // T12: POST /notification-center/broadcast
  app.post('/broadcast', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { title: string; body: string; priority?: string; channels?: string[]; targetType?: string; targetIds?: string[] }
    if (!body.title || !body.body) return rep.status(400).send({ error: 'title and body required' })

    const users = await prisma.coreUser.findMany({ where: { tenantId }, select: { id: true } })

    const broadcast = await prisma.ntcBroadcast.create({
      data: {
        tenantId, createdBy: userId, title: body.title, body: body.body,
        priority: body.priority ?? 'normal',
        channels: (body.channels ?? ['in_app']) as never,
        targetType: body.targetType ?? 'all',
        targetIds: (body.targetIds ?? []) as never,
        sentCount: users.length, sentAt: new Date(),
      } as never,
    })

    // Create in-app notification for each user
    if (users.length > 0) {
      await prisma.sysNotification.createMany({
        data: users.map(u => ({ tenantId, userId: u.id, type: 'broadcast', title: body.title, body: body.body, channel: 'in_app', sentAt: new Date(), createdBy: userId })) as never,
        skipDuplicates: true,
      })
    }

    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'BROADCAST_SEND', module: 'notification-center', entityType: 'NtcBroadcast', entityId: (broadcast as unknown as { id: string }).id, newValues: { sentCount: users.length } as never },
    }).catch(() => null)
    return rep.status(201).send({ ...broadcast, sentCount: users.length })
  })

  // T13: GET /notification-center/broadcasts
  app.get('/broadcasts', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const broadcasts = await prisma.ntcBroadcast.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 50 })
    return rep.send({ broadcasts, total: broadcasts.length })
  })

  // ── History (uses SysNotification) ───────────────────────────────────────────

  // T14: GET /notification-center/history
  app.get('/history', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const q = req.query as { unread?: string; channel?: string; limit?: string }
    const where: Record<string, unknown> = { tenantId, userId }
    if (q.unread === 'true') where.readAt = null
    if (q.channel) where.channel = q.channel
    const notifications = await prisma.sysNotification.findMany({
      where: where as never,
      orderBy: { createdAt: 'desc' },
      take: Number(q.limit ?? 50),
    })
    const unreadCount = await prisma.sysNotification.count({ where: { tenantId, userId, readAt: null } as never })
    return rep.send({ notifications, total: notifications.length, unreadCount })
  })

  // T15: PATCH /notification-center/history/:id/read
  app.patch('/history/:id/read', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const notif = await prisma.sysNotification.findFirst({ where: { id, tenantId, userId } as never })
    if (!notif) return rep.status(404).send({ error: 'Notification not found' })
    const updated = await prisma.sysNotification.update({ where: { id }, data: { readAt: new Date() } as never })
    return rep.send(updated)
  })

  // T16: POST /notification-center/history/read-all
  app.post('/history/read-all', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { count } = await prisma.sysNotification.updateMany({
      where: { tenantId, userId, readAt: null } as never,
      data: { readAt: new Date() } as never,
    })
    return rep.send({ success: true, markedRead: count })
  })

  // ── Preferences ───────────────────────────────────────────────────────────────

  // T17: GET /notification-center/preferences
  app.get('/preferences', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    let prefs = await prisma.ntcPreference.findFirst({ where: { tenantId, userId } })
    if (!prefs) {
      prefs = await prisma.ntcPreference.create({
        data: { tenantId, userId } as never,
      })
    }
    return rep.send(prefs)
  })

  // T18: PUT /notification-center/preferences
  app.put('/preferences', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as Record<string, unknown>
    const prefs = await prisma.ntcPreference.upsert({
      where: { tenantId_userId: { tenantId, userId } } as never,
      create: { tenantId, userId, ...body } as never,
      update: body as never,
    })
    return rep.send(prefs)
  })

  // ── Channels ──────────────────────────────────────────────────────────────────

  // T19: POST /notification-center/channels
  app.post('/channels', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { channelType: string; name: string; config?: object }
    if (!body.channelType || !body.name) return rep.status(400).send({ error: 'channelType and name required' })
    const ch = await prisma.ntcChannel.create({
      data: { tenantId, channelType: body.channelType, name: body.name, config: (body.config ?? {}) as never } as never,
    })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'CHANNEL_ADD', module: 'notification-center', entityType: 'NtcChannel', entityId: (ch as unknown as { id: string }).id, newValues: { channelType: body.channelType } as never },
    }).catch(() => null)
    return rep.status(201).send(ch)
  })

  // T20: GET /notification-center/channels
  app.get('/channels', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const channels = await prisma.ntcChannel.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } })
    return rep.send({ channels, total: channels.length })
  })

  // T21: PATCH /notification-center/channels/:id
  app.patch('/channels/:id', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const body = req.body as Record<string, unknown>
    const ch = await prisma.ntcChannel.findFirst({ where: { id, tenantId } })
    if (!ch) return rep.status(404).send({ error: 'Channel not found' })
    const updated = await prisma.ntcChannel.update({ where: { id }, data: body as never })
    return rep.send(updated)
  })

  // T22: POST /notification-center/channels/:id/test
  app.post('/channels/:id/test', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const ch = await prisma.ntcChannel.findFirst({ where: { id, tenantId } })
    if (!ch) return rep.status(404).send({ error: 'Channel not found' })
    await prisma.ntcChannel.update({ where: { id }, data: { testSentAt: new Date() } as never })
    return rep.send({ success: true, message: `Test notification sent via ${(ch as unknown as { channelType: string }).channelType}`, simulatedAt: new Date() })
  })

  // T23: DELETE /notification-center/channels/:id
  app.delete('/channels/:id', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const ch = await prisma.ntcChannel.findFirst({ where: { id, tenantId } })
    if (!ch) return rep.status(404).send({ error: 'Channel not found' })
    await prisma.ntcChannel.delete({ where: { id } })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'CHANNEL_DELETE', module: 'notification-center', entityType: 'NtcChannel', entityId: id, newValues: {} as never },
    }).catch(() => null)
    return rep.send({ success: true, id })
  })

  // ── Digests ───────────────────────────────────────────────────────────────────

  // T24: POST /notification-center/digests — create/queue a digest
  app.post('/digests', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { frequency?: string; items?: object[] }
    const frequency = body.frequency ?? 'daily'
    const pending = await prisma.sysNotification.findMany({
      where: { tenantId, userId, readAt: null, channel: 'in_app' } as never,
      take: 20,
      orderBy: { createdAt: 'desc' },
    })
    const items = pending.map(n => ({ id: (n as unknown as { id: string }).id, title: (n as unknown as { title: string }).title, createdAt: (n as unknown as { createdAt: Date }).createdAt }))
    const digest = await prisma.ntcDigest.create({
      data: {
        tenantId, userId, frequency,
        items: items as never,
        scheduledAt: nextDigestAt(frequency),
        itemCount: items.length,
        status: items.length > 0 ? 'sent' : 'empty',
        sentAt: new Date(),
      } as never,
    })
    return rep.status(201).send({ ...digest, itemCount: items.length, items })
  })

  // T25: GET /notification-center/digests
  app.get('/digests', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const digests = await prisma.ntcDigest.findMany({ where: { tenantId, userId }, orderBy: { createdAt: 'desc' }, take: 20 })
    return rep.send({ digests, total: digests.length })
  })

  // ── Stats ─────────────────────────────────────────────────────────────────────

  // T26: GET /notification-center/stats
  app.get('/stats', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const [totalNotifs, unreadCount, templateCount, ruleCount, broadcastCount, channelCount] = await Promise.all([
      prisma.sysNotification.count({ where: { tenantId, userId } as never }),
      prisma.sysNotification.count({ where: { tenantId, userId, readAt: null } as never }),
      prisma.ntcTemplate.count({ where: { tenantId } }),
      prisma.ntcRule.count({ where: { tenantId } }),
      prisma.ntcBroadcast.count({ where: { tenantId } }),
      prisma.ntcChannel.count({ where: { tenantId } }),
    ])
    return rep.send({ totalNotifications: totalNotifs, unread: unreadCount, templates: templateCount, rules: ruleCount, broadcasts: broadcastCount, channels: channelCount })
  })
}
