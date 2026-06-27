import { callClaudeForChat } from '../claude.service.js'
import { callAI, type ChatMessage, type ChatOptions } from '../provider.js'
import {
  updateTaskStatus, updateTaskProgress, addTaskStep,
  setTaskMemory, logWorkAudit,
} from './task.service.js'
import { prisma } from '@reno/database'

export interface ExecuteTaskParams {
  taskId: string
  tenantId: string
  userId: string
  request: string
  provider: string
  agentSlug?: string
  module?: string
}

// Build a system prompt for the AI Digital Employee
function buildSystemPrompt(module?: string): string {
  return `You are Claude, a digital employee working inside the Reno Business Operating System.

Your job is to complete business tasks by:
1. Reading real data from available tools
2. Analyzing and reasoning about what you find
3. Creating proposals for any write actions (never executing writes directly)
4. Providing clear, evidence-based results with reasoning

Safety rules (non-negotiable):
- Never modify, delete, or write data directly
- Never bypass RBAC or tenant isolation
- Never access secrets or sensitive credentials
- Always create proposals for write actions and require human approval
- Always explain your reasoning and cite the data you used

Module context: ${module ?? 'general business'}
Today: ${new Date().toISOString().split('T')[0]}

Be precise, professional, and helpful. Show your work.`
}

export async function executeTask(params: ExecuteTaskParams): Promise<void> {
  const { taskId, tenantId, userId, request, provider, agentSlug, module } = params

  try {
    await updateTaskStatus(tenantId, taskId, 'planning', { progressPct: 5 })
    await logWorkAudit({ tenantId, taskId, userId, action: 'task_planning_started', provider })

    const messages: ChatMessage[] = [
      { role: 'user', content: request },
    ]

    const options: ChatOptions = {
      systemPrompt: buildSystemPrompt(module),
      maxTokens: 4096,
    }

    await updateTaskStatus(tenantId, taskId, 'running', { progressPct: 20 })
    await logWorkAudit({ tenantId, taskId, userId, action: 'task_execution_started', provider })

    const stepStart = Date.now()
    let aiResult: { content: string; totalTokens: number; latencyMs: number; toolCallCount?: number; isFallback?: boolean }
    let actualProvider = provider

    if (provider === 'anthropic') {
      const claudeResult = await callClaudeForChat({
        tenantId, userId, conversationId: taskId,
        messages, options,
        module: module ?? 'ai-work',
        agentName: agentSlug ?? 'digital-employee',
      })
      aiResult = {
        content: claudeResult.content,
        totalTokens: claudeResult.totalTokens,
        latencyMs: claudeResult.latencyMs,
        toolCallCount: claudeResult.toolCallCount,
        isFallback: claudeResult.isFallback,
      }
      actualProvider = claudeResult.isFallback ? 'mock' : 'anthropic'
    } else {
      const renoResult = await callAI(messages, options, { provider: 'mock', model: 'reno-brain-v1' })
      aiResult = {
        content: renoResult.content,
        totalTokens: renoResult.totalTokens,
        latencyMs: renoResult.latencyMs,
      }
      actualProvider = 'mock'
    }

    // Record main execution step
    await addTaskStep({
      tenantId, taskId,
      stepIndex: 0,
      title: 'AI Analysis',
      description: `Executed by ${actualProvider === 'mock' ? 'Reno Brain' : 'Claude'}`,
      toolName: 'ai_reasoning',
      status: 'success',
      input: { request },
      output: { content: aiResult.content.slice(0, 2000), tokenCount: aiResult.totalTokens },
      durationMs: aiResult.latencyMs,
    })

    // Store result in task memory
    await setTaskMemory(taskId, tenantId, 'ai_result', {
      content: aiResult.content,
      provider: actualProvider,
      tokensUsed: aiResult.totalTokens,
      toolCallCount: aiResult.toolCallCount ?? 0,
      executedAt: new Date().toISOString(),
    })

    // Update task with result
    await prisma.aiWorkTask.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        result: { content: aiResult.content, provider: actualProvider },
        tokensUsed: aiResult.totalTokens,
        completedSteps: 1,
        totalSteps: 1,
        progressPct: 100,
        completedAt: new Date(),
      },
    })

    await logWorkAudit({
      tenantId, taskId, userId,
      action: 'task_completed',
      provider: actualProvider,
      details: { tokensUsed: aiResult.totalTokens, durationMs: Date.now() - stepStart },
    })
  } catch (err: any) {
    await updateTaskStatus(tenantId, taskId, 'failed', {
      errorMessage: err.message ?? 'Unknown error during task execution',
    })
    await logWorkAudit({
      tenantId, taskId, userId,
      action: 'task_failed',
      provider,
      details: { error: err.message },
    })
    throw err
  }
}

// Spawn task execution asynchronously (fire-and-forget with error handling)
export function spawnTaskExecution(params: ExecuteTaskParams): void {
  executeTask(params).catch(async (err) => {
    console.error(`[AI Work] Task ${params.taskId} failed:`, err)
  })
}
