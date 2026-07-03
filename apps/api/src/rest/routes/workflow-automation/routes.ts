import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import { randomBytes } from 'crypto'

const STEP_TYPES = ['trigger','action','condition','delay','http_request','email','notification','transform','loop','parallel','merge','end']
const TRIGGER_TYPES = ['manual','webhook','schedule','event','api','form_submit','data_change','time_based']
const CATEGORIES = ['hr','finance','crm','operations','marketing','it','custom','general']

export async function workflowAutomationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // T1: registry
  app.get('/registry', async (_req, rep) => {
    return rep.send({ stepTypes: STEP_TYPES, triggerTypes: TRIGGER_TYPES, categories: CATEGORIES, maxSteps: 50, maxVariables: 100 })
  })

  // T2: create workflow
  app.post('/workflows', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const b = req.body as any
    const wf = await prisma.wfaWorkflow.create({
      data: { tenantId, createdBy: userId, name: b.name, description: b.description, category: b.category ?? 'general', triggerType: b.triggerType, triggerConfig: (b.triggerConfig ?? {}) as never, canvas: (b.canvas ?? {}) as never, variables: (b.variables ?? []) as never }
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'workflow_automation', entityType: 'WfaWorkflow', entityId: wf.id, newValues: { name: wf.name } as never } }).catch(() => null)
    return rep.status(201).send(wf)
  })

  // T3: list workflows
  app.get('/workflows', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { category, triggerType, isActive } = req.query as any
    const where: any = { tenantId }
    if (category) where.category = category
    if (triggerType) where.triggerType = triggerType
    if (isActive !== undefined) where.isActive = isActive === 'true'
    const [workflows, total] = await Promise.all([
      prisma.wfaWorkflow.findMany({ where, orderBy: { createdAt: 'desc' }, include: { _count: { select: { steps: true, executions: true } } } }),
      prisma.wfaWorkflow.count({ where })
    ])
    return rep.send({ workflows, total })
  })

  // T4: get workflow
  app.get('/workflows/:wfId', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { wfId } = req.params as any
    const wf = await prisma.wfaWorkflow.findFirst({ where: { id: wfId, tenantId }, include: { steps: { orderBy: { order: 'asc' } } } })
    if (!wf) return rep.status(404).send({ error: 'Not found' })
    return rep.send(wf)
  })

  // T5: update workflow
  app.patch('/workflows/:wfId', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { wfId } = req.params as any
    const b = req.body as any
    const exists = await prisma.wfaWorkflow.findFirst({ where: { id: wfId, tenantId } })
    if (!exists) return rep.status(404).send({ error: 'Not found' })
    const data: any = {}
    if (b.name !== undefined) data.name = b.name
    if (b.description !== undefined) data.description = b.description
    if (b.isActive !== undefined) data.isActive = b.isActive
    if (b.category !== undefined) data.category = b.category
    if (b.triggerConfig !== undefined) data.triggerConfig = b.triggerConfig
    if (b.canvas !== undefined) data.canvas = b.canvas
    const wf = await prisma.wfaWorkflow.update({ where: { id: wfId }, data })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE', module: 'workflow_automation', entityType: 'WfaWorkflow', entityId: wfId, newValues: data as never } }).catch(() => null)
    return rep.send(wf)
  })

  // T6: delete workflow
  app.delete('/workflows/:wfId', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { wfId } = req.params as any
    const exists = await prisma.wfaWorkflow.findFirst({ where: { id: wfId, tenantId } })
    if (!exists) return rep.status(404).send({ error: 'Not found' })
    await prisma.wfaWorkflow.delete({ where: { id: wfId } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'DELETE', module: 'workflow_automation', entityType: 'WfaWorkflow', entityId: wfId, newValues: {} as never } }).catch(() => null)
    return rep.send({ success: true })
  })

  // T7: add step
  app.post('/workflows/:wfId/steps', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { wfId } = req.params as any
    const b = req.body as any
    const workflow = await prisma.wfaWorkflow.findFirst({ where: { id: wfId, tenantId } })
    if (!workflow) return rep.status(404).send({ error: 'Workflow not found' })
    const step = await prisma.wfaStep.create({
      data: { tenantId, workflowId: wfId, name: b.name, stepType: b.stepType, config: (b.config ?? {}) as never, position: (b.position ?? { x: 0, y: 0 }) as never, order: b.order ?? 0, nextSteps: (b.nextSteps ?? []) as never }
    })
    return rep.status(201).send(step)
  })

  // T8: get steps
  app.get('/workflows/:wfId/steps', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { wfId } = req.params as any
    const steps = await prisma.wfaStep.findMany({ where: { workflowId: wfId, tenantId }, orderBy: { order: 'asc' } })
    return rep.send({ steps })
  })

  // T9: update step
  app.patch('/workflows/:wfId/steps/:stepId', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { stepId } = req.params as any
    const b = req.body as any
    const exists = await prisma.wfaStep.findFirst({ where: { id: stepId, tenantId } })
    if (!exists) return rep.status(404).send({ error: 'Step not found' })
    const data: any = {}
    if (b.name !== undefined) data.name = b.name
    if (b.config !== undefined) data.config = b.config
    if (b.isEnabled !== undefined) data.isEnabled = b.isEnabled
    if (b.position !== undefined) data.position = b.position
    const step = await prisma.wfaStep.update({ where: { id: stepId }, data })
    return rep.send(step)
  })

  // T10: delete step
  app.delete('/workflows/:wfId/steps/:stepId', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { stepId } = req.params as any
    const exists = await prisma.wfaStep.findFirst({ where: { id: stepId, tenantId } })
    if (!exists) return rep.status(404).send({ error: 'Step not found' })
    await prisma.wfaStep.delete({ where: { id: stepId } })
    return rep.send({ success: true })
  })

  // T11: execute workflow (simulation)
  app.post('/workflows/:wfId/execute', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { wfId } = req.params as any
    const b = req.body as any
    const workflow = await prisma.wfaWorkflow.findFirst({ where: { id: wfId, tenantId }, include: { steps: { orderBy: { order: 'asc' } } } })
    if (!workflow) return rep.status(404).send({ error: 'Workflow not found' })
    const start = Date.now()
    const execution = await prisma.wfaExecution.create({
      data: { tenantId, workflowId: wfId, triggeredBy: userId, triggerData: (b.input ?? {}) as never, status: 'running', input: (b.input ?? {}) as never, stepsTotal: workflow.steps.length }
    })
    const stepLogs = []
    for (const step of workflow.steps) {
      const stepStart = Date.now()
      const log = await prisma.wfaStepLog.create({
        data: { tenantId, executionId: execution.id, stepId: step.id, status: 'success', input: (b.input ?? {}) as never, output: { result: `Step "${step.name}" (${step.stepType}) executed`, simulated: true } as never, durationMs: Math.floor(Math.random() * 50) + 10 }
      })
      stepLogs.push(log)
    }
    const durationMs = Date.now() - start
    const done = await prisma.wfaExecution.update({
      where: { id: execution.id },
      data: { status: 'completed', stepsDone: workflow.steps.length, output: { stepsExecuted: workflow.steps.length, simulated: true } as never, completedAt: new Date(), durationMs }
    })
    await prisma.wfaWorkflow.update({ where: { id: wfId }, data: { runCount: { increment: 1 }, lastRunAt: new Date() } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'EXECUTE', module: 'workflow_automation', entityType: 'WfaExecution', entityId: execution.id, newValues: { workflowId: wfId, status: 'completed' } as never } }).catch(() => null)
    return rep.send({ execution: done, stepLogs })
  })

  // T12: list executions
  app.get('/workflows/:wfId/executions', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { wfId } = req.params as any
    const executions = await prisma.wfaExecution.findMany({ where: { workflowId: wfId, tenantId }, orderBy: { startedAt: 'desc' }, take: 50 })
    return rep.send({ executions, total: executions.length })
  })

  // T13: get execution details
  app.get('/executions/:execId', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { execId } = req.params as any
    const execution = await prisma.wfaExecution.findFirst({
      where: { id: execId, tenantId },
      include: { stepLogs: { orderBy: { executedAt: 'asc' }, include: { step: { select: { name: true, stepType: true } } } } }
    })
    if (!execution) return rep.status(404).send({ error: 'Not found' })
    return rep.send(execution)
  })

  // T14: create webhook trigger
  app.post('/workflows/:wfId/webhooks', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { wfId } = req.params as any
    const b = req.body as any
    const wf = await prisma.wfaWorkflow.findFirst({ where: { id: wfId, tenantId } })
    if (!wf) return rep.status(404).send({ error: 'Workflow not found' })
    const token = randomBytes(48).toString('hex')
    const webhook = await prisma.wfaWebhook.create({
      data: { tenantId, workflowId: wfId, name: b.name ?? `Webhook for ${wf.name}`, token, method: b.method ?? 'POST' }
    })
    return rep.status(201).send({ ...webhook, url: `/v1/workflow-automation/trigger/${token}` })
  })

  // T15: list webhooks
  app.get('/workflows/:wfId/webhooks', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { wfId } = req.params as any
    const webhooks = await prisma.wfaWebhook.findMany({ where: { workflowId: wfId, tenantId } })
    return rep.send({ webhooks: webhooks.map((w: any) => ({ ...w, url: `/v1/workflow-automation/trigger/${w.token}` })) })
  })

  // T16: create schedule
  app.post('/workflows/:wfId/schedules', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { wfId } = req.params as any
    const b = req.body as any
    const wf = await prisma.wfaWorkflow.findFirst({ where: { id: wfId, tenantId } })
    if (!wf) return rep.status(404).send({ error: 'Workflow not found' })
    const nextRunAt = new Date(Date.now() + 3600000)
    const schedule = await prisma.wfaSchedule.create({
      data: { tenantId, workflowId: wfId, name: b.name ?? `Schedule for ${wf.name}`, cronExpr: b.cronExpr, timezone: b.timezone ?? 'UTC', nextRunAt }
    })
    return rep.status(201).send(schedule)
  })

  // T17: list schedules
  app.get('/workflows/:wfId/schedules', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { wfId } = req.params as any
    const schedules = await prisma.wfaSchedule.findMany({ where: { workflowId: wfId, tenantId } })
    return rep.send({ schedules })
  })

  // T18: global execution audit
  app.get('/audit', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const executions = await prisma.wfaExecution.findMany({
      where: { tenantId }, orderBy: { startedAt: 'desc' }, take: 100,
      include: { workflow: { select: { name: true } } }
    })
    return rep.send({ executions, total: executions.length })
  })

  // T19: clone workflow
  app.post('/workflows/:wfId/clone', async (req, rep) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { wfId } = req.params as any
    const src = await prisma.wfaWorkflow.findFirst({ where: { id: wfId, tenantId }, include: { steps: true } })
    if (!src) return rep.status(404).send({ error: 'Not found' })
    const clone = await prisma.wfaWorkflow.create({
      data: { tenantId, createdBy: userId, name: `${src.name} (Copy)`, description: src.description, category: src.category, triggerType: src.triggerType, triggerConfig: src.triggerConfig as never, canvas: src.canvas as never, variables: src.variables as never }
    })
    for (const step of src.steps) {
      await prisma.wfaStep.create({
        data: { tenantId, workflowId: clone.id, name: step.name, stepType: step.stepType, config: step.config as never, position: step.position as never, order: step.order, nextSteps: step.nextSteps as never }
      })
    }
    return rep.status(201).send({ ...clone, message: `Cloned from ${src.name}` })
  })

  // T20: global stats
  app.get('/stats', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const [workflows, executions, webhooks, schedules, stepLogs] = await Promise.all([
      prisma.wfaWorkflow.count({ where: { tenantId } }),
      prisma.wfaExecution.count({ where: { tenantId } }),
      prisma.wfaWebhook.count({ where: { tenantId } }),
      prisma.wfaSchedule.count({ where: { tenantId } }),
      prisma.wfaStepLog.count({ where: { tenantId } })
    ])
    const completedExecs = await prisma.wfaExecution.count({ where: { tenantId, status: 'completed' } })
    const failedExecs = await prisma.wfaExecution.count({ where: { tenantId, status: 'failed' } })
    return rep.send({ workflows, executions, completedExecs, failedExecs, webhooks, schedules, stepLogs, successRate: executions > 0 ? Math.round((completedExecs / executions) * 100) : 100 })
  })

  // T21: delete webhook
  app.delete('/webhooks/:webhookId', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { webhookId } = req.params as any
    const wh = await prisma.wfaWebhook.findFirst({ where: { id: webhookId, tenantId } })
    if (!wh) return rep.status(404).send({ error: 'Not found' })
    await prisma.wfaWebhook.delete({ where: { id: webhookId } })
    return rep.send({ success: true })
  })

  // T22: delete schedule
  app.delete('/schedules/:scheduleId', async (req, rep) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { scheduleId } = req.params as any
    const sc = await prisma.wfaSchedule.findFirst({ where: { id: scheduleId, tenantId } })
    if (!sc) return rep.status(404).send({ error: 'Not found' })
    await prisma.wfaSchedule.delete({ where: { id: scheduleId } })
    return rep.send({ success: true })
  })
}

export async function workflowTriggerRoute(app: FastifyInstance) {
  // Public webhook trigger — token is the auth
  app.post('/workflow-automation/trigger/:token', async (req, rep) => {
    const { token } = req.params as any
    const webhook = await prisma.wfaWebhook.findFirst({ where: { token, isActive: true } })
    if (!webhook) return rep.status(404).send({ error: 'Webhook not found or inactive' })
    await prisma.wfaWebhook.update({ where: { id: webhook.id }, data: { lastUsedAt: new Date(), hitCount: { increment: 1 } } })
    const execution = await prisma.wfaExecution.create({
      data: { tenantId: webhook.tenantId, workflowId: webhook.workflowId, triggerData: (req.body ?? {}) as never, status: 'completed', input: (req.body ?? {}) as never, output: { triggered: true, via: 'webhook' } as never, completedAt: new Date(), durationMs: 5 }
    })
    await prisma.wfaWorkflow.update({ where: { id: webhook.workflowId }, data: { runCount: { increment: 1 }, lastRunAt: new Date() } })
    return rep.send({ success: true, executionId: execution.id })
  })
}
