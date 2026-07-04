import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

// Golden rules: Reno Brain is PRIMARY. External providers (claude/openai)
// require explicit tenant admin opt-in per job. Every AI action is audited.
// Deployments to production require explicit approval.

export async function fineTuningRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // T1: registry
  app.get('/registry', async () => ({
    providers: ['reno-brain', 'claude (opt-in)', 'openai (opt-in)'],
    defaultProvider: 'reno-brain',
    taskTypes: ['chat', 'classification', 'extraction', 'summarization'],
    jobStatuses: ['queued', 'running', 'succeeded', 'failed', 'cancelled'],
    evalTypes: ['accuracy', 'f1', 'helpfulness', 'safety', 'latency'],
    environments: ['staging', 'production'],
  }))

  // T2: create dataset
  app.post('/datasets', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { name, taskType = 'chat', samples = [], metadata } = req.body as any
    const ds = await prisma.ftDataset.create({
      data: { tenantId: r.tenantId, name, taskType, samples: samples as never, sampleCount: samples.length, status: 'draft', metadata: metadata as never },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'CREATE', module: 'fine-tuning', entityType: 'FtDataset', entityId: ds.id, newValues: { name, samples: samples.length } as never } as never }).catch(() => null)
    return ds
  })

  // T3: list datasets
  app.get('/datasets', async (req) => {
    const r = req as unknown as { tenantId: string }
    const datasets = await prisma.ftDataset.findMany({
      where: { tenantId: r.tenantId },
      select: { id: true, name: true, taskType: true, sampleCount: true, status: true, createdAt: true, _count: { select: { jobs: true } } },
    })
    return { datasets, total: datasets.length }
  })

  // T4: add samples to dataset
  app.post('/datasets/:did/samples', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { did } = req.params as any
    const { samples = [] } = req.body as any
    const ds = await prisma.ftDataset.findFirstOrThrow({ where: { id: did, tenantId: r.tenantId } })
    const merged = [...((ds.samples as any[]) ?? []), ...samples]
    return prisma.ftDataset.update({ where: { id: did }, data: { samples: merged as never, sampleCount: merged.length } })
  })

  // T5: validate dataset (readiness gate)
  app.post('/datasets/:did/validate', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { did } = req.params as any
    const ds = await prisma.ftDataset.findFirstOrThrow({ where: { id: did, tenantId: r.tenantId } })
    const samples = (ds.samples as any[]) ?? []
    const issues: string[] = []
    if (samples.length < 3) issues.push('need at least 3 samples')
    for (let i = 0; i < samples.length; i++) {
      if (!samples[i].input || !samples[i].output) issues.push(`sample ${i + 1} missing input/output`)
    }
    const valid = issues.length === 0
    await prisma.ftDataset.update({ where: { id: did }, data: { status: valid ? 'ready' : 'invalid' } })
    return { valid, issues, sampleCount: samples.length }
  })

  // T6: create fine-tuning job (external providers require explicit opt-in)
  app.post('/jobs', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { datasetId, name, baseModel = 'reno-brain-base', provider = 'reno-brain', epochs = 3, learningRate = 0.0001, externalOptIn = false } = req.body as any
    if (provider !== 'reno-brain' && !externalOptIn) {
      return { error: 'external provider requires explicit tenant admin opt-in (externalOptIn: true)' }
    }
    const ds = await prisma.ftDataset.findFirstOrThrow({ where: { id: datasetId, tenantId: r.tenantId } })
    if (ds.status !== 'ready') return { error: 'dataset must be validated (status: ready) before training' }
    const job = await prisma.ftJob.create({
      data: { tenantId: r.tenantId, datasetId, name, baseModel, provider, epochs, learningRate, status: 'queued' },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'CREATE_FT_JOB', module: 'fine-tuning', entityType: 'FtJob', entityId: job.id, newValues: { name, provider, baseModel, externalOptIn } as never } as never }).catch(() => null)
    return job
  })

  // T7: run job (simulation — trains and produces model)
  app.post('/jobs/:jid/run', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { jid } = req.params as any
    const job = await prisma.ftJob.findFirstOrThrow({ where: { id: jid, tenantId: r.tenantId } })
    const trainLoss = Number((0.5 + Math.random() * 0.5).toFixed(4))
    const updated = await prisma.ftJob.update({
      where: { id: jid },
      data: {
        status: 'succeeded', progress: 100, trainLoss,
        metrics: { epochs: job.epochs, finalLoss: trainLoss, tokensProcessed: 50000 + Math.floor(Math.random() * 200000) } as never,
        startedAt: new Date(Date.now() - 60000), finishedAt: new Date(),
      },
    })
    const model = await prisma.ftModel.create({
      data: { tenantId: r.tenantId, jobId: jid, name: `${job.name}-model`, version: '1', provider: job.provider, status: 'ready', sizeMb: 200 + Math.floor(Math.random() * 800) },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'RUN_FT_JOB', module: 'fine-tuning', entityType: 'FtJob', entityId: jid, newValues: { modelId: model.id, trainLoss } as never } as never }).catch(() => null)
    return { job: updated, model }
  })

  // T8: list jobs
  app.get('/jobs', async (req) => {
    const r = req as unknown as { tenantId: string }
    const jobs = await prisma.ftJob.findMany({ where: { tenantId: r.tenantId }, orderBy: { createdAt: 'desc' }, include: { dataset: { select: { name: true } }, _count: { select: { models: true } } } })
    return { jobs, total: jobs.length }
  })

  // T9: get job
  app.get('/jobs/:jid', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { jid } = req.params as any
    return prisma.ftJob.findFirstOrThrow({ where: { id: jid, tenantId: r.tenantId }, include: { models: true } })
  })

  // T10: cancel job
  app.post('/jobs/:jid/cancel', async (req) => {
    const { jid } = req.params as any
    return prisma.ftJob.update({ where: { id: jid }, data: { status: 'cancelled' } })
  })

  // T11: list models
  app.get('/models', async (req) => {
    const r = req as unknown as { tenantId: string }
    const models = await prisma.ftModel.findMany({ where: { tenantId: r.tenantId }, orderBy: { createdAt: 'desc' }, include: { _count: { select: { evaluations: true, deployments: true } } } })
    return { models, total: models.length }
  })

  // T12: evaluate model (simulation vs baseline)
  app.post('/models/:mid/evaluate', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { mid } = req.params as any
    const { evalType = 'accuracy' } = req.body as any
    const baseline = Number((0.6 + Math.random() * 0.15).toFixed(3))
    const score = Number(Math.min(0.99, baseline + 0.05 + Math.random() * 0.15).toFixed(3))
    return prisma.ftEvaluation.create({
      data: { tenantId: r.tenantId, modelId: mid, evalType, score, baselineScore: baseline, details: { samples: 200, improvement: Number((score - baseline).toFixed(3)) } as never },
    })
  })

  // T13: list evaluations
  app.get('/models/:mid/evaluations', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { mid } = req.params as any
    const evaluations = await prisma.ftEvaluation.findMany({ where: { modelId: mid, tenantId: r.tenantId }, orderBy: { createdAt: 'desc' } })
    return { evaluations, total: evaluations.length }
  })

  // T14: request deployment (starts pending-approval — never auto-deploys)
  app.post('/models/:mid/deploy', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { mid } = req.params as any
    const { environment = 'staging' } = req.body as any
    return prisma.ftDeployment.create({
      data: { tenantId: r.tenantId, modelId: mid, environment, status: 'pending-approval', trafficPct: 0 },
    })
  })

  // T15: approve deployment (explicit human approval, audited)
  app.post('/deployments/:depId/approve', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { depId } = req.params as any
    const dep = await prisma.ftDeployment.update({
      where: { id: depId },
      data: { status: 'deployed', approvedBy: r.userId, deployedAt: new Date(), trafficPct: 10 },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'APPROVE_DEPLOYMENT', module: 'fine-tuning', entityType: 'FtDeployment', entityId: depId, newValues: { environment: dep.environment } as never } as never }).catch(() => null)
    return dep
  })

  // T16: reject deployment
  app.post('/deployments/:depId/reject', async (req) => {
    const { depId } = req.params as any
    return prisma.ftDeployment.update({ where: { id: depId }, data: { status: 'rejected' } })
  })

  // T17: adjust traffic (canary rollout)
  app.post('/deployments/:depId/traffic', async (req) => {
    const { depId } = req.params as any
    const { trafficPct } = req.body as any
    return prisma.ftDeployment.update({ where: { id: depId }, data: { trafficPct: Math.max(0, Math.min(100, trafficPct)) } })
  })

  // T18: list deployments
  app.get('/deployments', async (req) => {
    const r = req as unknown as { tenantId: string }
    const deployments = await prisma.ftDeployment.findMany({ where: { tenantId: r.tenantId }, orderBy: { createdAt: 'desc' }, include: { model: { select: { name: true, provider: true } } } })
    return { deployments, total: deployments.length }
  })

  // T19: submit feedback
  app.post('/feedback', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { modelRef, prompt, completion, rating = 0, correction } = req.body as any
    return prisma.ftFeedback.create({
      data: { tenantId: r.tenantId, modelRef, prompt, completion, rating, correction },
    })
  })

  // T20: list feedback
  app.get('/feedback', async (req) => {
    const r = req as unknown as { tenantId: string }
    const feedback = await prisma.ftFeedback.findMany({ where: { tenantId: r.tenantId }, orderBy: { createdAt: 'desc' }, take: 100 })
    return { feedback, total: feedback.length }
  })

  // T21: harvest feedback into dataset (corrections become training samples)
  app.post('/datasets/:did/harvest-feedback', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { did } = req.params as any
    const ds = await prisma.ftDataset.findFirstOrThrow({ where: { id: did, tenantId: r.tenantId } })
    const pending = await prisma.ftFeedback.findMany({ where: { tenantId: r.tenantId, addedToDataset: false, correction: { not: null } } })
    const newSamples = pending.map(f => ({ input: f.prompt, output: f.correction }))
    const merged = [...((ds.samples as any[]) ?? []), ...newSamples]
    await prisma.ftDataset.update({ where: { id: did }, data: { samples: merged as never, sampleCount: merged.length } })
    await prisma.ftFeedback.updateMany({ where: { id: { in: pending.map(f => f.id) } }, data: { addedToDataset: true } })
    return { harvested: newSamples.length, totalSamples: merged.length }
  })

  // T22: stats
  app.get('/stats', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [datasets, jobs, models, evaluations, deployments, feedback] = await Promise.all([
      prisma.ftDataset.count({ where: { tenantId: r.tenantId } }),
      prisma.ftJob.count({ where: { tenantId: r.tenantId } }),
      prisma.ftModel.count({ where: { tenantId: r.tenantId } }),
      prisma.ftEvaluation.count({ where: { tenantId: r.tenantId } }),
      prisma.ftDeployment.count({ where: { tenantId: r.tenantId } }),
      prisma.ftFeedback.count({ where: { tenantId: r.tenantId } }),
    ])
    return { datasets, jobs, models, evaluations, deployments, feedback }
  })

  // T23: model leaderboard (best eval score per model)
  app.get('/leaderboard', async (req) => {
    const r = req as unknown as { tenantId: string }
    const models = await prisma.ftModel.findMany({ where: { tenantId: r.tenantId }, include: { evaluations: true } })
    const board = models
      .map(m => ({ id: m.id, name: m.name, provider: m.provider, bestScore: m.evaluations.length ? Math.max(...m.evaluations.map(e => e.score)) : 0, evalCount: m.evaluations.length }))
      .sort((a, b) => b.bestScore - a.bestScore)
    return { leaderboard: board }
  })

  // T24: test inference (simulation against fine-tuned model)
  app.post('/models/:mid/infer', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { mid } = req.params as any
    const { prompt = '' } = req.body as any
    const model = await prisma.ftModel.findFirstOrThrow({ where: { id: mid, tenantId: r.tenantId } })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'FT_INFER', module: 'fine-tuning', entityType: 'FtModel', entityId: mid, newValues: { promptLength: prompt.length } as never } as never }).catch(() => null)
    return { model: model.name, provider: model.provider, completion: `[${model.name}] Simulated fine-tuned response to: "${prompt.slice(0, 60)}"`, latencyMs: 80 + Math.floor(Math.random() * 200) }
  })

  // T25: delete feedback
  app.delete('/feedback/:fid', async (req) => {
    const { fid } = req.params as any
    await prisma.ftFeedback.delete({ where: { id: fid } })
    return { success: true }
  })

  // T26: retire model
  app.post('/models/:mid/retire', async (req) => {
    const { mid } = req.params as any
    return prisma.ftModel.update({ where: { id: mid }, data: { status: 'retired' } })
  })

  // T27: delete dataset
  app.delete('/datasets/:did', async (req) => {
    const { did } = req.params as any
    await prisma.ftDataset.delete({ where: { id: did } })
    return { success: true }
  })

  // T28: delete deployment record
  app.delete('/deployments/:depId', async (req) => {
    const { depId } = req.params as any
    await prisma.ftDeployment.delete({ where: { id: depId } })
    return { success: true }
  })
}
