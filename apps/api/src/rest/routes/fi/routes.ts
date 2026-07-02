// Phase 60 — AI Financial Intelligence & Cash Flow Optimizer: Routes

import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import { computePnl, forecastCashFlow, analyzeBudgetVariance, detectAnomalies, generateFinancialInsights } from './ai-engine.js'

export async function fiRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Dashboard ──────────────────────────────────────────────────────────────
  app.get('/dashboard', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const [entries, recentForecasts, alerts, insights] = await Promise.all([
      prisma.fiLedger.findMany({ where: { tenantId } }),
      prisma.fiCashForecast.findMany({ where: { tenantId }, orderBy: { generatedAt: 'desc' }, take: 3 }),
      prisma.fiBudgetAlert.findMany({ where: { tenantId, resolved: false }, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.fiFinancialInsight.findMany({ where: { tenantId }, orderBy: { generatedAt: 'desc' }, take: 5 }),
    ])
    const pnl = computePnl(entries)
    const cashFlow = forecastCashFlow(entries)
    return { pnl, cashFlow, recentForecasts, alerts, insights, entryCount: entries.length }
  })

  // ── Ledger Entries ─────────────────────────────────────────────────────────
  app.get('/ledger', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const q = req.query as { period?: string; category?: string; type?: string }
    const entries = await prisma.fiLedger.findMany({
      where: { tenantId, ...(q.period && { period: q.period }), ...(q.category && { category: q.category }), ...(q.type && { type: q.type }) },
      orderBy: { entryDate: 'desc' },
    })
    return { entries }
  })

  app.post('/ledger', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { period: string; category: string; subcategory?: string; description?: string; amount: number; budgeted?: number; type?: string; currency?: string }
    const entry = await prisma.fiLedger.create({
      data: { tenantId, period: body.period, category: body.category, subcategory: body.subcategory, description: body.description, amount: body.amount, budgeted: body.budgeted, type: body.type ?? 'actual', currency: body.currency ?? 'USD' },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'create', module: 'fi', entityType: 'ledger', entityId: entry.id, newValues: body as never } }).catch(() => null)
    return reply.code(201).send(entry)
  })

  app.delete('/ledger/:id', async (req) => {
    const { id } = req.params as { id: string }
    await prisma.fiLedger.delete({ where: { id } })
    return { success: true }
  })

  // ── P&L Analysis ──────────────────────────────────────────────────────────
  app.get('/pnl', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const q = req.query as { period?: string }
    const entries = await prisma.fiLedger.findMany({ where: { tenantId, ...(q.period && { period: q.period }) } })
    const pnl = computePnl(entries, q.period)
    const periods = [...new Set(entries.map(e => e.period))].sort()
    const periodPnls = periods.map(p => computePnl(entries, p))
    return { pnl, periodPnls, periods }
  })

  // ── Budget Variance ────────────────────────────────────────────────────────
  app.get('/budget-variance', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const q = req.query as { period?: string }
    const entries = await prisma.fiLedger.findMany({ where: { tenantId, ...(q.period && { period: q.period }) } })
    const variances = analyzeBudgetVariance(entries)

    // Create alerts for critical/warning variances
    const critical = variances.filter(v => v.severity !== 'info')
    return { variances, criticalCount: critical.length, totalVariance: variances.reduce((s, v) => s + v.variance, 0) }
  })

  app.post('/budget-alerts/generate', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = (req.body ?? {}) as { period?: string }
    const period = body.period ?? new Date().toISOString().substring(0, 7)
    const entries = await prisma.fiLedger.findMany({ where: { tenantId, period } })
    const variances = analyzeBudgetVariance(entries)

    const created = await Promise.all(variances.filter(v => v.severity !== 'info').map(v =>
      prisma.fiBudgetAlert.create({
        data: { tenantId, category: v.category, period, budgeted: v.budgeted, actual: v.actual, variance: v.variance, variancePct: v.variancePct, severity: v.severity, aiSuggestion: v.aiSuggestion },
      })
    ))
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'generate_alerts', module: 'fi', entityType: 'budget_alert', entityId: tenantId, newValues: { count: created.length } as never } }).catch(() => null)
    return reply.code(201).send({ alerts: created, period })
  })

  app.get('/budget-alerts', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    return { alerts: await prisma.fiBudgetAlert.findMany({ where: { tenantId }, orderBy: { severity: 'desc' } }) }
  })

  app.patch('/budget-alerts/:id', async (req) => {
    const { id } = req.params as { id: string }
    return prisma.fiBudgetAlert.update({ where: { id }, data: req.body as never })
  })

  // ── Cash Flow Forecast ─────────────────────────────────────────────────────
  app.get('/cash-forecast', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    return { forecasts: await prisma.fiCashForecast.findMany({ where: { tenantId }, orderBy: { period: 'desc' } }) }
  })

  app.post('/cash-forecast/generate', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = (req.body ?? {}) as { period?: string; openingBalance?: number; forecastType?: string }
    const period = body.period ?? new Date().toISOString().substring(0, 7)
    const entries = await prisma.fiLedger.findMany({ where: { tenantId, period } })
    const result = forecastCashFlow(entries, body.openingBalance ?? 0)

    const forecast = await prisma.fiCashForecast.upsert({
      where: { tenantId_period_forecastType: { tenantId, period, forecastType: body.forecastType ?? 'monthly' } },
      create: { tenantId, period, forecastType: body.forecastType ?? 'monthly', inflows: result.inflows, outflows: result.outflows, netCashFlow: result.netCashFlow, openingBalance: result.openingBalance, closingBalance: result.closingBalance, aiAdjusted: result.aiAdjusted, aiConfidence: result.aiConfidence, aiSummary: result.aiSummary },
      update: { inflows: result.inflows, outflows: result.outflows, netCashFlow: result.netCashFlow, openingBalance: result.openingBalance, closingBalance: result.closingBalance, aiAdjusted: result.aiAdjusted, aiConfidence: result.aiConfidence, aiSummary: result.aiSummary, generatedAt: new Date() },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'generate_forecast', module: 'fi', entityType: 'cash_forecast', entityId: forecast.id, newValues: { netCashFlow: result.netCashFlow } as never } }).catch(() => null)
    return reply.code(201).send({ forecast, result })
  })

  // ── Anomalies & Insights ───────────────────────────────────────────────────
  app.get('/anomalies', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const entries = await prisma.fiLedger.findMany({ where: { tenantId }, orderBy: { period: 'asc' } })
    return { anomalies: detectAnomalies(entries) }
  })

  app.get('/insights', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    return { insights: await prisma.fiFinancialInsight.findMany({ where: { tenantId }, orderBy: { generatedAt: 'desc' } }) }
  })

  app.post('/insights/generate', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const entries = await prisma.fiLedger.findMany({ where: { tenantId } })
    const pnl = computePnl(entries)
    const cashFlow = forecastCashFlow(entries)
    const anomalies = detectAnomalies(entries)
    const allInsights = [...generateFinancialInsights(pnl, cashFlow), ...anomalies]

    const created = await Promise.all(allInsights.map(ins =>
      prisma.fiFinancialInsight.create({
        data: { tenantId, type: ins.type, title: ins.title, summary: ins.summary, impact: ins.impact, severity: ins.severity, data: { pnl, cashFlow } as never, actionItems: ins.actionItems as never },
      })
    ))
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'generate_insights', module: 'fi', entityType: 'financial_insight', entityId: tenantId, newValues: { count: created.length } as never } }).catch(() => null)
    return reply.code(201).send({ insights: created, summary: { pnl, cashFlow } })
  })
}
