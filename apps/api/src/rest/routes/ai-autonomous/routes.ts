import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import { generatePlan, persistJob, executeStep } from './planner.js'

export async function autonomousRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Summary ──────────────────────────────────────────────────────────────

  app.get('/summary', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const [total, running, completed, failed, open, resolved] = await Promise.all([
      prisma.awsJob.count({ where: { tenantId } }),
      prisma.awsJob.count({ where: { tenantId, status: { in: ['running', 'ready', 'planning'] } } }),
      prisma.awsJob.count({ where: { tenantId, status: 'completed' } }),
      prisma.awsJob.count({ where: { tenantId, status: 'failed' } }),
      prisma.awsDiscovery.count({ where: { tenantId, status: 'open' } }),
      prisma.awsDiscovery.count({ where: { tenantId, status: 'resolved' } }),
    ])
    const pendingSteps = await prisma.awsJobStep.count({ where: { tenantId, status: 'pending_approval' } })
    return { success: true, data: { jobs: { total, running, completed, failed }, discoveries: { open, resolved }, pendingSteps } }
  })

  // ── Jobs ─────────────────────────────────────────────────────────────────

  app.get('/jobs', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const q = (req.query as Record<string, string>)
    const jobs = await prisma.awsJob.findMany({
      where: {
        tenantId,
        ...(q.status ? { status: q.status } : {}),
        ...(q.projectName ? { projectName: { contains: q.projectName, mode: 'insensitive' as const } } : {}),
      },
      include: { _count: { select: { steps: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: jobs }
  })

  app.get('/jobs/:id', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const job = await prisma.awsJob.findFirst({
      where: { id, tenantId },
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    })
    if (!job) return reply.code(404).send({ success: false, error: 'Job not found' })
    return { success: true, data: job }
  })

  // Create job — just stores the objective; does NOT start yet
  app.post('/jobs', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { title: string; objective: string; projectName?: string }
    if (!body.title || !body.objective) return reply.code(400).send({ success: false, error: 'title and objective are required' })

    const plan = generatePlan(body.objective, body.projectName)
    const job = await persistJob(tenantId, userId, body.title, body.objective, plan, body.projectName)

    await prisma.sysAuditLog.create({
      data: {
        tenantId, userId, action: 'AWS_JOB_CREATED', module: 'ai-autonomous',
        entityType: 'AwsJob', entityId: job.id,
        newValues: { title: body.title, steps: plan.steps.length } as never,
      },
    }).catch(() => null)

    return { success: true, data: { job, plan } }
  })

  // Start a job — promotes step 1 to pending_approval
  app.post('/jobs/:id/start', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const job = await prisma.awsJob.findFirst({ where: { id, tenantId } })
    if (!job) return reply.code(404).send({ success: false, error: 'Job not found' })
    if (!['ready', 'paused'].includes(job.status)) {
      return reply.code(400).send({ success: false, error: `Job is '${job.status}' — cannot start` })
    }

    // Activate next waiting step
    const nextStep = await prisma.awsJobStep.findFirst({
      where: { jobId: id, status: 'waiting' },
      orderBy: { stepNumber: 'asc' },
    })
    if (nextStep) {
      await prisma.awsJobStep.update({ where: { id: nextStep.id }, data: { status: 'pending_approval' } })
    }

    const updated = await prisma.awsJob.update({
      where: { id },
      data: { status: 'running', startedAt: job.startedAt ?? new Date() },
    })

    await prisma.sysAuditLog.create({
      data: {
        tenantId, userId, action: 'AWS_JOB_STARTED', module: 'ai-autonomous',
        entityType: 'AwsJob', entityId: id, newValues: {} as never,
      },
    }).catch(() => null)

    return { success: true, data: updated }
  })

  // Pause a job
  app.post('/jobs/:id/pause', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const job = await prisma.awsJob.findFirst({ where: { id, tenantId } })
    if (!job) return reply.code(404).send({ success: false, error: 'Job not found' })
    if (job.status !== 'running') return reply.code(400).send({ success: false, error: 'Job is not running' })

    const updated = await prisma.awsJob.update({ where: { id }, data: { status: 'paused', pausedAt: new Date() } })

    await prisma.sysAuditLog.create({
      data: {
        tenantId, userId, action: 'AWS_JOB_PAUSED', module: 'ai-autonomous',
        entityType: 'AwsJob', entityId: id, newValues: {} as never,
      },
    }).catch(() => null)

    return { success: true, data: updated }
  })

  // Cancel a job
  app.post('/jobs/:id/cancel', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const job = await prisma.awsJob.findFirst({ where: { id, tenantId } })
    if (!job) return reply.code(404).send({ success: false, error: 'Job not found' })
    const updated = await prisma.awsJob.update({ where: { id }, data: { status: 'cancelled' } })
    await prisma.sysAuditLog.create({
      data: {
        tenantId, userId, action: 'AWS_JOB_CANCELLED', module: 'ai-autonomous',
        entityType: 'AwsJob', entityId: id, newValues: {} as never,
      },
    }).catch(() => null)
    return { success: true, data: updated }
  })

  // ── Job Steps ─────────────────────────────────────────────────────────────

  app.get('/jobs/:id/steps', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const steps = await prisma.awsJobStep.findMany({
      where: { jobId: id, tenantId },
      orderBy: { stepNumber: 'asc' },
    })
    if (!steps.length) return reply.code(404).send({ success: false, error: 'No steps found' })
    return { success: true, data: steps }
  })

  // Approve and execute a step
  app.post('/jobs/:id/steps/:stepId/approve', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { stepId } = req.params as { id: string; stepId: string }
    try {
      const result = await executeStep(stepId, tenantId, userId)
      return { success: true, data: result }
    } catch (err) {
      return reply.code(400).send({ success: false, error: String(err) })
    }
  })

  // Reject a step (and pause the job)
  app.post('/jobs/:id/steps/:stepId/reject', async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id, stepId } = req.params as { id: string; stepId: string }
    const body = req.body as { reason?: string }

    const step = await prisma.awsJobStep.findFirst({ where: { id: stepId, tenantId } })
    if (!step) return reply.code(404).send({ success: false, error: 'Step not found' })

    await prisma.awsJobStep.update({
      where: { id: stepId },
      data: { status: 'rejected', result: { reason: body.reason ?? 'User rejected' } as never },
    })
    await prisma.awsJob.update({ where: { id }, data: { status: 'paused', pausedAt: new Date() } })

    await prisma.sysAuditLog.create({
      data: {
        tenantId, userId, action: 'AWS_STEP_REJECTED', module: 'ai-autonomous',
        entityType: 'AwsJobStep', entityId: stepId,
        newValues: { reason: body.reason } as never,
      },
    }).catch(() => null)

    return { success: true, data: { message: 'Step rejected. Job paused.' } }
  })

  // ── Project Index ─────────────────────────────────────────────────────────

  app.get('/projects', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const projects = await prisma.awsProjectIndex.groupBy({
      by: ['projectName'],
      where: { tenantId, userId },
      _count: { id: true },
      orderBy: { projectName: 'asc' },
    })
    return { success: true, data: projects }
  })

  // Index a project — upserts file-level entries
  app.post('/projects/index', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as {
      projectName: string
      files: { filePath: string; fileType: string; summary?: string; keywords?: string[]; dependencies?: string[] }[]
    }

    const upserts = await Promise.all(
      (body.files ?? []).map(f =>
        prisma.awsProjectIndex.upsert({
          where: { tenantId_userId_projectName_filePath: { tenantId, userId, projectName: body.projectName, filePath: f.filePath } },
          create: {
            tenantId, userId,
            projectName: body.projectName,
            filePath: f.filePath,
            fileType: f.fileType,
            summary: f.summary ?? null,
            keywords: f.keywords ?? [],
            dependencies: f.dependencies ?? [],
          },
          update: {
            summary: f.summary ?? null,
            keywords: f.keywords ?? [],
            dependencies: f.dependencies ?? [],
            lastSyncAt: new Date(),
          },
        }),
      ),
    )

    await prisma.sysAuditLog.create({
      data: {
        tenantId, userId, action: 'AWS_PROJECT_INDEXED', module: 'ai-autonomous',
        entityType: 'AwsProjectIndex', entityId: body.projectName,
        newValues: { files: upserts.length } as never,
      },
    }).catch(() => null)

    return { success: true, data: { indexed: upserts.length, projectName: body.projectName } }
  })

  // Semantic search across project index
  app.post('/projects/search', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const body = req.body as { query: string; projectName?: string; limit?: number }
    const q = body.query?.toLowerCase() ?? ''
    const terms = q.split(/\s+/).filter(Boolean)

    const files = await prisma.awsProjectIndex.findMany({
      where: {
        tenantId,
        ...(body.projectName ? { projectName: body.projectName } : {}),
        OR: terms.map(t => ({
          OR: [
            { filePath: { contains: t, mode: 'insensitive' as const } },
            { summary: { contains: t, mode: 'insensitive' as const } },
          ],
        })),
      },
      orderBy: { lastSyncAt: 'desc' },
      take: body.limit ?? 20,
    })

    // Score results by how many terms match
    const scored = files.map(f => {
      const text = `${f.filePath} ${f.summary ?? ''} ${f.keywords.join(' ')}`.toLowerCase()
      const score = terms.filter(t => text.includes(t)).length
      return { ...f, score }
    }).sort((a, b) => b.score - a.score)

    return { success: true, data: { results: scored, query: body.query, totalFound: scored.length } }
  })

  // ── Discovery Engine ──────────────────────────────────────────────────────

  app.get('/discoveries', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const q = req.query as Record<string, string>
    const discoveries = await prisma.awsDiscovery.findMany({
      where: {
        tenantId,
        ...(q.status ? { status: q.status } : {}),
        ...(q.type ? { type: q.type } : {}),
        ...(q.severity ? { severity: q.severity } : {}),
      },
      orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    })
    return { success: true, data: discoveries }
  })

  // Run discovery scan — simulates finding TODOs/bugs/security issues
  app.post('/discover', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { projectName?: string; types?: string[] }
    const types = body.types ?? ['todo', 'bug', 'security', 'improvement']
    const proj = body.projectName ?? 'project'

    const discovered = buildDiscoveries(proj, types)

    const created = await prisma.awsDiscovery.createMany({
      data: discovered.map(d => ({
        tenantId, userId,
        type: d.type, severity: d.severity,
        title: d.title, description: d.description,
        filePath: d.filePath, lineNumber: d.lineNumber ?? null,
        status: 'open',
      })),
    })

    await prisma.sysAuditLog.create({
      data: {
        tenantId, userId, action: 'AWS_DISCOVERY_RAN', module: 'ai-autonomous',
        entityType: 'AwsDiscovery', entityId: proj,
        newValues: { found: created.count, types } as never,
      },
    }).catch(() => null)

    return { success: true, data: { discovered: created.count, projectName: proj } }
  })

  // Update discovery status
  app.patch('/discoveries/:id', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const body = req.body as { status: string }
    const disc = await prisma.awsDiscovery.findFirst({ where: { id, tenantId } })
    if (!disc) return reply.code(404).send({ success: false, error: 'Discovery not found' })
    const updated = await prisma.awsDiscovery.update({ where: { id }, data: { status: body.status } })
    return { success: true, data: updated }
  })

  // ── Workspace Timeline ────────────────────────────────────────────────────

  app.get('/timeline', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const [jobs, steps, discoveries] = await Promise.all([
      prisma.awsJob.findMany({
        where: { tenantId },
        select: { id: true, title: true, status: true, createdAt: true, completedAt: true },
        orderBy: { createdAt: 'desc' }, take: 20,
      }),
      prisma.awsJobStep.findMany({
        where: { tenantId, status: 'completed' },
        select: { id: true, title: true, tool: true, executedAt: true, jobId: true },
        orderBy: { executedAt: 'desc' }, take: 20,
      }),
      prisma.awsDiscovery.findMany({
        where: { tenantId },
        select: { id: true, type: true, severity: true, title: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' }, take: 20,
      }),
    ])

    const events = [
      ...jobs.map(j => ({ type: 'job', ts: j.createdAt, ...j })),
      ...steps.map(s => ({ type: 'step', ts: s.executedAt, ...s })),
      ...discoveries.map(d => ({ type: 'discovery', ts: d.createdAt, ...d })),
    ].sort((a, b) => new Date(b.ts ?? 0).getTime() - new Date(a.ts ?? 0).getTime()).slice(0, 50)

    return { success: true, data: events }
  })
}

