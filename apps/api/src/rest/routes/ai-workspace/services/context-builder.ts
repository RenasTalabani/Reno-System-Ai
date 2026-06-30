import { prisma } from '@reno/database'

export interface WorkspaceContext {
  tenantId: string
  userId: string
  userRole: string
  recentSessions: number
  activeTaskCount: number
  memoryKeys: string[]
  modules: string[]
  timestamp: string
}

export async function buildContext(tenantId: string, userId: string): Promise<WorkspaceContext> {
  const [recentSessions, activeTaskCount, memoryEntries, user] = await Promise.all([
    prisma.aiwSession.count({ where: { tenantId, userId, status: 'active' } }),
    prisma.aiwTask.count({ where: { tenantId, userId, status: { in: ['approved', 'running'] } } }),
    prisma.aiwMemory.findMany({ where: { tenantId, userId }, select: { key: true, type: true } }),
    prisma.coreUser.findFirst({ where: { id: userId }, select: { email: true } }).catch(() => null),
  ])

  return {
    tenantId,
    userId,
    userRole: 'member',
    recentSessions,
    activeTaskCount,
    memoryKeys: memoryEntries.map(m => `${m.type}:${m.key}`),
    modules: [
      'crm', 'hr', 'finance', 'inventory', 'documents', 'helpdesk',
      'projects', 'analytics', 'ai-workspace', 'knowledge-base',
    ],
    timestamp: new Date().toISOString(),
  }
}

export function buildPromptContext(ctx: WorkspaceContext, userMessage: string): string {
  return `[Reno AI Workspace Context]
Tenant: ${ctx.tenantId}
Active tasks: ${ctx.activeTaskCount}
Available modules: ${ctx.modules.join(', ')}
Memory entries: ${ctx.memoryKeys.length}
Time: ${ctx.timestamp}

User request: ${userMessage}

Respond as Reno Brain, the primary AI assistant. Be concise, helpful, and always respect tenant data boundaries.`
}
