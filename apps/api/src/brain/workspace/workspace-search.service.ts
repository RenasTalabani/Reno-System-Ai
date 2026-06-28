import { prisma } from '@reno/database'

export interface SearchResult {
  module: string
  type: string
  title: string
  subtitle: string
  id: string
  url: string
}

export async function searchAll(tenantId: string, query: string): Promise<Record<string, SearchResult[]>> {
  const q = query.toLowerCase().trim()
  const results: Record<string, SearchResult[]> = {}

  await Promise.all([
    searchUsers(tenantId, q).then(r => { if (r.length) results['People'] = r }),
    searchAuditLogs(tenantId, q).then(r => { if (r.length) results['Recent Activity'] = r }),
    searchWorkTasks(tenantId, q).then(r => { if (r.length) results['AI Tasks'] = r }),
    searchOnboardingSessions(tenantId, q).then(r => { if (r.length) results['Onboarding'] = r }),
    searchWorkspaceMessages(tenantId, q).then(r => { if (r.length) results['Workspace Chat'] = r }),
  ])

  return results
}

async function searchUsers(tenantId: string, q: string): Promise<SearchResult[]> {
  try {
    const users = await prisma.coreUser.findMany({
      where: {
        tenantId,
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { profile: { is: { firstName: { contains: q, mode: 'insensitive' } } } },
          { profile: { is: { lastName: { contains: q, mode: 'insensitive' } } } },
        ],
      },
      include: { profile: true },
      take: 5,
    })
    return users.map(u => ({
      module: 'HR',
      type: 'user',
      title: u.profile ? `${u.profile.firstName ?? ''} ${u.profile.lastName ?? ''}`.trim() || u.email : u.email,
      subtitle: u.email,
      id: u.id,
      url: `/users/${u.id}`,
    }))
  } catch { return [] }
}

async function searchAuditLogs(tenantId: string, q: string): Promise<SearchResult[]> {
  try {
    const logs = await prisma.sysAuditLog.findMany({
      where: { tenantId, OR: [{ action: { contains: q, mode: 'insensitive' } }, { entityType: { contains: q, mode: 'insensitive' } }] },
      orderBy: { occurredAt: 'desc' },
      take: 5,
    })
    return logs.map(l => ({
      module: 'Audit',
      type: 'audit_log',
      title: `${l.action} on ${l.entityType}`,
      subtitle: new Date(l.occurredAt).toLocaleDateString(),
      id: l.id,
      url: `/audit-logs`,
    }))
  } catch { return [] }
}

async function searchWorkTasks(tenantId: string, q: string): Promise<SearchResult[]> {
  try {
    const tasks = await prisma.aiWorkTask.findMany({
      where: { tenantId, OR: [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] },
      take: 5,
    })
    return tasks.map(t => ({
      module: 'AI Work',
      type: 'task',
      title: t.title,
      subtitle: `Status: ${t.status}`,
      id: t.id,
      url: `/ai-work/tasks/${t.id}`,
    }))
  } catch { return [] }
}

async function searchOnboardingSessions(tenantId: string, q: string): Promise<SearchResult[]> {
  try {
    const sessions = await prisma.aiOnboardingSession.findMany({
      where: {
        tenantId,
        OR: [
          { detectedIndustry: { contains: q, mode: 'insensitive' } },
          { companyType: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 3,
    })
    return sessions.map(s => ({
      module: 'Setup',
      type: 'onboarding',
      title: `${s.companyType ?? 'Company'} Setup — ${s.detectedIndustry ?? 'detecting'}`,
      subtitle: `Status: ${s.status}`,
      id: s.id,
      url: `/setup/wizard?sessionId=${s.id}`,
    }))
  } catch { return [] }
}

async function searchWorkspaceMessages(tenantId: string, q: string): Promise<SearchResult[]> {
  try {
    const messages = await prisma.aiWorkspaceMessage.findMany({
      where: { tenantId, content: { contains: q, mode: 'insensitive' }, role: 'assistant' },
      include: { session: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 4,
    })
    return messages.map(m => ({
      module: 'Workspace',
      type: 'message',
      title: m.content.slice(0, 80) + (m.content.length > 80 ? '...' : ''),
      subtitle: m.session.title ?? 'Chat session',
      id: m.id,
      url: `/workspace?sessionId=${m.sessionId}`,
    }))
  } catch { return [] }
}
