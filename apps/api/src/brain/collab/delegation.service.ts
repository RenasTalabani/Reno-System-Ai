import { prisma } from '@reno/database'

export async function createDelegation(params: {
  tenantId: string
  fromAgentSlug: string
  toAgentSlug: string
  taskId?: string | null
  conversationId?: string | null
  delegationType: string
  request: string
}) {
  return prisma.aiDelegation.create({
    data: {
      tenantId: params.tenantId,
      fromAgentSlug: params.fromAgentSlug,
      toAgentSlug: params.toAgentSlug,
      taskId: params.taskId,
      conversationId: params.conversationId,
      delegationType: params.delegationType,
      request: params.request.slice(0, 2000),
      status: 'pending',
    },
  })
}

export async function completeDelegation(delegationId: string, response: string, durationMs: number) {
  return prisma.aiDelegation.update({
    where: { id: delegationId },
    data: { status: 'completed', response: response.slice(0, 5000), durationMs, completedAt: new Date() },
  })
}

export async function listDelegations(tenantId: string, taskId?: string) {
  const where: any = { tenantId }
  if (taskId) where.taskId = taskId
  return prisma.aiDelegation.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
}
