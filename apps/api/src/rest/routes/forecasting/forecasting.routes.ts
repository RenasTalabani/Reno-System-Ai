import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

// Simple linear regression over an array of [x, y] pairs
function linearRegression(points: [number, number][]): { slope: number; intercept: number; r2: number } {
  const n = points.length
  if (n < 2) return { slope: 0, intercept: points[0]?.[1] ?? 0, r2: 0 }
  const sumX = points.reduce((s, [x]) => s + x, 0)
  const sumY = points.reduce((s, [, y]) => s + y, 0)
  const sumXY = points.reduce((s, [x, y]) => s + x * y, 0)
  const sumX2 = points.reduce((s, [x]) => s + x * x, 0)
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  const yMean = sumY / n
  const ssTot = points.reduce((s, [, y]) => s + (y - yMean) ** 2, 0)
  const ssRes = points.reduce((s, [x, y]) => s + (y - (slope * x + intercept)) ** 2, 0)
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot
  return { slope, intercept, r2: Math.max(0, r2) }
}

export async function forecastingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Models ─────────────────────────────────────────────────────────────────

  app.get('/models', async (request, reply) => {
    const { tenantId } = request as any
    const models = await prisma.fcstModel.findMany({ where: { tenantId }, orderBy: { updatedAt: 'desc' }, include: { _count: { select: { predictions: true } } } })
    return reply.send(buildSuccessResponse(models))
  })

  app.post('/models', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any
    const model = await prisma.fcstModel.create({
      data: { tenantId, createdBy: userId, name: body.name, type: body.type ?? 'revenue', targetMetric: body.targetMetric ?? 'revenue', features: body.features ?? [], config: body.config ?? {} },
    })
    return reply.status(201).send(buildSuccessResponse(model))
  })

  // POST /forecasting/models/:id/train — run linear regression over historical data
  app.post('/models/:id/train', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const model = await prisma.fcstModel.findFirst({ where: { id, tenantId } })
    if (!model) throw new RenoError(ErrorCode.NOT_FOUND, 'Model not found', 404)

    // Pull historical revenue by month from sales_invoices
    const rows: Array<{ month: string; total: bigint }> = await prisma.$queryRaw`
      SELECT TO_CHAR(issue_date, 'YYYY-MM') AS month, SUM(total_amount)::bigint AS total
      FROM sales_invoices
      WHERE tenant_id = ${tenantId}::uuid AND status = 'paid'
      GROUP BY month ORDER BY month ASC LIMIT 24
    `

    if (rows.length < 3) {
      return reply.send(buildSuccessResponse({ message: 'Not enough data to train (need ≥3 months)', predictions: [] }))
    }

    const points: [number, number][] = rows.map((r, i) => [i, Number(r.total)])
    const { slope, intercept, r2 } = linearRegression(points)
    const accuracy = Math.round(r2 * 100)

    // Generate predictions for next 6 months
    const lastIdx = rows.length - 1
    const lastMonth = rows[lastIdx].month
    const [yr, mo] = lastMonth.split('-').map(Number)
    const predictions: Array<{ period: string; predicted: number; lowerBound: number; upperBound: number; confidence: number }> = []
    for (let i = 1; i <= 6; i++) {
      const futureIdx = lastIdx + i
      const predicted = Math.max(0, slope * futureIdx + intercept)
      const stdErr = predicted * 0.1 // 10% confidence interval stub
      const month = new Date(yr, mo - 1 + i)
      const period = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
      predictions.push({ period, predicted, lowerBound: predicted - stdErr, upperBound: predicted + stdErr, confidence: accuracy })
    }

    // Upsert predictions
    await prisma.$transaction([
      prisma.fcstModel.update({ where: { id }, data: { status: 'trained', accuracy, lastTrainedAt: new Date() } }),
      ...predictions.map(p => prisma.fcstPrediction.upsert({
        where: { id: `00000000-0000-0000-0000-000000000000` }, // dummy — always create
        create: { tenantId, modelId: id, period: p.period, metric: model.targetMetric, predicted: p.predicted, lowerBound: p.lowerBound, upperBound: p.upperBound, confidence: p.confidence },
        update: {},
      })),
    ])

    // Actually just createMany for predictions
    await prisma.fcstPrediction.createMany({
      data: predictions.map(p => ({ tenantId, modelId: id, period: p.period, metric: model.targetMetric, predicted: p.predicted, lowerBound: p.lowerBound, upperBound: p.upperBound, confidence: p.confidence })),
      skipDuplicates: true,
    })

    return reply.send(buildSuccessResponse({ accuracy, r2, trained: true, predictions }))
  })

  app.get('/models/:id/predictions', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const predictions = await prisma.fcstPrediction.findMany({ where: { modelId: id, tenantId }, orderBy: { period: 'asc' } })
    return reply.send(buildSuccessResponse(predictions))
  })

  // ── Anomaly Detection ──────────────────────────────────────────────────────

  // POST /forecasting/anomalies/detect — scan recent data for anomalies
  app.post('/anomalies/detect', async (request, reply) => {
    const { tenantId } = request as any

    // Pull last 12 months of revenue
    const rows: Array<{ month: string; total: bigint }> = await prisma.$queryRaw`
      SELECT TO_CHAR(issue_date, 'YYYY-MM') AS month, SUM(total_amount)::bigint AS total
      FROM sales_invoices
      WHERE tenant_id = ${tenantId}::uuid AND status = 'paid'
      GROUP BY month ORDER BY month ASC LIMIT 12
    `

    if (rows.length < 4) return reply.send(buildSuccessResponse({ anomalies: [] }))

    const values = rows.map(r => Number(r.total))
    const mean = values.reduce((s, v) => s + v, 0) / values.length
    const stdDev = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length)

    const anomalies: Array<{ metric: string; period: string; expected: number; actual: number; deviation: number; severity: string }> = []
    for (const row of rows) {
      const actual = Number(row.total)
      const deviation = stdDev > 0 ? Math.abs(actual - mean) / stdDev : 0
      if (deviation > 2) {
        anomalies.push({ metric: 'revenue', period: row.month, expected: mean, actual, deviation, severity: deviation > 3 ? 'high' : 'medium' })
      }
    }

    if (anomalies.length > 0) {
      await prisma.fcstAnomaly.createMany({
        data: anomalies.map(a => ({ tenantId, ...a })),
        skipDuplicates: true,
      })
    }

    return reply.send(buildSuccessResponse({ detected: anomalies.length, anomalies }))
  })

  app.get('/anomalies', async (request, reply) => {
    const { tenantId } = request as any
    const anomalies = await prisma.fcstAnomaly.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 50 })
    return reply.send(buildSuccessResponse(anomalies))
  })

  app.patch('/anomalies/:id/acknowledge', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    await prisma.fcstAnomaly.updateMany({ where: { id, tenantId }, data: { acknowledged: true } })
    return reply.send(buildSuccessResponse({ acknowledged: true }))
  })

  // ── Dashboard ──────────────────────────────────────────────────────────────

  app.get('/dashboard', async (request, reply) => {
    const { tenantId } = request as any
    const currentMonth = new Date().toISOString().slice(0, 7)
    const [totalModels, nextMonthPrediction, unacknowledgedAnomalies, revenueActuals] = await Promise.all([
      prisma.fcstModel.count({ where: { tenantId, status: 'trained' } }),
      prisma.fcstPrediction.findFirst({ where: { tenantId, period: { gt: currentMonth } }, orderBy: { period: 'asc' } }),
      prisma.fcstAnomaly.count({ where: { tenantId, acknowledged: false } }),
      prisma.fcstPrediction.findMany({ where: { tenantId }, orderBy: { period: 'asc' }, take: 12 }),
    ])
    return reply.send(buildSuccessResponse({
      trainedModels: totalModels,
      nextMonthPrediction: nextMonthPrediction ? { period: nextMonthPrediction.period, predicted: nextMonthPrediction.predicted, confidence: nextMonthPrediction.confidence } : null,
      unacknowledgedAnomalies,
      recentPredictions: revenueActuals,
    }))
  })
}
