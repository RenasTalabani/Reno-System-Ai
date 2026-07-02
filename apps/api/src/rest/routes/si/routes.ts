// Phase 58 — AI Sales Intelligence & Pipeline Optimizer: Routes

import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import { STAGES, analyzeDeal, scoreLeadAI, forecastPipeline, computeSalesKpis } from './ai-engine.js'

export async function siRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Dashboard ──────────────────────────────────────────────────────────────
  app.get('/dashboard', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const [deals, recentDeals, topLeads, recentForecast] = await Promise.all([
      prisma.siDeal.findMany({ where: { tenantId } }),
      prisma.siDeal.findMany({ where: { tenantId }, orderBy: { updatedAt: 'desc' }, take: 5 }),
      prisma.siLeadScore.findMany({ where: { tenantId }, orderBy: { overallScore: 'desc' }, take: 5 }),
      prisma.siSalesForecast.findFirst({ where: { tenantId }, orderBy: { generatedAt: 'desc' } }),
    ])
    const kpis = computeSalesKpis(deals)
    const pipelineSummary = forecastPipeline(deals.map(d => ({ value: d.value, aiProbability: d.aiProbability, probability: d.probability, stage: d.stage })))
    const stageBreakdown = STAGES.map(s => ({ ...s, count: deals.filter(d => d.stage === s.id).length, value: deals.filter(d => d.stage === s.id).reduce((sum, d) => sum + d.value, 0) }))
    return { kpis, pipelineSummary, stageBreakdown, recentDeals, topLeads, recentForecast, stages: STAGES }
  })

  // ── Deals ──────────────────────────────────────────────────────────────────
  app.get('/deals', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const q = req.query as { stage?: string; source?: string }
    const deals = await prisma.siDeal.findMany({
      where: { tenantId, ...(q.stage && { stage: q.stage }), ...(q.source && { source: q.source }) },
      orderBy: [{ stage: 'asc' }, { value: 'desc' }],
    })
    return { deals }
  })

  app.post('/deals', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { title: string; contactName: string; company?: string; stage?: string; value?: number; source?: string; expectedCloseAt?: string }
    const deal = await prisma.siDeal.create({
      data: {
        tenantId, title: body.title, contactName: body.contactName, company: body.company,
        stage: body.stage ?? 'prospecting', value: body.value ?? 0,
        probability: STAGES.find(s => s.id === (body.stage ?? 'prospecting'))?.defaultProbability ?? 10,
        source: body.source ?? 'inbound',
        expectedCloseAt: body.expectedCloseAt ? new Date(body.expectedCloseAt) : undefined,
      },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'create', module: 'si', entityType: 'deal', entityId: deal.id, newValues: body as never } }).catch(() => null)
    return reply.code(201).send(deal)
  })

  app.get('/deals/:id', async (req) => {
    const { id } = req.params as { id: string }
    const deal = await prisma.siDeal.findUniqueOrThrow({ where: { id }, include: { opportunities: true } })
    return deal
  })

  app.patch('/deals/:id', async (req) => {
    const { id } = req.params as { id: string }
    const body = req.body as Record<string, unknown>
    if (body.stage) {
      const stage = STAGES.find(s => s.id === body.stage)
      if (stage) body.probability = stage.defaultProbability
      if (body.stage === 'closed_won' || body.stage === 'closed_lost') body.closedAt = new Date() as never
    }
    return prisma.siDeal.update({ where: { id }, data: body as never })
  })

  app.delete('/deals/:id', async (req) => {
    const { id } = req.params as { id: string }
    await prisma.siDeal.delete({ where: { id } })
    return { success: true }
  })

  // AI Analysis for a deal
  app.post('/deals/:id/analyze', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const deal = await prisma.siDeal.findUniqueOrThrow({ where: { id } })
    const analysis = analyzeDeal(deal)

    // Persist opportunities
    const createdOpps = await Promise.all(analysis.opportunities.map(o =>
      prisma.siOpportunity.create({ data: { tenantId, dealId: id, type: o.type, title: o.title, value: o.value, confidence: o.confidence, reasoning: o.reasoning, aiGenerated: true } })
    ))

    await prisma.siDeal.update({
      where: { id },
      data: { aiProbability: analysis.aiProbability, aiInsights: analysis.insights as never, nextBestAction: analysis.nextBestAction },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'analyze', module: 'si', entityType: 'deal', entityId: id, newValues: { aiProbability: analysis.aiProbability } as never } }).catch(() => null)
    return { analysis, opportunities: createdOpps }
  })

  // ── Opportunities ──────────────────────────────────────────────────────────
  app.get('/opportunities', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const opps = await prisma.siOpportunity.findMany({ where: { tenantId }, orderBy: { confidence: 'desc' } })
    return { opportunities: opps }
  })

  app.patch('/opportunities/:id', async (req) => {
    const { id } = req.params as { id: string }
    const body = req.body as Record<string, unknown>
    return prisma.siOpportunity.update({ where: { id }, data: body as never })
  })

  // ── Lead Scoring ───────────────────────────────────────────────────────────
  app.get('/leads', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const leads = await prisma.siLeadScore.findMany({ where: { tenantId }, orderBy: { overallScore: 'desc' } })
    return { leads }
  })

  app.post('/leads/score', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { contactName: string; contactEmail?: string; company?: string; source?: string; contactId?: string }
    const result = scoreLeadAI(body)

    const lead = await prisma.siLeadScore.create({
      data: { tenantId, contactId: body.contactId ?? null, contactName: body.contactName, contactEmail: body.contactEmail, company: body.company, overallScore: result.overallScore, fitScore: result.fitScore, intentScore: result.intentScore, engagementScore: result.engagementScore, grade: result.grade, signals: result.signals as never, recommendation: result.recommendation },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'score_lead', module: 'si', entityType: 'lead', entityId: lead.id, newValues: { grade: result.grade, score: result.overallScore } as never } }).catch(() => null)
    return reply.code(201).send({ lead, result })
  })

  app.delete('/leads/:id', async (req) => {
    const { id } = req.params as { id: string }
    await prisma.siLeadScore.delete({ where: { id } })
    return { success: true }
  })

  // ── Forecast ───────────────────────────────────────────────────────────────
  app.get('/forecast', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const forecasts = await prisma.siSalesForecast.findMany({ where: { tenantId }, orderBy: { generatedAt: 'desc' }, take: 12 })
    return { forecasts }
  })

  app.post('/forecast/generate', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = (req.body ?? {}) as { period?: string; forecastType?: string }
    const deals = await prisma.siDeal.findMany({ where: { tenantId } })
    const result = forecastPipeline(deals.map(d => ({ value: d.value, aiProbability: d.aiProbability, probability: d.probability, stage: d.stage })))

    const period = body.period ?? new Date().toISOString().substring(0, 7)
    const forecastType = body.forecastType ?? 'monthly'

    const forecast = await prisma.siSalesForecast.upsert({
      where: { tenantId_period_forecastType: { tenantId, period, forecastType } },
      create: { tenantId, period, forecastType, committed: result.committed, bestCase: result.bestCase, pipeline: result.pipeline, aiAdjusted: result.aiAdjusted, aiConfidence: result.aiConfidence, aiSummary: result.aiSummary, dealCount: result.dealCount },
      update: { committed: result.committed, bestCase: result.bestCase, pipeline: result.pipeline, aiAdjusted: result.aiAdjusted, aiConfidence: result.aiConfidence, aiSummary: result.aiSummary, dealCount: result.dealCount, generatedAt: new Date() },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'generate_forecast', module: 'si', entityType: 'forecast', entityId: forecast.id, newValues: { aiAdjusted: result.aiAdjusted } as never } }).catch(() => null)
    return reply.code(201).send({ forecast, result })
  })

  // ── Pipeline view ──────────────────────────────────────────────────────────
  app.get('/pipeline', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const deals = await prisma.siDeal.findMany({ where: { tenantId }, orderBy: { value: 'desc' } })
    const byStage = STAGES.map(s => ({
      ...s,
      deals: deals.filter(d => d.stage === s.id),
      totalValue: deals.filter(d => d.stage === s.id).reduce((sum, d) => sum + d.value, 0),
    }))
    return { byStage, stages: STAGES }
  })
}
