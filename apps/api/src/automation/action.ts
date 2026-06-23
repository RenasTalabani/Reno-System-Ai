import { prisma } from '@reno/database'
import { interpolate, interpolateDeep, buildContext } from './interpolate.js'
import { evaluateConditions } from './condition.js'

export interface WorkflowStep {
  id: string
  name: string
  type: string
  config: Record<string, any>
  onSuccess?: string
  onFailure?: string
  onTrue?: string
  onFalse?: string
  onApproved?: string
  onRejected?: string
}

export interface ExecutionContext {
  tenantId: string
  userId: string
  executionId: string
  workflowId: string
  triggerData: any
  variables: Record<string, any>
}

export interface StepResult {
  status: 'completed' | 'failed' | 'skipped' | 'waiting_approval'
  output: any
  nextStepId: string | 'end' | null
  error?: string
}

export async function executeStep(step: WorkflowStep, ctx: ExecutionContext): Promise<StepResult> {
  const interpCtx = buildContext(ctx.triggerData, ctx.variables)

  switch (step.type) {
    case 'condition':
      return executeConditionStep(step, ctx, interpCtx)

    case 'notification':
      return executeNotificationStep(step, ctx, interpCtx)

    case 'http_request':
      return executeHttpRequestStep(step, ctx, interpCtx)

    case 'set_variable':
      return executeSetVariableStep(step, ctx, interpCtx)

    case 'delay':
      return executeDelayStep(step, ctx)

    case 'log':
      return executeLogStep(step, ctx, interpCtx)

    case 'approval':
      return executeApprovalStep(step, ctx, interpCtx)

    case 'brain_query':
      return executeBrainQueryStep(step, ctx, interpCtx)

    case 'create_record':
      return executeCreateRecordStep(step, ctx, interpCtx)

    default:
      return { status: 'failed', output: null, nextStepId: step.onFailure ?? 'end', error: `Unknown step type: ${step.type}` }
  }
}

function executeConditionStep(step: WorkflowStep, ctx: ExecutionContext, interpCtx: Record<string, any>): StepResult {
  const passed = evaluateConditions(step.config as any, ctx.triggerData, ctx.variables)
  return {
    status: 'completed',
    output: { conditionPassed: passed },
    nextStepId: passed ? (step.onTrue ?? step.onSuccess ?? 'end') : (step.onFalse ?? 'end'),
  }
}

async function executeNotificationStep(step: WorkflowStep, ctx: ExecutionContext, interpCtx: Record<string, any>): Promise<StepResult> {
  const config = interpolateDeep(step.config, interpCtx)
  const title = config.title ?? 'Workflow Notification'
  const message = config.message ?? ''
  const level = config.level ?? 'info'

  // Find recipients
  let userIds: string[] = []
  if (config.recipient === 'triggeredBy') {
    userIds = [ctx.userId]
  } else if (config.userId) {
    userIds = [config.userId]
  } else {
    // Default: notify all active users in tenant
    const users = await prisma.coreUser.findMany({
      where: { tenantId: ctx.tenantId, isActive: true, deletedAt: null },
      select: { id: true },
      take: 50,
    })
    userIds = users.map(u => u.id)
  }

  await Promise.all(userIds.map(uid =>
    prisma.sysNotification.create({
      data: {
        tenantId: ctx.tenantId,
        userId: uid,
        title,
        body: message,
        type: level,
        data: { module: 'automation', entityType: 'workflow', entityId: ctx.workflowId },
      },
    })
  ))

  return {
    status: 'completed',
    output: { notifiedUsers: userIds.length, title, message },
    nextStepId: step.onSuccess ?? 'end',
  }
}

async function executeHttpRequestStep(step: WorkflowStep, ctx: ExecutionContext, interpCtx: Record<string, any>): Promise<StepResult> {
  const config = interpolateDeep(step.config, interpCtx)
  const url = config.url
  if (!url) return { status: 'failed', output: null, nextStepId: step.onFailure ?? 'end', error: 'No URL configured' }

  try {
    const response = await fetch(url, {
      method: config.method ?? 'POST',
      headers: { 'Content-Type': 'application/json', ...(config.headers ?? {}) },
      body: config.body ? JSON.stringify(config.body) : undefined,
      signal: AbortSignal.timeout(10000),
    })
    const responseBody = await response.text()
    return {
      status: 'completed',
      output: { statusCode: response.status, body: responseBody.slice(0, 2000) },
      nextStepId: response.ok ? (step.onSuccess ?? 'end') : (step.onFailure ?? 'end'),
    }
  } catch (err: any) {
    return { status: 'failed', output: null, nextStepId: step.onFailure ?? 'end', error: err.message }
  }
}

