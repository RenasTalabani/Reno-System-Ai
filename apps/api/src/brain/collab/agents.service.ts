import { prisma } from '@reno/database'

// The 20 default digital employee agents with their roles and modules
export const DEFAULT_AGENTS = [
  { slug: 'ceo',                  name: 'CEO',                    title: 'Chief Executive Officer',     module: null,        color: 'violet',  icon: 'Crown' },
  { slug: 'coo',                  name: 'COO',                    title: 'Chief Operating Officer',     module: 'pm',        color: 'indigo',  icon: 'Settings' },
  { slug: 'cfo',                  name: 'CFO',                    title: 'Chief Financial Officer',     module: 'finance',   color: 'emerald', icon: 'TrendingUp' },
  { slug: 'cto',                  name: 'CTO',                    title: 'Chief Technology Officer',    module: null,        color: 'blue',    icon: 'Cpu' },
  { slug: 'hr-director',          name: 'HR Director',            title: 'Human Resources Director',    module: 'hr',        color: 'pink',    icon: 'Users' },
  { slug: 'sales-director',       name: 'Sales Director',         title: 'Sales Director',              module: 'crm',       color: 'orange',  icon: 'TrendingUp' },
  { slug: 'marketing-director',   name: 'Marketing Director',     title: 'Marketing Director',          module: 'crm',       color: 'rose',    icon: 'Megaphone' },
  { slug: 'procurement-director', name: 'Procurement Director',   title: 'Procurement Director',        module: 'procurement', color: 'amber', icon: 'ShoppingCart' },
  { slug: 'inventory-manager',    name: 'Inventory Manager',      title: 'Inventory Manager',           module: 'inventory', color: 'cyan',    icon: 'Package' },
  { slug: 'production-director',  name: 'Production Director',    title: 'Production Director',         module: 'manufacturing', color: 'teal', icon: 'Factory' },
  { slug: 'finance-manager',      name: 'Finance Manager',        title: 'Finance Manager',             module: 'finance',   color: 'green',   icon: 'BarChart2' },
  { slug: 'cs-manager',           name: 'Customer Success Manager', title: 'Customer Success Manager', module: 'crm',       color: 'sky',     icon: 'Heart' },
  { slug: 'support-manager',      name: 'Support Manager',        title: 'Support Manager',             module: 'helpdesk',  color: 'blue',    icon: 'Headphones' },
  { slug: 'legal-advisor',        name: 'Legal Advisor',          title: 'Legal Advisor',               module: null,        color: 'slate',   icon: 'Scale' },
  { slug: 'compliance-officer',   name: 'Compliance Officer',     title: 'Compliance Officer',          module: null,        color: 'gray',    icon: 'Shield' },
  { slug: 'security-officer',     name: 'Security Officer',       title: 'Security Officer',            module: null,        color: 'red',     icon: 'Lock' },
  { slug: 'business-analyst',     name: 'Business Analyst',       title: 'Business Analyst',            module: null,        color: 'purple',  icon: 'BarChart3' },
  { slug: 'data-analyst',         name: 'Data Analyst',           title: 'Data Analyst',                module: null,        color: 'violet',  icon: 'Database' },
  { slug: 'project-manager',      name: 'Project Manager',        title: 'Project Manager',             module: 'pm',        color: 'indigo',  icon: 'Kanban' },
  { slug: 'automation-manager',   name: 'Automation Manager',     title: 'Automation Manager',          module: 'automation', color: 'blue',   icon: 'Zap' },
] as const

export type AgentSlug = typeof DEFAULT_AGENTS[number]['slug']

export interface AgentProfile {
  slug: string
  name: string
  title: string
  module: string | null
  color: string
  icon: string
  systemPrompt: string
}

