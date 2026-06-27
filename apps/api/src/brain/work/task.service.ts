import { prisma } from '@reno/database'

export type TaskStatus =
  | 'draft' | 'queued' | 'planning' | 'running'
  | 'waiting_for_approval' | 'paused' | 'completed' | 'failed' | 'cancelled'

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'
export type TaskRiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface CreateTaskInput {
  tenantId: string
  userId: string
  title: string
  request: string
  description?: string
  provider?: string
  agentSlug?: string
  priority?: TaskPriority
  riskLevel?: TaskRiskLevel
  module?: string
  scheduleId?: string
}

export async function createTask(input: CreateTaskInput) {
  const task = await prisma.aiWorkTask.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      title: input.title,
      request: input.request,
      description: input.description,
      provider: input.provider ?? 'mock',
      agentSlug: input.agentSlug,
      priority: input.priority ?? 'normal',
      riskLevel: input.riskLevel ?? 'low',
      module: input.module,
      scheduleId: input.scheduleId,
      status: 'queued',
    },
  })
  await logWorkAudit({
    tenantId: input.tenantId, taskId: task.id, userId: input.userId,
    action: 'task_created',
    details: { title: input.title, provider: task.provider, priority: task.priority },
  })
  return task
}

export async function listTasks(tenantId: string, filters?: {
  status?: string
  provider?: string
  limit?: number
  offset?: number
}) {
  const where: any = { tenantId }
  if (filters?.status) where.status = filters.status
  if (filters?.provider) where.provider = filters.provider

  const [tasks, total] = await Promise.all([
    prisma.aiWorkTask.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit ?? 50,
      skip: filters?.offset ?? 0,
      include: { _count: { select: { steps: true } } },
    }),
    prisma.aiWorkTask.count({ where }),
  ])
  return { tasks, total }
}

export async function getTask(tenantId: string, taskId: string) {
  return prisma.aiWorkTask.findFirst({
    where: { id: taskId, tenantId },
    include: {
      steps: { orderBy: { stepIndex: 'asc' } },
      memory: true,
    },
  })
}

export async function updateTaskStatus(
  tenantId: string,
  taskId: string,
  status: TaskStatus,
  extra?: { errorMessage?: string; result?: unknown; progressPct?: number }
) {
  const data: any = { status, updatedAt: new Date() }
  if (status === 'running' || status === 'planning') data.startedAt = new Date()
  if (status === 'completed' || status === 'failed' || status === 'cancelled') data.completedAt = new Date()
  if (status === 'paused') data.pausedAt = new Date()
  if (extra?.errorMessage) data.errorMessage = extra.errorMessage
  if (extra?.result) data.result = extra.result
  if (extra?.progressPct !== undefined) data.progressPct = extra.progressPct

  const task = await prisma.aiWorkTask.update({ where: { id: taskId }, data })
  await logWorkAudit({ tenantId, taskId, action: `task_${status}`, details: extra })
  return task
}

export async function updateTaskProgress(taskId: string, completedSteps: number, totalSteps: number) {
  const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
  return prisma.aiWorkTask.update({
    where: { id: taskId },
    data: { completedSteps, totalSteps, progressPct },
  })
}

export async function addTaskStep(params: {
  tenantId: string
  taskId: string
  stepIndex: number
  title: string
  description?: string
  toolName?: string
  status?: string
  input?: unknown
  output?: unknown
  proposalId?: string
  errorMessage?: string
  durationMs?: number
}) {
  const now = new Date()
  return prisma.aiWorkStep.create({
    data: {
      tenantId: params.tenantId,
      taskId: params.taskId,
      stepIndex: params.stepIndex,
      title: params.title,
      description: params.description,
      toolName: params.toolName,
      status: params.status ?? 'success',
      input: params.input as any,
      output: params.output as any,
      proposalId: params.proposalId,
      errorMessage: params.errorMessage,
      durationMs: params.durationMs,
      startedAt: now,
      completedAt: now,
    },
  })
}

export async function setTaskMemory(taskId: string, tenantId: string, key: string, value: unknown) {
  return prisma.aiWorkMemory.upsert({
    where: { taskId_key: { taskId, key } },
    create: { taskId, tenantId, key, value: value as any },
    update: { value: value as any },
  })
}

export async function getTaskMemory(taskId: string) {
  return prisma.aiWorkMemory.findMany({ where: { taskId } })
}

export async function logWorkAudit(params: {
  tenantId: string
  taskId?: string
  userId?: string
  action: string
  provider?: string
  details?: unknown
}) {
  try {
    await prisma.aiWorkAuditLog.create({
      data: {
        tenantId: params.tenantId,
        taskId: params.taskId,
        userId: params.userId,
        action: params.action,
        provider: params.provider,
        details: params.details as any,
      },
    })
  } catch {
    // Never crash on audit failure
  }
}

export async function getWorkDashboard(tenantId: string) {
  const since = new Date(Date.now() - 30 * 86400000)

  const [statusCounts, recent, providerCounts, totalTokens] = await Promise.all([
    prisma.aiWorkTask.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { id: true },
    }),
    prisma.aiWorkTask.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, title: true, status: true, provider: true, progressPct: true, riskLevel: true, createdAt: true, completedAt: true },
    }),
    prisma.aiWorkTask.groupBy({
      by: ['provider'],
      where: { tenantId, createdAt: { gte: since } },
      _count: { id: true },
    }),
    prisma.aiWorkTask.aggregate({
      where: { tenantId, createdAt: { gte: since } },
      _sum: { tokensUsed: true, costUsd: true },
      _count: { id: true },
    }),
  ])

  return {
    statusSummary: Object.fromEntries(statusCounts.map(s => [s.status, s._count.id])),
    recentTasks: recent,
    byProvider: providerCounts.map(p => ({ provider: p.provider, count: p._count.id })),
    last30Days: {
      totalTasks: totalTokens._count.id,
      totalTokens: totalTokens._sum.tokensUsed ?? 0,
      totalCostUsd: Number(totalTokens._sum.costUsd ?? 0),
    },
  }
}

export async function getActivityFeed(tenantId: string, limit = 50) {
  return prisma.aiWorkAuditLog.findMany({
    where: { tenantId },
    orderBy: { occurredAt: 'desc' },
    take: limit,
  })
}