function executeSetVariableStep(step: WorkflowStep, ctx: ExecutionContext, interpCtx: Record<string, any>): StepResult {
  const key = step.config.key as string
  const value = interpolateDeep(step.config.value, interpCtx)
  ctx.variables[key] = value
  return { status: 'completed', output: { key, value }, nextStepId: step.onSuccess ?? 'end' }
}

async function executeDelayStep(step: WorkflowStep, ctx: ExecutionContext): Promise<StepResult> {
  const ms = Math.min(Number(step.config.delayMs ?? 1000), 30000)
  await new Promise(r => setTimeout(r, ms))
  return { status: 'completed', output: { delayedMs: ms }, nextStepId: step.onSuccess ?? 'end' }
}

function executeLogStep(step: WorkflowStep, ctx: ExecutionContext, interpCtx: Record<string, any>): StepResult {
  const message = interpolate(step.config.message ?? 'Log step', interpCtx)
  return { status: 'completed', output: { message }, nextStepId: step.onSuccess ?? 'end' }
}

async function executeApprovalStep(step: WorkflowStep, ctx: ExecutionContext, interpCtx: Record<string, any>): Promise<StepResult> {
  const config = interpolateDeep(step.config, interpCtx)
  const expiresInHours = Number(config.expiresInHours ?? 48)
  const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000)

  await prisma.autoApprovalGate.create({
    data: {
      tenantId: ctx.tenantId,
      workflowId: ctx.workflowId,
      executionId: ctx.executionId,
      stepId: step.id,
      title: config.title ?? 'Approval Required',
      description: config.description,
      riskLevel: config.riskLevel ?? 'medium',
      requestedBy: ctx.userId,
      expiresAt,
      payload: { onApproved: step.onApproved ?? 'end', onRejected: step.onRejected ?? 'end' },
    },
  })

  return { status: 'waiting_approval', output: { stepId: step.id }, nextStepId: null }
}

async function executeBrainQueryStep(step: WorkflowStep, ctx: ExecutionContext, interpCtx: Record<string, any>): Promise<StepResult> {
  const message = interpolate(step.config.message ?? 'Analyze this data', interpCtx)
  const agentSlug = step.config.agentSlug ?? 'reno-analyst'

  // Find agent
  const agent = await prisma.brainAgent.findFirst({
    where: { slug: agentSlug, isActive: true },
  })
  if (!agent) return { status: 'completed', output: { response: 'Agent not found', agentSlug }, nextStepId: step.onSuccess ?? 'end' }

  // Create a brain conversation and send message
  const conversation = await prisma.brainConversation.create({
    data: {
      tenantId: ctx.tenantId,
      agentId: agent.id,
      userId: ctx.userId,
      title: `Automation: ${step.name}`,
      status: 'active',
      lastMessageAt: new Date(),
    },
  })

  // Store the user message; actual AI call is skipped here to avoid API key requirement
  await prisma.brainMessage.create({
    data: {
      tenantId: ctx.tenantId,
      conversationId: conversation.id,
      role: 'user',
      content: message,
    },
  })

  const response = `[Automation Brain Query] Agent ${agent.name} received: "${message}". Configure an AI provider in Reno Brain to enable real AI responses.`

  await prisma.brainMessage.create({
    data: {
      tenantId: ctx.tenantId,
      conversationId: conversation.id,
      role: 'assistant',
      content: response,
    },
  })

  return {
    status: 'completed',
    output: { response, conversationId: conversation.id, agentSlug },
    nextStepId: step.onSuccess ?? 'end',
  }
}

async function executeCreateRecordStep(step: WorkflowStep, ctx: ExecutionContext, interpCtx: Record<string, any>): Promise<StepResult> {
  const config = interpolateDeep(step.config, interpCtx)
  const module = config.module as string
  const model = config.model as string

  // Generic stub — real implementation would use module-specific logic
  return {
    status: 'completed',
    output: { stub: true, module, model, message: `Record creation for ${module}.${model} — implement module-specific handler` },
    nextStepId: step.onSuccess ?? 'end',
  }
}
