import { prisma } from '@reno/database'
import { executeStep, WorkflowStep, ExecutionContext } from './action.js'

export async function runWorkflow(
  workflowId: string,
  triggerType: string,
  triggeredBy: string,
  triggerData: any,
  tenantId: string,
): Promise<{ executionId: string; status: string }> {
  const workflow = await prisma.autoWorkflow.findFirst({
    where: { id: workflowId, tenantId, isEnabled: true, deletedAt: null },
  })
  if (!workflow) throw new Error('Workflow not found or disabled')

  const steps = (workflow.steps as unknown as WorkflowStep[]) ?? []

  // Create execution record
  const execution = await prisma.autoExecution.create({
    data: {
      tenantId,
      workflowId,
      status: 'running',
      triggeredBy,
      triggerType,
      triggerData: triggerData ?? {},
      startedAt: new Date(),
      context: { variables: {} },
    },
  })

  // Update workflow stats
  await prisma.autoWorkflow.update({
    where: { id: workflowId },
    data: { totalRuns: { increment: 1 }, lastRunAt: new Date(), lastRunStatus: 'running' },
  })

  // Execute steps
  const ctx: ExecutionContext = {
    tenantId,
    userId: triggeredBy,
    executionId: execution.id,
    workflowId,
    triggerData: triggerData ?? {},
    variables: {},
  }

  const finalStatus = await runSteps(steps, ctx, execution.id, workflow.maxRetries)

  // Finalize execution
  const completedAt = new Date()
  const durationMs = completedAt.getTime() - execution.startedAt.getTime()

  await prisma.autoExecution.update({
    where: { id: execution.id },
    data: {
      status: finalStatus,
      completedAt: finalStatus !== 'waiting_approval' ? completedAt : undefined,
      durationMs: finalStatus !== 'waiting_approval' ? durationMs : undefined,
      context: { variables: ctx.variables },
    },
  })

  await prisma.autoWorkflow.update({
    where: { id: workflowId },
    data: {
      lastRunStatus: finalStatus,
      successRuns: finalStatus === 'completed' ? { increment: 1 } : undefined,
      failedRuns: finalStatus === 'failed' ? { increment: 1 } : undefined,
    },
  })

  return { executionId: execution.id, status: finalStatus }
}

async function runSteps(
  steps: WorkflowStep[],
  ctx: ExecutionContext,
  executionId: string,
  maxRetries: number,
): Promise<string> {
  if (steps.length === 0) return 'completed'

  // Build step index map
  const stepMap = new Map<string, WorkflowStep>()
  for (const step of steps) stepMap.set(step.id, step)

  // Start from first step
  if (steps.length === 0) return 'completed'
  let currentStepId: string | 'end' | null = steps[0]!.id
  let stepIndex = 0
  let retryCount = 0

  while (currentStepId && currentStepId !== 'end') {
    const step = stepMap.get(currentStepId)
    if (!step) break

    const stepRecord = await prisma.autoExecutionStep.create({
      data: {
        tenantId: ctx.tenantId,
        executionId,
        stepIndex: stepIndex++,
        stepId: step.id,
        stepName: step.name,
        stepType: step.type,
        status: 'running',
        startedAt: new Date(),
        input: { triggerData: ctx.triggerData, variables: ctx.variables },
      },
    })

    try {
      const result = await executeStep(step, ctx)

      const completedAt = new Date()
      const durationMs = completedAt.getTime() - (stepRecord.startedAt?.getTime() ?? completedAt.getTime())

      await prisma.autoExecutionStep.update({
        where: { id: stepRecord.id },
        data: {
          status: result.status,
          output: result.output,
          errorMessage: result.error,
          completedAt,
          durationMs,
        },
      })

      if (result.status === 'waiting_approval') {
        // Store where we paused in execution context
        await prisma.autoExecution.update({
          where: { id: executionId },
          data: {
            status: 'waiting_approval',
            context: { variables: ctx.variables, pausedAtStepId: step.id },
          },
        })
        return 'waiting_approval'
      }

      if (result.status === 'failed') {
        if (retryCount < maxRetries) {
          retryCount++
          // Retry same step
          continue
        }
        await prisma.autoExecution.update({
          where: { id: executionId },
          data: { errorStep: step.name, errorMessage: result.error ?? 'Step failed' },
        })
        return 'failed'
      }

      retryCount = 0
      currentStepId = result.nextStepId
    } catch (err: any) {
      await prisma.autoExecutionStep.update({
        where: { id: stepRecord.id },
        data: { status: 'failed', errorMessage: err.message, completedAt: new Date() },
      })
      await prisma.autoExecution.update({
        where: { id: executionId },
        data: { errorStep: step.name, errorMessage: err.message },
      })
      return 'failed'
    }
  }

  return 'completed'
}

