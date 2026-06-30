import { prisma } from '@reno/database'

export interface SearchResult {
  module: string
  type: string
  id: string
  title: string
  subtitle?: string
  url: string
}

export async function universalSearch(tenantId: string, query: string): Promise<{ results: SearchResult[]; modules: string[]; totalCount: number }> {
  const q = query.trim().toLowerCase()
  const results: SearchResult[] = []
  const searched: string[] = []

  // Search CRM leads
  try {
    const leads = await prisma.reCrmLead.findMany({
      where: { tenantId, name: { contains: q, mode: 'insensitive' } },
      take: 5, select: { id: true, name: true, status: true },
    })
    leads.forEach(l => results.push({ module: 're-crm', type: 'Lead', id: l.id, title: l.name, subtitle: l.status, url: `/re-crm/${l.id}` }))
    searched.push('re-crm')
  } catch { /* model may not exist */ }

  // Search HR employees by first or last name
  try {
    const employees = await prisma.hrEmployee.findMany({
      where: { tenantId, OR: [{ firstName: { contains: q, mode: 'insensitive' } }, { lastName: { contains: q, mode: 'insensitive' } }] },
      take: 5, select: { id: true, firstName: true, lastName: true },
    }).catch(() => [])
    employees.forEach(e => results.push({ module: 'hr', type: 'Employee', id: e.id, title: `${e.firstName} ${e.lastName}`, url: `/hr/${e.id}` }))
    searched.push('hr')
  } catch { /* skip */ }

  // Search AI workspace sessions
  try {
    const sessions = await prisma.aiwSession.findMany({
      where: { tenantId, title: { contains: q, mode: 'insensitive' } },
      take: 5, select: { id: true, title: true, provider: true },
    })
    sessions.forEach(s => results.push({ module: 'ai-workspace', type: 'Session', id: s.id, title: s.title ?? 'Untitled Session', subtitle: s.provider, url: `/ai-workspace/sessions/${s.id}` }))
    searched.push('ai-workspace')
  } catch { /* skip */ }

  // Search documents
  try {
    const docs = await prisma.aiwDocument.findMany({
      where: { tenantId, name: { contains: q, mode: 'insensitive' } },
      take: 5, select: { id: true, name: true, type: true },
    })
    docs.forEach(d => results.push({ module: 'documents', type: 'Document', id: d.id, title: d.name, subtitle: d.type.toUpperCase(), url: `/ai-workspace/documents/${d.id}` }))
    searched.push('documents')
  } catch { /* skip */ }

  // Search tasks
  try {
    const tasks = await prisma.aiwTask.findMany({
      where: { tenantId, title: { contains: q, mode: 'insensitive' } },
      take: 5, select: { id: true, title: true, status: true },
    })
    tasks.forEach(t => results.push({ module: 'tasks', type: 'AI Task', id: t.id, title: t.title, subtitle: t.status, url: `/ai-workspace/tasks/${t.id}` }))
    searched.push('tasks')
  } catch { /* skip */ }

  return { results, modules: [...new Set(searched)], totalCount: results.length }
}
