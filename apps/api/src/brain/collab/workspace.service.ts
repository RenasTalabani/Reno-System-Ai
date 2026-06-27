import { prisma } from '@reno/database'

export async function upsertWorkspace(params: {
  tenantId: string
  taskId?: string | null
  teamId?: string | null
  name: string
  createdBy: string
}) {
  return prisma.aiSharedWorkspace.create({
    data: {
      tenantId: params.tenantId,
      taskId: params.taskId,
      teamId: params.teamId,
      name: params.name,
      content: {},
      createdBy: params.createdBy,
    },
  })
}

export async function appendToWorkspace(workspaceId: string, agentSlug: string, data: unknown) {
  const ws = await prisma.aiSharedWorkspace.findUnique({ where: { id: workspaceId } })
  if (!ws) return
  const existing = (ws.content as Record<string, unknown>) ?? {}
  existing[agentSlug] = data
  return prisma.aiSharedWorkspace.update({
    where: { id: workspaceId },
    data: { content: existing as any, updatedBy: agentSlug },
  })
}

export async function getWorkspace(workspaceId: string, tenantId: string) {
  return prisma.aiSharedWorkspace.findFirst({ where: { id: workspaceId, tenantId } })
}

export async function listWorkspaces(tenantId: string, taskId?: string) {
  const where: any = { tenantId }
  if (taskId) where.taskId = taskId
  return prisma.aiSharedWorkspace.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 })
}