export async function resumeExecution(
  executionId: string,
  decision: 'approved' | 'rejected',
  decidedBy: string,
): Promise<string> {
  const execution = await prisma.autoExecution.findUnique({ where: { id: executionId } })
  if (!execution) throw new Error('Execution not found')

  const workflow = await prisma.autoWorkflow.findUnique({ where: { id: execution.workflowId } })
  if (!workflow) throw new Error('Workflow not found')

  const steps = (workflow.steps as unknown as WorkflowStep[]) ?? []
  const ctx = execution.context as any ?? {}
  const pausedAtStepId = ctx.pausedAtStepId as string

  const pausedStep = steps.find(s => s.id === pausedAtStepId)
  if (!pausedStep) throw new Error('Paused step not found')

  const nextStepId = decision === 'approved'
    ? (pausedStep.onApproved ?? 'end')
    : (pausedStep.onRejected ?? 'end')

  if (!nextStepId || nextStepId === 'end') {
    await prisma.autoExecution.update({
      where: { id: executionId },
      data: { status: decision === 'approved' ? 'completed' : 'failed', completedAt: new Date() },
    })
    return decision === 'approved' ? 'completed' : 'failed'
  }

  // Resume from next step
  const remainingSteps = steps.slice(steps.findIndex(s => s.id === nextStepId))

  const execCtx: ExecutionContext = {
    tenantId: execution.tenantId,
    userId: decidedBy,
    executionId,
    workflowId: execution.workflowId,
    triggerData: (execution.triggerData as any) ?? {},
    variables: ctx.variables ?? {},
  }

  await prisma.autoExecution.update({
    where: { id: executionId },
    data: { status: 'running' },
  })

  const finalStatus = await runSteps(remainingSteps, execCtx, executionId, workflow.maxRetries)

  await prisma.autoExecution.update({
    where: { id: executionId },
    data: {
      status: finalStatus,
      completedAt: new Date(),
      context: { variables: execCtx.variables },
    },
  })

  return finalStatus
}

// Fire a system event — finds all enabled workflows that listen to this event and runs them
export async function fireEvent(tenantId: string, eventType: string, payload: any, triggeredBy = 'system'): Promise<void> {
  const workflows = await prisma.autoWorkflow.findMany({
    where: {
      tenantId,
      triggerType: 'event',
      isEnabled: true,
      deletedAt: null,
    },
  })

  const matching = workflows.filter(w => {
    const config = w.triggerConfig as Record<string, any>
    return config.eventType === eventType
  })

  await Promise.allSettled(
    matching.map(w => runWorkflow(w.id, 'event', triggeredBy, payload, tenantId))
  )
}

// Scheduler tick — finds scheduled workflows due for execution
export async function schedulerTick(): Promise<void> {
  const now = new Date()
  const dueWorkflows = await prisma.autoWorkflow.findMany({
    where: {
      triggerType: 'scheduled',
      isEnabled: true,
      deletedAt: null,
      nextRunAt: { lte: now },
    },
    take: 20,
  })

  for (const workflow of dueWorkflows) {
    const config = workflow.triggerConfig as Record<string, any>
    await runWorkflow(workflow.id, 'scheduled', 'scheduler', { scheduledAt: now.toISOString() }, workflow.tenantId)
    // Calculate next run from cron or interval
    const intervalMs = Number(config.intervalMs ?? 86400000) // default daily
    await prisma.autoWorkflow.update({
      where: { id: workflow.id },
      data: { nextRunAt: new Date(now.getTime() + intervalMs) },
    })
  }
}
