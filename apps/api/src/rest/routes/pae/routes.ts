// Phase 52 — AI Process Automation Engine: Routes

import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import {
  WORKFLOW_TEMPLATES, executeWorkflow, analyzeWorkflowPerformance, generateDashboardSummary,
} from './ai-engine.js'

export async function automationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Dashboard ──────────────────────────────────────────────────────────────
  app.get('/dashboard', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const [workflows, executions] = await Promise.all([
      prisma.paeWorkflow.findMany({ where: { tenantId, deletedAt: null }, select: { id: true, name: true, status: true, totalRuns: true, successfulRuns: true, failedRuns: true, avgDurationMs: true, lastRunAt: true } }),
      prisma.paeWorkflowExecution.findMany({ where: { tenantId }, orderBy: { startedAt: 'desc' }, take: 10, select: { id: true, status: true, startedAt: true, durationMs: true, triggerType: true, workflow: { select: { name: true } } } }),
    ])
    const activeWorkflows = workflows.filter(w => w.status === 'active').length
    const runningExecutions = executions.filter(e => e.status === 'running').length
    const summary = generateDashboardSummary(workflows.length, activeWorkflows, executions.length, runningExecutions)
    return { summary, stats: { totalWorkflows: workflows.length, activeWorkflows, totalExecutions: executions.length, runningExecutions }, workflows, recentExecutions: executions }
  })

  // ── Templates ──────────────────────────────────────────────────────────────
  app.get('/templates', async () => ({ templates: WORKFLOW_TEMPLATES }))

  app.post('/templates/install', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { slug } = req.body as { slug: string }
    const tmpl = WORKFLOW_TEMPLATES.find(t => t.slug === slug)
    if (!tmpl) return { error: `Template '${slug}' not found` }

    const existing = await prisma.paeWorkflow.findUnique({ where: { tenantId_slug: { tenantId, slug } } })
    if (existing) return { ...existing, alreadyInstalled: true }

    const wf = await prisma.paeWorkflow.create({
      data: {
        tenantId, name: tmpl.name, slug: tmpl.slug, description: tmpl.description,
        category: tmpl.category, status: 'active', createdBy: userId,
        steps: {
          create: tmpl.steps.map(s => ({
            tenantId, name: s.name, stepType: s.stepType,
            stepOrder: s.stepOrder, config: s.config as never, isEnabled: true,
          })),
        },
        triggers: {
          create: [{
            tenantId, name: `${tmpl.name} Trigger`,
            triggerType: tmpl.triggerType, config: tmpl.triggerConfig as never, isActive: true,
          }],
        },
      },
      include: { steps: true, triggers: true },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'install_template', module: 'automation', entityType: 'workflow', entityId: wf.id, newValues: { slug } as never } }).catch(() => null)
    return wf
  })

  // ── Workflows ──────────────────────────────────────────────────────────────
  app.get('/workflows', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const q = req.query as { category?: string; status?: string }
    const workflows = await prisma.paeWorkflow.findMany({
      where: { tenantId, deletedAt: null, ...(q.category && { category: q.category }), ...(q.status && { status: q.status }) },
      include: { _count: { select: { steps: true, executions: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return { workflows }
  })

  app.get('/workflows/:id', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const wf = await prisma.paeWorkflow.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { steps: { orderBy: { stepOrder: 'asc' } }, triggers: true, _count: { select: { executions: true } } },
    })
    if (!wf) return { error: 'Not found' }
    return { ...wf, performance: analyzeWorkflowPerformance(wf.totalRuns, wf.successfulRuns, wf.avgDurationMs) }
  })

  app.post('/workflows', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { name: string; slug: string; description?: string; category?: string }
    const wf = await prisma.paeWorkflow.create({
      data: { tenantId, name: body.name, slug: body.slug, description: body.description, category: body.category ?? 'custom', createdBy: userId },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'create', module: 'automation', entityType: 'workflow', entityId: wf.id, newValues: body as never } }).catch(() => null)
    return wf
  })

  app.patch('/workflows/:id', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = req.body as Record<string, unknown>
    const wf = await prisma.paeWorkflow.update({ where: { id }, data: { ...body, updatedAt: new Date() } as never })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'update', module: 'automation', entityType: 'workflow', entityId: id, newValues: body as never } }).catch(() => null)
    return wf
  })

  app.delete('/workflows/:id', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    await prisma.paeWorkflow.update({ where: { id }, data: { deletedAt: new Date() } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'delete', module: 'automation', entityType: 'workflow', entityId: id, newValues: {} as never } }).catch(() => null)
    return { success: true }
  })

  // ── Steps ──────────────────────────────────────────────────────────────────
  app.get('/workflows/:id/steps', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const steps = await prisma.paeWorkflowStep.findMany({ where: { workflowId: id, tenantId }, orderBy: { stepOrder: 'asc' } })
    return { steps }
  })

  app.post('/workflows/:id/steps', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const body = req.body as { name: string; stepType: string; stepOrder: number; config?: Record<string, unknown> }
    const step = await prisma.paeWorkflowStep.create({
      data: { tenantId, workflowId: id, name: body.name, stepType: body.stepType, stepOrder: body.stepOrder, config: (body.config ?? {}) as never },
    })
    return step
  })

  app.patch('/workflows/:id/steps/:stepId', async (req) => {
    const { id, stepId } = req.params as { id: string; stepId: string }
    const body = req.body as Record<string, unknown>
    const step = await prisma.paeWorkflowStep.update({ where: { id: stepId }, data: body as never })
    return step
  })

  app.delete('/workflows/:id/steps/:stepId', async (req) => {
    const { stepId } = req.params as { id: string; stepId: string }
    await prisma.paeWorkflowStep.delete({ where: { id: stepId } })
    return { success: true }
  })

  // ── Triggers ───────────────────────────────────────────────────────────────
  app.get('/workflows/:id/triggers', async (req) => {
    const { id } = req.params as { id: string }
    const triggers = await prisma.paeWorkflowTrigger.findMany({ where: { workflowId: id }, orderBy: { createdAt: 'asc' } })
    return { triggers }
  })

  app.post('/workflows/:id/triggers', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const body = req.body as { name: string; triggerType: string; config?: Record<string, unknown> }
    const trigger = await prisma.paeWorkflowTrigger.create({
      data: { tenantId, workflowId: id, name: body.name, triggerType: body.triggerType, config: (body.config ?? {}) as never },
    })
    return trigger
  })

  app.patch('/workflows/:id/triggers/:triggerId', async (req) => {
    const { triggerId } = req.params as { id: string; triggerId: string }
    const body = req.body as Record<string, unknown>
    const trigger = await prisma.paeWorkflowTrigger.update({ where: { id: triggerId }, data: body as never })
    return trigger
  })

  // ── Execute Workflow ───────────────────────────────────────────────────────
  app.post('/workflows/:id/run', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = (req.body ?? {}) as { input?: Record<string, unknown> }

    const wf = await prisma.paeWorkflow.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { steps: { where: { isEnabled: true }, orderBy: { stepOrder: 'asc' } } },
    })
    if (!wf) return { error: 'Workflow not found' }

    const stepsForEngine = wf.steps.map(s => ({
      id: s.id, name: s.name, stepType: s.stepType, stepOrder: s.stepOrder,
      config: s.config as Record<string, unknown>, isEnabled: s.isEnabled,
    }))

    const result = executeWorkflow(stepsForEngine, body.input ?? {})

    // Create execution record + step records
    const execution = await prisma.paeWorkflowExecution.create({
      data: {
        tenantId, workflowId: id,
        triggeredBy: userId, triggerType: 'manual',
        status: result.status,
        input: (body.input ?? {}) as never,
        output: result.output as never,
        currentStep: result.completedSteps,
        totalSteps: wf.steps.length,
        durationMs: result.totalDurationMs,
        completedAt: result.status !== 'running' ? new Date() : undefined,
        stepExecutions: {
          create: wf.steps.slice(0, result.stepResults.length).map((step, i) => {
            const sr = result.stepResults[i]!
            return {
              tenantId, stepId: step.id, stepName: step.name, stepOrder: step.stepOrder,
              status: sr.status === 'pending_approval' ? 'pending_approval' : sr.status,
              input: {} as never, output: sr.output as never,
              durationMs: sr.durationMs,
              startedAt: new Date(),
              completedAt: sr.status === 'completed' ? new Date() : undefined,
            }
          }),
        },
      },
    })

    // Update workflow stats
    const newTotal = wf.totalRuns + 1
    const newSuccess = result.status === 'completed' ? wf.successfulRuns + 1 : wf.successfulRuns
    const newFailed = result.status === 'failed' ? wf.failedRuns + 1 : wf.failedRuns
    const newAvg = Math.round((wf.avgDurationMs * wf.totalRuns + result.totalDurationMs) / newTotal)
    await prisma.paeWorkflow.update({
      where: { id },
      data: { totalRuns: newTotal, successfulRuns: newSuccess, failedRuns: newFailed, avgDurationMs: newAvg, lastRunAt: new Date() },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'execute', module: 'automation', entityType: 'workflow', entityId: id, newValues: { executionId: execution.id, status: result.status } as never } }).catch(() => null)
    return { executionId: execution.id, status: result.status, completedSteps: result.completedSteps, totalSteps: wf.steps.length, durationMs: result.totalDurationMs, output: result.output }
  })

  // ── Executions ─────────────────────────────────────────────────────────────
  app.get('/executions', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const q = req.query as { workflowId?: string; status?: string }
    const executions = await prisma.paeWorkflowExecution.findMany({
      where: { tenantId, ...(q.workflowId && { workflowId: q.workflowId }), ...(q.status && { status: q.status }) },
      include: { workflow: { select: { name: true } }, _count: { select: { stepExecutions: true } } },
      orderBy: { startedAt: 'desc' },
      take: 50,
    })
    return { executions }
  })

  app.get('/executions/:execId', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { execId } = req.params as { execId: string }
    const execution = await prisma.paeWorkflowExecution.findFirst({
      where: { id: execId, tenantId },
      include: { stepExecutions: { orderBy: { stepOrder: 'asc' } }, workflow: { select: { name: true } } },
    })
    if (!execution) return { error: 'Not found' }
    return execution
  })
}
