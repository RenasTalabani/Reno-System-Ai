import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import { analyzeCampaign, scoreAudience, scoreContent, generateMarketingInsights, computeMarketingKpis } from './ai-engine.js'

export async function mkiRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Dashboard ─────────────────────────────────────────────────────────────
  app.get('/dashboard', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const [campaigns, audiences, insights] = await Promise.all([
      prisma.mkiCampaign.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.mkiAudience.findMany({ where: { tenantId }, orderBy: { aiScore: 'desc' }, take: 10 }),
      prisma.mkiMarketingInsight.findMany({ where: { tenantId }, orderBy: { generatedAt: 'desc' }, take: 5 }),
    ])
    const kpis = computeMarketingKpis(campaigns as any[])
    return { kpis, topCampaigns: campaigns.slice(0, 5), topAudiences: audiences.slice(0, 5), insights }
  })

  // ── Campaigns ─────────────────────────────────────────────────────────────
  app.get('/campaigns', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    return prisma.mkiCampaign.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } })
  })

  app.post('/campaigns', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as any
    const analysis = analyzeCampaign({ budget: body.budget ?? 0, spent: body.spent ?? 0, impressions: body.impressions ?? 0, clicks: body.clicks ?? 0, conversions: body.conversions ?? 0, revenue: body.revenue ?? 0, channel: body.channel ?? 'email' })
    const campaign = await prisma.mkiCampaign.create({
      data: { tenantId, name: body.name, channel: body.channel ?? 'email', status: body.status ?? 'draft', budget: body.budget ?? 0, spent: body.spent ?? 0, impressions: body.impressions ?? 0, clicks: body.clicks ?? 0, conversions: body.conversions ?? 0, revenue: body.revenue ?? 0, aiRoiScore: analysis.aiRoiScore, aiPerformance: analysis.aiPerformance, aiRecommendations: analysis.recommendations as never, startDate: body.startDate ? new Date(body.startDate) : undefined, endDate: body.endDate ? new Date(body.endDate) : undefined, metadata: (body.metadata ?? {}) as never },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'mki', entityType: 'MkiCampaign', entityId: campaign.id, newValues: campaign as never } as never }).catch(() => null)
    return reply.code(201).send(campaign)
  })

  app.get('/campaigns/:id', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    return prisma.mkiCampaign.findFirst({ where: { id, tenantId } })
  })

  app.patch('/campaigns/:id', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = req.body as any
    const existing = await prisma.mkiCampaign.findFirst({ where: { id, tenantId } })
    if (!existing) return { error: 'NOT_FOUND' }
    const merged = { budget: body.budget ?? existing.budget, spent: body.spent ?? existing.spent, impressions: body.impressions ?? existing.impressions, clicks: body.clicks ?? existing.clicks, conversions: body.conversions ?? existing.conversions, revenue: body.revenue ?? existing.revenue, channel: body.channel ?? existing.channel }
    const analysis = analyzeCampaign(merged as any)
    const campaign = await prisma.mkiCampaign.update({ where: { id }, data: { ...body, aiRoiScore: analysis.aiRoiScore, aiPerformance: analysis.aiPerformance, aiRecommendations: analysis.recommendations as never } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE', module: 'mki', entityType: 'MkiCampaign', entityId: id, newValues: body as never } as never }).catch(() => null)
    return campaign
  })

  app.delete('/campaigns/:id', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    await prisma.mkiCampaign.deleteMany({ where: { id, tenantId } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'DELETE', module: 'mki', entityType: 'MkiCampaign', entityId: id, newValues: {} as never } as never }).catch(() => null)
    return reply.code(204).send()
  })

  app.post('/campaigns/:id/analyze', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const campaign = await prisma.mkiCampaign.findFirst({ where: { id, tenantId } })
    if (!campaign) return { error: 'NOT_FOUND' }
    const analysis = analyzeCampaign({ budget: campaign.budget, spent: campaign.spent, impressions: campaign.impressions, clicks: campaign.clicks, conversions: campaign.conversions, revenue: campaign.revenue, channel: campaign.channel })
    return prisma.mkiCampaign.update({ where: { id }, data: { aiRoiScore: analysis.aiRoiScore, aiPerformance: analysis.aiPerformance, aiRecommendations: analysis.recommendations as never } })
  })

  // ── Audiences ─────────────────────────────────────────────────────────────
  app.get('/audiences', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    return prisma.mkiAudience.findMany({ where: { tenantId }, orderBy: { aiScore: 'desc' } })
  })

  app.post('/audiences', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as any
    const scored = scoreAudience({ size: body.size ?? 0, engagementRate: body.engagementRate ?? 0, conversionRate: body.conversionRate ?? 0, segmentType: body.segmentType ?? 'behavioral' })
    const audience = await prisma.mkiAudience.create({
      data: { tenantId, name: body.name, segmentType: body.segmentType ?? 'behavioral', size: body.size ?? 0, engagementRate: body.engagementRate ?? 0, conversionRate: body.conversionRate ?? 0, aiScore: scored.aiScore, aiInsights: scored.insights as never, criteria: (body.criteria ?? {}) as never, metadata: (body.metadata ?? {}) as never },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'mki', entityType: 'MkiAudience', entityId: audience.id, newValues: audience as never } as never }).catch(() => null)
    return reply.code(201).send(audience)
  })

  app.delete('/audiences/:id', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    await prisma.mkiAudience.deleteMany({ where: { id, tenantId } })
    return reply.code(204).send()
  })

  // ── Content Scoring ───────────────────────────────────────────────────────
  app.get('/content-scores', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    return prisma.mkiContentScore.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } })
  })

  app.post('/content-scores', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as any
    const scored = scoreContent({ title: body.title, wordCount: body.wordCount ?? 0, contentType: body.contentType ?? 'blog', channel: body.channel ?? 'web' })
    const record = await prisma.mkiContentScore.create({
      data: { tenantId, title: body.title, contentType: body.contentType ?? 'blog', channel: body.channel ?? 'web', wordCount: body.wordCount ?? 0, seoScore: scored.seoScore, readabilityScore: scored.readabilityScore, engagementScore: scored.engagementScore, aiOverallScore: scored.aiOverallScore, aiGrade: scored.aiGrade, aiSuggestions: scored.suggestions as never, metadata: (body.metadata ?? {}) as never },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'mki', entityType: 'MkiContentScore', entityId: record.id, newValues: record as never } as never }).catch(() => null)
    return reply.code(201).send(record)
  })

  app.delete('/content-scores/:id', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    await prisma.mkiContentScore.deleteMany({ where: { id, tenantId } })
    return reply.code(204).send()
  })

  // ── Insights ──────────────────────────────────────────────────────────────
  app.get('/insights', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    return prisma.mkiMarketingInsight.findMany({ where: { tenantId }, orderBy: { generatedAt: 'desc' } })
  })

  app.post('/insights/generate', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const [campaigns, audiences] = await Promise.all([
      prisma.mkiCampaign.findMany({ where: { tenantId } }),
      prisma.mkiAudience.findMany({ where: { tenantId } }),
    ])
    const insightData = generateMarketingInsights(campaigns as any[], audiences as any[])
    const created = await Promise.all(
      insightData.map(i => prisma.mkiMarketingInsight.create({
        data: { tenantId, type: i.type, title: i.title, summary: i.summary, impact: i.impact, actionItems: i.actionItems as never, data: {} as never },
      }))
    )
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'AI_GENERATE', module: 'mki', entityType: 'MkiMarketingInsight', entityId: 'batch', newValues: { count: created.length } as never } as never }).catch(() => null)
    return reply.code(201).send(created)
  })
}
