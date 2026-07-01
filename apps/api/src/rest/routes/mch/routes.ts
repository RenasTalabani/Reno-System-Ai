// Phase 54 — AI Multi-Channel Communication Hub: Routes

import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import {
  BUILT_IN_TEMPLATES, CHANNEL_TYPES, personalizeTemplate, simulateSend,
  calculateCampaignMetrics, optimizeSubjectLine, generateCommSummary,
} from './ai-engine.js'

export async function mchRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Dashboard ──────────────────────────────────────────────────────────────
  app.get('/dashboard', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const [totalMessages, totalDelivered, campaigns, channels, recentMessages] = await Promise.all([
      prisma.mchMessage.count({ where: { tenantId } }),
      prisma.mchMessage.count({ where: { tenantId, status: 'delivered' } }),
      prisma.mchCampaign.count({ where: { tenantId } }),
      prisma.mchChannel.count({ where: { tenantId, isActive: true } }),
      prisma.mchMessage.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, channelType: true, toAddress: true, status: true, createdAt: true, subject: true } }),
    ])
    const channelBreakdown = await prisma.mchMessage.groupBy({ by: ['channelType'], where: { tenantId }, _count: true })
    return {
      summary: generateCommSummary(totalMessages, campaigns, channels, totalDelivered),
      stats: { totalMessages, totalDelivered, totalCampaigns: campaigns, activeChannels: channels },
      channelBreakdown: channelBreakdown.map(c => ({ channelType: c.channelType, count: c._count })),
      recentMessages,
    }
  })

  // ── Channels ───────────────────────────────────────────────────────────────
  app.get('/channels', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const channels = await prisma.mchChannel.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } })
    return { channels, availableTypes: [...CHANNEL_TYPES] }
  })

  app.post('/channels', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { name: string; channelType: string; config?: Record<string, unknown> }
    const channel = await prisma.mchChannel.create({
      data: { tenantId, name: body.name, channelType: body.channelType, config: (body.config ?? {}) as never },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'create', module: 'mch', entityType: 'channel', entityId: channel.id, newValues: body as never } }).catch(() => null)
    return channel
  })

  app.patch('/channels/:id', async (req) => {
    const { id } = req.params as { id: string }
    const body = req.body as Record<string, unknown>
    const channel = await prisma.mchChannel.update({ where: { id }, data: body as never })
    return channel
  })

  app.delete('/channels/:id', async (req) => {
    const { id } = req.params as { id: string }
    await prisma.mchChannel.delete({ where: { id } })
    return { success: true }
  })

  // ── Messages ───────────────────────────────────────────────────────────────
  app.get('/messages', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const q = req.query as { channelType?: string; status?: string; conversationId?: string }
    const messages = await prisma.mchMessage.findMany({
      where: { tenantId, ...(q.channelType && { channelType: q.channelType }), ...(q.status && { status: q.status }), ...(q.conversationId && { conversationId: q.conversationId }) },
      orderBy: { createdAt: 'desc' }, take: 50,
    })
    return { messages }
  })

  app.post('/messages/send', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as {
      channelType: string; toAddress: string; fromAddress?: string
      subject?: string; body: string; bodyHtml?: string
      templateId?: string; variables?: Record<string, string>
      conversationId?: string; channelId?: string; aiGenerated?: boolean
    }

    let finalBody = body.body
    let finalSubject = body.subject

    if (body.templateId && body.variables) {
      finalBody = personalizeTemplate(body.body, body.variables)
      if (finalSubject) finalSubject = personalizeTemplate(finalSubject, body.variables)
    }

    const simResult = simulateSend(body.channelType, body.toAddress, finalBody)

    const message = await prisma.mchMessage.create({
      data: {
        tenantId, channelType: body.channelType,
        fromAddress: body.fromAddress ?? `noreply@reno.system`,
        toAddress: body.toAddress,
        subject: finalSubject,
        body: finalBody,
        bodyHtml: body.bodyHtml,
        status: simResult.status,
        deliveredAt: simResult.status === 'delivered' ? new Date() : undefined,
        failureReason: simResult.failureReason,
        aiGenerated: body.aiGenerated ?? false,
        templateId: body.templateId,
        channelId: body.channelId,
        conversationId: body.conversationId,
      },
    })

    if (body.channelId) {
      await prisma.mchChannel.update({
        where: { id: body.channelId },
        data: {
          totalSent: { increment: 1 },
          ...(simResult.status === 'failed' && { totalFailed: { increment: 1 } }),
          lastUsedAt: new Date(),
        },
      }).catch(() => null)
    }

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'send', module: 'mch', entityType: 'message', entityId: message.id, newValues: { channelType: body.channelType, to: body.toAddress, status: simResult.status } as never } }).catch(() => null)
    return { ...message, simDurationMs: simResult.durationMs }
  })

  // Simulate open/click tracking
  app.patch('/messages/:id/track', async (req) => {
    const { id } = req.params as { id: string }
    const { event } = req.body as { event: 'opened' | 'clicked' }
    const data: Record<string, unknown> = {}
    if (event === 'opened') data.openedAt = new Date()
    if (event === 'clicked') data.clickedAt = new Date()
    const message = await prisma.mchMessage.update({ where: { id }, data: data as never })
    return message
  })

  // ── Conversations ──────────────────────────────────────────────────────────
  app.get('/conversations', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const convs = await prisma.mchConversation.findMany({
      where: { tenantId }, orderBy: { lastMessageAt: 'desc' }, take: 50,
      include: { _count: { select: { messages: true } } },
    })
    return { conversations: convs }
  })

  app.post('/conversations', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const body = req.body as { channelType: string; participantRef: string; subject?: string }
    const conv = await prisma.mchConversation.create({
      data: { tenantId, channelType: body.channelType, participantRef: body.participantRef, subject: body.subject },
    })
    return conv
  })

  app.patch('/conversations/:id', async (req) => {
    const { id } = req.params as { id: string }
    const body = req.body as Record<string, unknown>
    const conv = await prisma.mchConversation.update({ where: { id }, data: body as never })
    return conv
  })

  // ── Templates ──────────────────────────────────────────────────────────────
  app.get('/template-library', async () => ({ templates: BUILT_IN_TEMPLATES }))

  app.post('/template-library/install', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { slug } = req.body as { slug: string }
    const tmpl = BUILT_IN_TEMPLATES.find(t => t.slug === slug)
    if (!tmpl) return { error: `Template '${slug}' not found` }
    const existing = await prisma.mchTemplate.findUnique({ where: { tenantId_slug: { tenantId, slug } } })
    if (existing) return { ...existing, alreadyInstalled: true }
    const tpl = await prisma.mchTemplate.create({
      data: {
        tenantId, name: tmpl.name, slug: tmpl.slug, channelType: tmpl.channelType,
        category: tmpl.category, subject: tmpl.subject, body: tmpl.body,
        bodyHtml: tmpl.bodyHtml, variables: tmpl.variables as never,
      },
    })
    return tpl
  })

  app.get('/templates', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const q = req.query as { channelType?: string }
    const templates = await prisma.mchTemplate.findMany({
      where: { tenantId, isActive: true, ...(q.channelType && { channelType: q.channelType }) },
      orderBy: { timesUsed: 'desc' },
    })
    return { templates }
  })

  app.post('/templates', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const body = req.body as { name: string; slug: string; channelType: string; category?: string; subject?: string; body: string; variables?: string[] }
    const template = await prisma.mchTemplate.create({
      data: { tenantId, name: body.name, slug: body.slug, channelType: body.channelType, category: body.category ?? 'custom', subject: body.subject, body: body.body, variables: (body.variables ?? []) as never },
    })
    return template
  })

  app.delete('/templates/:id', async (req) => {
    const { id } = req.params as { id: string }
    await prisma.mchTemplate.delete({ where: { id } })
    return { success: true }
  })

  // ── Campaigns ──────────────────────────────────────────────────────────────
  app.get('/campaigns', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const campaigns = await prisma.mchCampaign.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } })
    return { campaigns }
  })

  app.post('/campaigns', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { name: string; slug: string; channelType: string; bodyTemplate: string; subject?: string; audience?: Record<string, unknown> }
    const campaign = await prisma.mchCampaign.create({
      data: {
        tenantId, name: body.name, slug: body.slug, channelType: body.channelType,
        bodyTemplate: body.bodyTemplate, subject: body.subject,
        audience: (body.audience ?? {}) as never, createdBy: userId,
      },
    })
    return campaign
  })

  app.patch('/campaigns/:id', async (req) => {
    const { id } = req.params as { id: string }
    const body = req.body as Record<string, unknown>
    const campaign = await prisma.mchCampaign.update({ where: { id }, data: body as never })
    return campaign
  })

  // Launch campaign (simulate send to audience)
  app.post('/campaigns/:id/launch', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const campaign = await prisma.mchCampaign.findFirst({ where: { id, tenantId } })
    if (!campaign) return { error: 'Campaign not found' }
    if (campaign.status === 'sent') return { error: 'Campaign already sent' }

    // Simulate audience (5-50 recipients)
    const recipients = 5 + Math.floor(Math.random() * 45)
    const sent = recipients
    const failed = Math.floor(recipients * 0.03)
    const delivered = sent - failed
    const opened = Math.floor(delivered * (0.20 + Math.random() * 0.25))
    const clicked = Math.floor(opened * (0.10 + Math.random() * 0.20))

    // Optimize subject line with AI
    const optimizedSubject = campaign.subject
      ? optimizeSubjectLine(campaign.subject, campaign.channelType)
      : undefined

    const updated = await prisma.mchCampaign.update({
      where: { id },
      data: {
        status: 'sent', sentAt: new Date(), totalRecipients: recipients,
        totalSent: sent, totalDelivered: delivered, totalOpened: opened,
        totalClicked: clicked, totalFailed: failed, aiOptimized: true,
        ...(optimizedSubject && { subject: optimizedSubject }),
      },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'launch_campaign', module: 'mch', entityType: 'campaign', entityId: id, newValues: { recipients, sent, delivered } as never } }).catch(() => null)
    const metrics = calculateCampaignMetrics(sent, delivered, opened, clicked, failed)
    return { campaign: updated, metrics }
  })

  app.get('/campaigns/:id/metrics', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const campaign = await prisma.mchCampaign.findFirst({ where: { id, tenantId } })
    if (!campaign) return { error: 'Not found' }
    const metrics = calculateCampaignMetrics(campaign.totalSent, campaign.totalDelivered, campaign.totalOpened, campaign.totalClicked, campaign.totalFailed)
    return { campaign, metrics }
  })

  app.delete('/campaigns/:id', async (req) => {
    const { id } = req.params as { id: string }
    await prisma.mchCampaign.delete({ where: { id } })
    return { success: true }
  })
}
