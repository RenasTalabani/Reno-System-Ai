// Phase 56 — AI Predictive Analytics & Forecasting Engine: Routes

import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import {
  ALGORITHM_TYPES, BUILT_IN_DATASETS, simulateTraining, generateForecast, computeApaGrade,
} from './ai-engine.js'

export async function apaRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Dashboard ──────────────────────────────────────────────────────────────
  app.get('/dashboard', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const [totalDatasets, totalModels, trainedModels, totalForecasts, anomalyCount, recentForecasts] = await Promise.all([
      prisma.apaDataset.count({ where: { tenantId } }),
      prisma.apaModel.count({ where: { tenantId } }),
      prisma.apaModel.count({ where: { tenantId, status: 'trained' } }),
      prisma.apaForecast.count({ where: { tenantId } }),
      prisma.apaPrediction.count({ where: { tenantId, isAnomaly: true } }),
      prisma.apaForecast.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 5, include: { model: true, dataset: true } }),
    ])
    const avgAccuracyAgg = await prisma.apaModel.aggregate({ where: { tenantId, status: 'trained' }, _avg: { accuracy: true } })
    const avgAccuracy = avgAccuracyAgg._avg.accuracy ?? 0

    const stats = { totalDatasets, totalModels, trainedModels, totalForecasts, avgAccuracy, anomaliesDetected: anomalyCount, grade: '' }
    stats.grade = computeApaGrade(stats)

    return { stats, recentForecasts, algorithms: ALGORITHM_TYPES }
  })

  // ── Built-in Dataset Templates ─────────────────────────────────────────────
  app.get('/dataset-templates', async () => ({ templates: BUILT_IN_DATASETS }))

  app.post('/dataset-templates/install', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const created: unknown[] = []
    for (const t of BUILT_IN_DATASETS) {
      const existing = await prisma.apaDataset.findUnique({ where: { tenantId_slug: { tenantId, slug: t.slug } } })
      if (!existing) {
        const d = await prisma.apaDataset.create({
          data: { tenantId, name: t.name, slug: t.slug, description: t.description, dataType: t.dataType, source: t.source, rowCount: t.rowCount, columns: t.columns as never, sampleData: [] as never },
        })
        created.push(d)
      }
    }
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'install_templates', module: 'apa', entityType: 'dataset', entityId: tenantId, newValues: { count: created.length } as never } }).catch(() => null)
    return reply.code(201).send({ installed: created.length, datasets: created })
  })

  // ── Datasets ───────────────────────────────────────────────────────────────
  app.get('/datasets', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const datasets = await prisma.apaDataset.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, include: { _count: { select: { models: true, forecasts: true } } } })
    return { datasets }
  })

  app.post('/datasets', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { name: string; slug: string; description?: string; dataType?: string; source?: string; rowCount?: number; columns?: unknown[] }
    const dataset = await prisma.apaDataset.create({
      data: { tenantId, name: body.name, slug: body.slug, description: body.description, dataType: body.dataType ?? 'timeseries', source: body.source ?? 'manual', rowCount: body.rowCount ?? 0, columns: (body.columns ?? []) as never },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'create', module: 'apa', entityType: 'dataset', entityId: dataset.id, newValues: body as never } }).catch(() => null)
    return reply.code(201).send(dataset)
  })

  app.get('/datasets/:id', async (req) => {
    const { id } = req.params as { id: string }
    return prisma.apaDataset.findUniqueOrThrow({ where: { id }, include: { models: true, forecasts: { orderBy: { createdAt: 'desc' }, take: 5 } } })
  })

  app.patch('/datasets/:id', async (req) => {
    const { id } = req.params as { id: string }
    const body = req.body as Record<string, unknown>
    return prisma.apaDataset.update({ where: { id }, data: body as never })
  })

  app.delete('/datasets/:id', async (req) => {
    const { id } = req.params as { id: string }
    await prisma.apaDataset.delete({ where: { id } })
    return { success: true }
  })

  // ── Models ─────────────────────────────────────────────────────────────────
  app.get('/models', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const models = await prisma.apaModel.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, include: { dataset: true } })
    return { models, algorithms: ALGORITHM_TYPES }
  })

  app.post('/models', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { datasetId: string; name: string; algorithmType: string; targetColumn: string; featureColumns?: string[]; hyperparams?: Record<string, unknown> }
    const model = await prisma.apaModel.create({
      data: {
        tenantId, datasetId: body.datasetId, name: body.name, algorithmType: body.algorithmType,
        targetColumn: body.targetColumn, featureColumns: (body.featureColumns ?? []) as never,
        hyperparams: (body.hyperparams ?? {}) as never,
      },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'create', module: 'apa', entityType: 'model', entityId: model.id, newValues: body as never } }).catch(() => null)
    return reply.code(201).send(model)
  })

  app.post('/models/:id/train', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const model = await prisma.apaModel.findUniqueOrThrow({ where: { id }, include: { dataset: true } })

    await prisma.apaModel.update({ where: { id }, data: { status: 'training' } })

    const result = simulateTraining(model.algorithmType, model.dataset.rowCount)

    const trained = await prisma.apaModel.update({
      where: { id },
      data: { status: 'trained', accuracy: result.accuracy, maeScore: result.maeScore, rmseScore: result.rmseScore, r2Score: result.r2Score, trainedAt: new Date(), trainingMs: result.trainingMs, metadata: result.details as never },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'train', module: 'apa', entityType: 'model', entityId: id, newValues: { accuracy: result.accuracy } as never } }).catch(() => null)
    return { model: trained, trainingResult: result }
  })

  app.delete('/models/:id', async (req) => {
    const { id } = req.params as { id: string }
    await prisma.apaModel.delete({ where: { id } })
    return { success: true }
  })

  // ── Forecasts ──────────────────────────────────────────────────────────────
  app.get('/forecasts', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const forecasts = await prisma.apaForecast.findMany({
      where: { tenantId }, orderBy: { createdAt: 'desc' },
      include: { model: true, dataset: true, _count: { select: { predictions_: true } } },
    })
    return { forecasts }
  })

  app.post('/forecasts', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { modelId: string; name: string; horizon?: number; granularity?: string }
    const model = await prisma.apaModel.findUniqueOrThrow({ where: { id: body.modelId } })
    if (model.status !== 'trained') throw new Error('Model must be trained before forecasting')

    const forecast = await prisma.apaForecast.create({
      data: { tenantId, modelId: body.modelId, datasetId: model.datasetId, name: body.name, horizon: body.horizon ?? 30, granularity: body.granularity ?? 'daily' },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'create', module: 'apa', entityType: 'forecast', entityId: forecast.id, newValues: body as never } }).catch(() => null)
    return reply.code(201).send(forecast)
  })

  app.post('/forecasts/:id/run', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const forecast = await prisma.apaForecast.findUniqueOrThrow({ where: { id }, include: { model: true } })

    const result = generateForecast(forecast.model.accuracy ?? 75, forecast.horizon, forecast.granularity, forecast.model.targetColumn)

    // Persist prediction rows
    await prisma.apaPrediction.createMany({
      data: result.points.map(p => ({
        tenantId, forecastId: id, period: p.period, predictedAt: p.predictedAt,
        value: p.value, lowerBound: p.lowerBound, upperBound: p.upperBound,
        confidence: p.confidence, isAnomaly: p.isAnomaly, anomalyScore: p.anomalyScore ?? null,
      })),
    })

    const updated = await prisma.apaForecast.update({
      where: { id },
      data: {
        status: 'completed', aiSummary: result.aiSummary, insights: result.insights as never,
        predictions: result.points.map(p => ({ period: p.period, value: p.value })) as never,
        confidenceLow: result.points.map(p => p.lowerBound) as never,
        confidenceHigh: result.points.map(p => p.upperBound) as never,
        runAt: new Date(), runMs: result.runMs,
      },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'run_forecast', module: 'apa', entityType: 'forecast', entityId: id, newValues: { points: result.points.length, trend: result.trend } as never } }).catch(() => null)
    return { forecast: updated, result }
  })

  app.get('/forecasts/:id', async (req) => {
    const { id } = req.params as { id: string }
    const forecast = await prisma.apaForecast.findUniqueOrThrow({ where: { id }, include: { model: true, dataset: true, predictions_: { orderBy: { predictedAt: 'asc' } } } })
    return { forecast }
  })

  app.delete('/forecasts/:id', async (req) => {
    const { id } = req.params as { id: string }
    await prisma.apaForecast.delete({ where: { id } })
    return { success: true }
  })

  // ── Predictions / Anomalies ────────────────────────────────────────────────
  app.get('/anomalies', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const anomalies = await prisma.apaPrediction.findMany({
      where: { tenantId, isAnomaly: true }, orderBy: { predictedAt: 'asc' }, take: 50,
    })
    return { anomalies, count: anomalies.length }
  })

  // ── Algorithm catalog ──────────────────────────────────────────────────────
  app.get('/algorithms', async () => ({ algorithms: ALGORITHM_TYPES }))
}