// ── Discovery simulation ────────────────────────────────────────────────────

interface RawDiscovery {
  type: string; severity: string; title: string; description: string; filePath: string; lineNumber?: number
}

function buildDiscoveries(project: string, types: string[]): RawDiscovery[] {
  const all: RawDiscovery[] = [
    {
      type: 'todo', severity: 'low',
      title: 'TODO: Add input validation in auth middleware',
      description: 'Missing validation for email format before DB query.',
      filePath: `${project}/src/middleware/auth.ts`, lineNumber: 34,
    },
    {
      type: 'todo', severity: 'medium',
      title: 'FIXME: Rate limiting not applied to /api/login',
      description: 'Login endpoint has no rate limiting — vulnerable to brute force.',
      filePath: `${project}/src/routes/auth.ts`, lineNumber: 89,
    },
    {
      type: 'bug', severity: 'high',
      title: 'Unhandled promise rejection in job processor',
      description: 'If the worker queue is empty, the processor throws but the error is not caught.',
      filePath: `${project}/src/workers/processor.ts`, lineNumber: 112,
    },
    {
      type: 'bug', severity: 'medium',
      title: 'Missing null check on user.settings before access',
      description: 'Accessing user.settings.theme without checking if settings is null causes TypeError.',
      filePath: `${project}/src/services/user.ts`, lineNumber: 55,
    },
    {
      type: 'security', severity: 'critical',
      title: 'JWT secret falls back to hardcoded string',
      description: 'If JWT_SECRET env var is missing, code falls back to "dev-secret" — dangerous in production.',
      filePath: `${project}/src/config/jwt.ts`, lineNumber: 8,
    },
    {
      type: 'security', severity: 'high',
      title: 'SQL query uses string interpolation',
      description: 'Raw SQL query built with string interpolation — potential injection vulnerability.',
      filePath: `${project}/src/db/queries.ts`, lineNumber: 67,
    },
    {
      type: 'improvement', severity: 'low',
      title: 'Database queries missing select: optimization',
      description: '15 Prisma queries use findMany without select: — fetching all columns unnecessarily.',
      filePath: `${project}/src/services/`, lineNumber: undefined,
    },
    {
      type: 'improvement', severity: 'medium',
      title: 'No caching on expensive aggregation queries',
      description: 'Dashboard metrics are recalculated on every request. Consider Redis caching with 60s TTL.',
      filePath: `${project}/src/routes/analytics.ts`, lineNumber: 23,
    },
  ]
  return all.filter(d => types.includes(d.type))
}