// Returns the system prompt for an agent based on their role
export function getAgentSystemPrompt(slug: string, tenantContext?: string): string {
  const agent = DEFAULT_AGENTS.find(a => a.slug === slug)
  if (!agent) return `You are an AI agent named ${slug}. Analyze the request and provide a professional response.`

  return `You are ${agent.name}, the ${agent.title} at this company, operating as a digital employee inside Reno Business OS.

Your responsibilities:
- Analyze and reason about ${agent.module ? `${agent.module} ` : 'business '}data relevant to your role
- Provide expert insights from your domain perspective
- Identify risks, opportunities, and dependencies
- Collaborate with other agents when needed
- Create proposals for any actions requiring human approval
- Never execute writes, deletions, payments, or critical changes directly

Your domain: ${agent.title}
Module focus: ${agent.module ?? 'cross-functional'}
${tenantContext ? `\nCompany context: ${tenantContext}` : ''}
Today: ${new Date().toISOString().split('T')[0]}

Be concise, evidence-based, and professional. When delegating or escalating, clearly state why.`
}

// List all agents (from DB brain_agents merged with defaults)
export async function listAgents(tenantId?: string) {
  const dbAgents = await prisma.brainAgent.findMany({
    where: { OR: [{ tenantId: tenantId ?? undefined }, { isSystem: true }], isActive: true },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  }).catch(() => [])

  // Merge with defaults (add any default agent not already in DB)
  const dbSlugs = new Set(dbAgents.map(a => a.slug))
  const defaultAgentsList = DEFAULT_AGENTS
    .filter(a => !dbSlugs.has(a.slug))
    .map(a => ({
      id: a.slug, // virtual ID for defaults not in DB
      slug: a.slug, name: a.name, title: a.title,
      isSystem: true, isActive: true,
      color: a.color, iconName: a.icon, module: a.module,
      description: `Default digital employee: ${a.title}`,
    }))

  return [...dbAgents, ...defaultAgentsList]
}

export async function getAgentBySlug(slug: string, tenantId?: string) {
  const dbAgent = await prisma.brainAgent.findFirst({
    where: { slug, OR: [{ tenantId: tenantId ?? null }, { isSystem: true }] },
  }).catch(() => null)
  if (dbAgent) return dbAgent

  const def = DEFAULT_AGENTS.find(a => a.slug === slug)
  if (!def) return null
  return { id: def.slug, slug: def.slug, name: def.name, title: def.title, isSystem: true, isActive: true, color: def.color, iconName: def.icon, module: def.module }
}

// Select which agents to involve based on request keywords
export function selectAgentsForRequest(request: string): string[] {
  const lower = request.toLowerCase()
  const selected = new Set<string>(['ceo']) // CEO always leads

  if (/finance|profit|revenue|cost|expense|budget|invoice|payment|margin/i.test(request)) {
    selected.add('cfo'); selected.add('finance-manager')
  }
  if (/hr|employee|hiring|staff|headcount|salary|leave|attendance/i.test(request)) {
    selected.add('hr-director')
  }
  if (/sales|crm|customer|lead|deal|pipeline|churn/i.test(request)) {
    selected.add('sales-director'); selected.add('cs-manager')
  }
  if (/inventory|stock|product|warehouse/i.test(request)) {
    selected.add('inventory-manager')
  }
  if (/procure|supplier|vendor|purchase|order/i.test(request)) {
    selected.add('procurement-director')
  }
  if (/project|task|deadline|milestone|sprint/i.test(request)) {
    selected.add('project-manager')
  }
  if (/support|ticket|helpdesk|complaint|sla/i.test(request)) {
    selected.add('support-manager')
  }
  if (/marketing|campaign|brand|social/i.test(request)) {
    selected.add('marketing-director')
  }
  if (/production|manufacturing|factory|assembly/i.test(request)) {
    selected.add('production-director')
  }
  if (/compliance|legal|regulation|law|policy/i.test(request)) {
    selected.add('compliance-officer'); selected.add('legal-advisor')
  }
  if (/security|breach|risk|threat/i.test(request)) {
    selected.add('security-officer')
  }
  if (/automate|workflow|automation|trigger/i.test(request)) {
    selected.add('automation-manager')
  }
  if (/data|analyt|report|kpi|metric|insight/i.test(request)) {
    selected.add('data-analyst'); selected.add('business-analyst')
  }
  if (/operation|process|efficiency|optimize/i.test(request)) {
    selected.add('coo')
  }

  // For complex multi-domain requests, add business-analyst to synthesize
  if (selected.size >= 4 && !selected.has('business-analyst')) {
    selected.add('business-analyst')
  }

  return Array.from(selected)
}
