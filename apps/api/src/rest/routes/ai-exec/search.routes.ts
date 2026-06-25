import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { callAI } from '../../../brain/provider.js'
import { buildExecutiveContext, formatExecutiveContextForPrompt, EXECUTIVE_PERSONAS } from '../../../brain/executive-context.js'

export async function aiExecSearchRoutes(app: FastifyInstance) {
  // Natural language business search
  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { query } = req.body as any

    if (!query?.trim()) return reply.status(400).send({ success: false, error: 'Query required' })

    const ctx = await buildExecutiveContext(tenantId)
    const contextText = formatExecutiveContextForPrompt(ctx, 'analyst')

    const providerCfg = await prisma.brainProviderConfig.findFirst({ where: { tenantId, isActive: true, isDefault: true } })
    const aiConfig = { provider: (providerCfg?.provider as any) ?? 'mock' as const, apiKey: providerCfg?.apiKey ?? undefined, baseUrl: providerCfg?.baseUrl ?? undefined, model: providerCfg?.model ?? 'claude-sonnet-4-6' }

    const systemPrompt = `${EXECUTIVE_PERSONAS['analyst']!.systemPromptPrefix}

You are also a business intelligence search engine. When asked business questions, search through the available company data and provide clear, data-backed answers. Always cite specific numbers and metrics. Be concise.

Company data:
${contextText}`

    const prompt = `Business question: "${query}"

Answer this using the available company data. If the data doesn't contain the answer, say so clearly. Provide:
1. Direct answer (1-2 sentences)
2. Supporting data/metrics (bullet points)
3. Related insights (if relevant)
4. Suggested next action (if applicable)`

    let answer = 'Search unavailable — configure AI provider.'
    let sources: string[] = []

    try {
      const res = await callAI([{ role: 'user', content: prompt }], { systemPrompt, maxTokens: 800, temperature: 0.1 }, aiConfig)
      answer = res.content

      // Extract which modules were referenced
      const text = answer.toLowerCase()
      if (text.includes('revenue') || text.includes('invoice') || text.includes('cash')) sources.push('Finance')
      if (text.includes('employee') || text.includes('attendance') || text.includes('leave')) sources.push('HR')
      if (text.includes('ticket') || text.includes('csat') || text.includes('support')) sources.push('Helpdesk')
      if (text.includes('order') || text.includes('pipeline') || text.includes('deal')) sources.push('Sales')
      if (text.includes('inventory') || text.includes('stock')) sources.push('Inventory')
      if (text.includes('project') || text.includes('task')) sources.push('Projects')
      if (text.includes('contract') || text.includes('contact') || text.includes('crm')) sources.push('CRM')
    } catch {}

    await prisma.brainAuditLog.create({
      data: { tenantId, userId, action: 'business_search', module: 'ai_executive', entityType: 'search', entityId: tenantId, metadata: { query: query.slice(0, 200), sourcesUsed: sources } as any },
    })

    return reply.send({ success: true, data: { query, answer, sources, generatedAt: new Date().toISOString() } })
  })

  // Quick entity search (non-AI, fast text search across modules)
  app.get('/quick', async (req, reply) => {
    const { tenantId } = req as any
    const { q, limit = 5 } = req.query as any

    if (!q?.trim() || q.length < 2) return reply.send({ success: true, data: [] })

    const searchTerm = q.trim()

    const [employees, contacts, tickets, projects, articles] = await Promise.all([
      prisma.hrEmployee.findMany({
        where: { tenantId, deletedAt: null, OR: [{ firstName: { contains: searchTerm, mode: 'insensitive' } }, { lastName: { contains: searchTerm, mode: 'insensitive' } }, { workEmail: { contains: searchTerm, mode: 'insensitive' } }] },
        take: Number(limit), select: { id: true, firstName: true, lastName: true, workEmail: true },
      }),
      prisma.crmContact.findMany({
        where: { tenantId, deletedAt: null, OR: [{ firstName: { contains: searchTerm, mode: 'insensitive' } }, { lastName: { contains: searchTerm, mode: 'insensitive' } }, { email: { contains: searchTerm, mode: 'insensitive' } }] },
        take: Number(limit), select: { id: true, firstName: true, lastName: true, email: true },
      }),
      prisma.sdTicket.findMany({
        where: { tenantId, deletedAt: null, OR: [{ subject: { contains: searchTerm, mode: 'insensitive' } }, { number: { contains: searchTerm, mode: 'insensitive' } }] },
        take: Number(limit), select: { id: true, subject: true, number: true, status: true },
      }),
      prisma.pmProject.findMany({
        where: { tenantId, deletedAt: null, name: { contains: searchTerm, mode: 'insensitive' } },
        take: Number(limit), select: { id: true, name: true, status: true },
      }),
      prisma.kbArticle.findMany({
        where: { tenantId, deletedAt: null, title: { contains: searchTerm, mode: 'insensitive' } },
        take: Number(limit), select: { id: true, title: true },
      }),
    ])

    const results = [
      ...employees.map((e: any) => ({ type: 'employee', id: e.id, label: `${e.firstName} ${e.lastName}`, sub: e.workEmail, url: `/hr/employees/${e.id}` })),
      ...contacts.map((c: any) => ({ type: 'contact', id: c.id, label: `${c.firstName} ${c.lastName}`, sub: c.email, url: `/crm/contacts/${c.id}` })),
      ...tickets.map((t: any) => ({ type: 'ticket', id: t.id, label: t.subject, sub: `${t.number} · ${t.status}`, url: `/helpdesk/tickets/${t.id}` })),
      ...projects.map((p: any) => ({ type: 'project', id: p.id, label: p.name, sub: p.status, url: `/projects/${p.id}` })),
      ...articles.map((d: any) => ({ type: 'article', id: d.id, label: d.title, sub: 'Knowledge Base', url: `/kb/${d.id}` })),
    ]

    return reply.send({ success: true, data: results })
  })
}
