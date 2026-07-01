// Phase 49 — AI Universal Action Layer: AI Engine

export type ToolCategory =
  | 'crm' | 'hr' | 'finance' | 'communication' | 'calendar' | 'document'
  | 'search' | 'analytics' | 'integration' | 'knowledge' | 'security' | 'custom'

export type ToolProvider = 'local' | 'mcp' | 'rest_api' | 'agent' | 'function'
export type PolicyAction = 'allow' | 'deny' | 'require_approval'
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'blocked'

// ── System Tool Catalog ───────────────────────────────────────────────────────

export interface CatalogTool {
  slug: string
  name: string
  version: string
  description: string
  category: ToolCategory
  provider: ToolProvider
  schema: Record<string, unknown>
  permissions: Record<string, unknown>
  isSystem: true
}

export const SYSTEM_CATALOG: CatalogTool[] = [
  // CRM
  {
    slug: 'crm_read_contact', name: 'CRM: Read Contact', version: '1.0.0', category: 'crm', provider: 'local', isSystem: true,
    description: 'Read CRM contact details by ID or email',
    schema: { type: 'object', required: ['query'], properties: { query: { type: 'string', description: 'Contact ID or email address' }, fields: { type: 'array', items: { type: 'string' }, description: 'Fields to return' } } },
    permissions: { roles: ['admin', 'sales', 'support'], minScope: 'read' },
  },
  {
    slug: 'crm_write_contact', name: 'CRM: Write Contact', version: '1.0.0', category: 'crm', provider: 'local', isSystem: true,
    description: 'Create or update a CRM contact record',
    schema: { type: 'object', required: ['action', 'data'], properties: { action: { type: 'string', enum: ['create', 'update'] }, contactId: { type: 'string' }, data: { type: 'object' } } },
    permissions: { roles: ['admin', 'sales'], minScope: 'write' },
  },
  // HR
  {
    slug: 'hr_get_employee', name: 'HR: Get Employee', version: '1.0.0', category: 'hr', provider: 'local', isSystem: true,
    description: 'Retrieve employee record by ID or email',
    schema: { type: 'object', required: ['query'], properties: { query: { type: 'string' }, fields: { type: 'array', items: { type: 'string' } } } },
    permissions: { roles: ['admin', 'hr'], minScope: 'read' },
  },
  {
    slug: 'hr_update_employee', name: 'HR: Update Employee', version: '1.0.0', category: 'hr', provider: 'local', isSystem: true,
    description: 'Update an employee record (non-sensitive fields)',
    schema: { type: 'object', required: ['employeeId', 'data'], properties: { employeeId: { type: 'string' }, data: { type: 'object' } } },
    permissions: { roles: ['admin', 'hr'], minScope: 'write' },
  },
  // Finance
  {
    slug: 'finance_get_balance', name: 'Finance: Get Balance', version: '1.0.0', category: 'finance', provider: 'local', isSystem: true,
    description: 'Get account balance or financial summary for a period',
    schema: { type: 'object', properties: { accountId: { type: 'string' }, period: { type: 'string', description: 'e.g. 2026-Q2' }, currency: { type: 'string', default: 'USD' } } },
    permissions: { roles: ['admin', 'finance'], minScope: 'read' },
  },
  {
    slug: 'finance_create_journal', name: 'Finance: Create Journal Entry', version: '1.0.0', category: 'finance', provider: 'local', isSystem: true,
    description: 'Create a journal entry (requires approval for amounts > $10,000)',
    schema: { type: 'object', required: ['debitAccount', 'creditAccount', 'amount'], properties: { debitAccount: { type: 'string' }, creditAccount: { type: 'string' }, amount: { type: 'number' }, currency: { type: 'string' }, description: { type: 'string' } } },
    permissions: { roles: ['admin', 'finance'], minScope: 'write', requireApprovalAbove: 10000 },
  },
  // Communication
  {
    slug: 'email_send', name: 'Email: Send Message', version: '1.0.0', category: 'communication', provider: 'local', isSystem: true,
    description: 'Send an email via the tenant email integration',
    schema: { type: 'object', required: ['to', 'subject', 'body'], properties: { to: { type: 'array', items: { type: 'string' } }, cc: { type: 'array', items: { type: 'string' } }, subject: { type: 'string' }, body: { type: 'string' }, isHtml: { type: 'boolean' } } },
    permissions: { roles: ['admin', 'sales', 'hr', 'support'], rateLimit: 100 },
  },
  {
    slug: 'email_search', name: 'Email: Search Messages', version: '1.0.0', category: 'communication', provider: 'local', isSystem: true,
    description: 'Search emails by query, sender, date range',
    schema: { type: 'object', properties: { query: { type: 'string' }, from: { type: 'string' }, after: { type: 'string' }, before: { type: 'string' }, limit: { type: 'number', default: 10 } } },
    permissions: { roles: ['admin', 'sales', 'hr'], minScope: 'read' },
  },
  // Calendar
  {
    slug: 'calendar_create_event', name: 'Calendar: Create Event', version: '1.0.0', category: 'calendar', provider: 'local', isSystem: true,
    description: 'Create a calendar event with attendees',
    schema: { type: 'object', required: ['title', 'startAt', 'endAt'], properties: { title: { type: 'string' }, startAt: { type: 'string' }, endAt: { type: 'string' }, attendees: { type: 'array', items: { type: 'string' } }, location: { type: 'string' }, description: { type: 'string' } } },
    permissions: { roles: ['admin', 'sales', 'hr', 'assistant'], minScope: 'write' },
  },
  {
    slug: 'calendar_list_events', name: 'Calendar: List Events', version: '1.0.0', category: 'calendar', provider: 'local', isSystem: true,
    description: 'List upcoming calendar events for a user or team',
    schema: { type: 'object', properties: { userId: { type: 'string' }, after: { type: 'string' }, before: { type: 'string' }, limit: { type: 'number', default: 20 } } },
    permissions: { roles: ['admin', 'sales', 'hr', 'assistant'], minScope: 'read' },
  },
  // Documents
  {
    slug: 'document_read', name: 'Document: Read', version: '1.0.0', category: 'document', provider: 'local', isSystem: true,
    description: 'Read document content by ID or path',
    schema: { type: 'object', required: ['documentId'], properties: { documentId: { type: 'string' }, format: { type: 'string', enum: ['text', 'markdown', 'raw'], default: 'text' } } },
    permissions: { roles: ['admin', 'all'], minScope: 'read' },
  },
  {
    slug: 'document_write', name: 'Document: Write', version: '1.0.0', category: 'document', provider: 'local', isSystem: true,
    description: 'Create or update a document',
    schema: { type: 'object', required: ['name', 'content'], properties: { documentId: { type: 'string' }, name: { type: 'string' }, content: { type: 'string' }, folderId: { type: 'string' } } },
    permissions: { roles: ['admin', 'all'], minScope: 'write' },
  },
  // Search & Analytics
  {
    slug: 'web_search', name: 'Web: Search', version: '1.0.0', category: 'search', provider: 'local', isSystem: true,
    description: 'Search the web for information (rate-limited)',
    schema: { type: 'object', required: ['query'], properties: { query: { type: 'string' }, limit: { type: 'number', default: 5 }, language: { type: 'string', default: 'en' } } },
    permissions: { roles: ['admin', 'all'], rateLimit: 50 },
  },
  {
    slug: 'data_aggregate', name: 'Data: Aggregate', version: '1.0.0', category: 'analytics', provider: 'local', isSystem: true,
    description: 'Aggregate data from Reno modules with filters and grouping',
    schema: { type: 'object', required: ['module', 'metric'], properties: { module: { type: 'string' }, metric: { type: 'string' }, groupBy: { type: 'string' }, filters: { type: 'object' }, period: { type: 'string' } } },
    permissions: { roles: ['admin', 'analytics', 'ceo'], minScope: 'read' },
  },
  {
    slug: 'data_export', name: 'Data: Export', version: '1.0.0', category: 'analytics', provider: 'local', isSystem: true,
    description: 'Export data to CSV or JSON',
    schema: { type: 'object', required: ['module', 'format'], properties: { module: { type: 'string' }, format: { type: 'string', enum: ['csv', 'json'] }, filters: { type: 'object' }, limit: { type: 'number', default: 1000 } } },
    permissions: { roles: ['admin', 'analytics'], minScope: 'read' },
  },
  // Knowledge
  {
    slug: 'knowledge_query', name: 'Knowledge Graph: Query', version: '1.0.0', category: 'knowledge', provider: 'local', isSystem: true,
    description: 'Query the enterprise knowledge graph with natural language',
    schema: { type: 'object', required: ['question'], properties: { question: { type: 'string' }, maxEntities: { type: 'number', default: 10 } } },
    permissions: { roles: ['admin', 'all'], minScope: 'read' },
  },
  {
    slug: 'knowledge_index', name: 'Knowledge Graph: Index', version: '1.0.0', category: 'knowledge', provider: 'local', isSystem: true,
    description: 'Index new entities or facts into the knowledge graph',
    schema: { type: 'object', required: ['type', 'content'], properties: { type: { type: 'string', enum: ['entity', 'fact', 'relation'] }, content: { type: 'object' } } },
    permissions: { roles: ['admin', 'knowledge'], minScope: 'write' },
  },
  // Alerts
  {
    slug: 'alert_send', name: 'Alert: Send Notification', version: '1.0.0', category: 'integration', provider: 'local', isSystem: true,
    description: 'Send an in-app notification or alert to users',
    schema: { type: 'object', required: ['title', 'message'], properties: { title: { type: 'string' }, message: { type: 'string' }, severity: { type: 'string', enum: ['info', 'warning', 'error', 'critical'], default: 'info' }, userIds: { type: 'array', items: { type: 'string' } } } },
    permissions: { roles: ['admin', 'all'], rateLimit: 200 },
  },
  // Text
  {
    slug: 'text_extract', name: 'Text: Extract Information', version: '1.0.0', category: 'document', provider: 'local', isSystem: true,
    description: 'Extract structured information from unstructured text (entities, dates, amounts)',
    schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, extractTypes: { type: 'array', items: { type: 'string' }, description: 'e.g. entities, dates, amounts, contacts' } } },
    permissions: { roles: ['admin', 'all'], minScope: 'read' },
  },
  {
    slug: 'math_calculate', name: 'Math: Calculate', version: '1.0.0', category: 'custom', provider: 'function', isSystem: true,
    description: 'Perform mathematical calculations and financial formulas',
    schema: { type: 'object', required: ['expression'], properties: { expression: { type: 'string', description: 'Math expression to evaluate' }, variables: { type: 'object', description: 'Variables to substitute' } } },
    permissions: { roles: ['admin', 'all'], rateLimit: 500 },
  },
  // Security
  {
    slug: 'security_check_permission', name: 'Security: Check Permission', version: '1.0.0', category: 'security', provider: 'local', isSystem: true,
    description: 'Verify if a user/agent has permission to perform an action',
    schema: { type: 'object', required: ['subjectId', 'action', 'resource'], properties: { subjectId: { type: 'string' }, subjectType: { type: 'string', enum: ['user', 'agent'] }, action: { type: 'string' }, resource: { type: 'string' } } },
    permissions: { roles: ['admin', 'security'], minScope: 'read' },
  },
]

// ── Schema Validation ─────────────────────────────────────────────────────────

export function validateToolInput(schema: Record<string, unknown>, input: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const s = schema as { required?: string[]; properties?: Record<string, { type: string; enum?: unknown[] }> }

  if (s.required) {
    for (const field of s.required) {
      if (input[field] === undefined || input[field] === null) {
        errors.push(`Missing required field: ${field}`)
      }
    }
  }

  if (s.properties) {
    for (const [key, propSchema] of Object.entries(s.properties)) {
      if (input[key] === undefined) continue
      const val = input[key]
      if (propSchema.type === 'number' && typeof val !== 'number') errors.push(`Field '${key}' must be a number`)
      if (propSchema.type === 'string' && typeof val !== 'string') errors.push(`Field '${key}' must be a string`)
      if (propSchema.type === 'boolean' && typeof val !== 'boolean') errors.push(`Field '${key}' must be a boolean`)
      if (propSchema.type === 'array' && !Array.isArray(val)) errors.push(`Field '${key}' must be an array`)
      if (propSchema.enum && !propSchema.enum.includes(val)) errors.push(`Field '${key}' must be one of: ${propSchema.enum.join(', ')}`)
    }
  }

  return { valid: errors.length === 0, errors }
}

// ── Policy Evaluation ─────────────────────────────────────────────────────────

export interface PolicyContext {
  callerType: 'user' | 'agent'
  callerId: string
  callerRoles?: string[]
}

export interface PolicyEvalResult {
  decision: PolicyAction
  matchedPolicy: string | null
  reason: string
}

export function evaluatePolicy(
  policies: { name: string; subjectType: string; subjectId: string | null; action: string; isActive: boolean }[],
  ctx: PolicyContext,
): PolicyEvalResult {
  const active = policies.filter(p => p.isActive)

  // First pass: look for an exact deny
  for (const p of active) {
    if (p.action === 'deny' && matchesSubject(p, ctx)) {
      return { decision: 'deny', matchedPolicy: p.name, reason: `Denied by policy: ${p.name}` }
    }
  }

  // Second pass: require_approval
  for (const p of active) {
    if (p.action === 'require_approval' && matchesSubject(p, ctx)) {
      return { decision: 'require_approval', matchedPolicy: p.name, reason: `Approval required by policy: ${p.name}` }
    }
  }

  // Third pass: explicit allow
  for (const p of active) {
    if (p.action === 'allow' && matchesSubject(p, ctx)) {
      return { decision: 'allow', matchedPolicy: p.name, reason: `Allowed by policy: ${p.name}` }
    }
  }

  // Default: allow (no matching policy = open)
  return { decision: 'allow', matchedPolicy: null, reason: 'No matching policy — default allow' }
}

function matchesSubject(
  policy: { subjectType: string; subjectId: string | null },
  ctx: PolicyContext,
): boolean {
  if (policy.subjectType === 'all') return true
  if (policy.subjectType === ctx.callerType) {
    if (!policy.subjectId) return true
    return policy.subjectId === ctx.callerId
  }
  return false
}

// ── Tool Execution Simulation ─────────────────────────────────────────────────

interface SimulatedOutput {
  result: Record<string, unknown>
  durationMs: number
  cost: number
}

const EXECUTION_TEMPLATES: Record<string, (input: Record<string, unknown>) => Record<string, unknown>> = {
  crm_read_contact: (i) => ({ contact: { id: 'cnt_001', name: 'Sample Contact', email: i.query, phone: '+1-555-0100', status: 'active', leadScore: 78 } }),
  crm_write_contact: (i) => ({ success: true, contactId: 'cnt_' + Math.random().toString(36).slice(2, 7), action: i.action }),
  hr_get_employee: (i) => ({ employee: { id: 'emp_001', name: 'Sample Employee', email: i.query, department: 'Engineering', status: 'active' } }),
  hr_update_employee: () => ({ success: true, updated: true }),
  finance_get_balance: (i) => ({ balance: { accountId: i.accountId ?? 'acc_main', amount: 245830.50, currency: i.currency ?? 'USD', period: i.period ?? '2026-Q2', lastUpdated: new Date().toISOString() } }),
  finance_create_journal: (i) => ({ success: true, entryId: 'jrn_' + Date.now(), requiresApproval: (Number(i.amount) ?? 0) > 10000 }),
  email_send: (i) => ({ success: true, messageId: 'msg_' + Date.now(), to: i.to, delivered: true }),
  email_search: (i) => ({ emails: [{ id: 'eml_001', subject: `Re: ${i.query}`, from: 'client@example.com', date: new Date().toISOString(), snippet: 'Found relevant message...' }], total: 1 }),
  calendar_create_event: (i) => ({ success: true, eventId: 'evt_' + Date.now(), title: i.title, startAt: i.startAt }),
  calendar_list_events: () => ({ events: [{ id: 'evt_001', title: 'Team Standup', startAt: new Date().toISOString(), attendees: 5 }], total: 1 }),
  document_read: (i) => ({ documentId: i.documentId, content: 'Document content retrieved successfully...', wordCount: 1240, format: i.format ?? 'text' }),
  document_write: (i) => ({ success: true, documentId: 'doc_' + Date.now(), name: i.name, size: String(i.content ?? '').length }),
  web_search: (i) => ({ results: [{ title: `Search result for: ${i.query}`, url: 'https://example.com', snippet: 'Relevant information found...' }], total: 5 }),
  data_aggregate: (i) => ({ module: i.module, metric: i.metric, value: 42847, change: 12.3, period: i.period ?? 'current' }),
  data_export: (i) => ({ success: true, format: i.format, rows: 1247, downloadUrl: '/exports/data_export.csv' }),
  knowledge_query: (i) => ({ answer: `Knowledge graph result for: ${i.question}`, entities: 3, confidence: 87, facts: 2 }),
  knowledge_index: () => ({ success: true, indexed: true, entityId: 'kg_' + Date.now() }),
  alert_send: (i) => ({ success: true, notificationId: 'ntf_' + Date.now(), title: i.title, delivered: true }),
  text_extract: (i) => ({ extracted: { entities: ['Example Corp', 'John Doe'], dates: ['2026-07-01'], amounts: ['$50,000'], summary: 'Extracted from: ' + String(i.text ?? '').slice(0, 50) } }),
  math_calculate: (i) => ({ expression: i.expression, result: 42, computed: true }),
  security_check_permission: (i) => ({ allowed: true, subjectId: i.subjectId, action: i.action, resource: i.resource, reason: 'Permission granted via RBAC' }),
}

export function simulateExecution(toolSlug: string, input: Record<string, unknown>): SimulatedOutput {
  const template = EXECUTION_TEMPLATES[toolSlug]
  const result = template ? template(input) : { success: true, message: `Tool '${toolSlug}' executed`, input }
  const durationMs = 50 + Math.floor(Math.random() * 450)
  const cost = parseFloat((durationMs * 0.000015).toFixed(5))
  return { result, durationMs, cost }
}

// ── Tool Detection ────────────────────────────────────────────────────────────

export function detectToolsForTask(taskTitle: string, availableSlugs: string[]): { slug: string; reason: string; confidence: number }[] {
  const t = taskTitle.toLowerCase()
  const matches: { slug: string; reason: string; confidence: number }[] = []

  const PATTERNS: { keywords: string[]; slug: string; reason: string }[] = [
    { keywords: ['email', 'send', 'message', 'contact via'], slug: 'email_send', reason: 'Task involves sending email communication' },
    { keywords: ['crm', 'customer', 'lead', 'contact', 'client'], slug: 'crm_read_contact', reason: 'Task involves CRM data lookup' },
    { keywords: ['employee', 'hr', 'leave', 'payroll', 'staff'], slug: 'hr_get_employee', reason: 'Task involves HR employee data' },
    { keywords: ['balance', 'account', 'financial', 'revenue', 'spend'], slug: 'finance_get_balance', reason: 'Task needs financial data' },
    { keywords: ['meeting', 'schedule', 'calendar', 'appointment'], slug: 'calendar_create_event', reason: 'Task involves scheduling' },
    { keywords: ['document', 'file', 'report', 'draft'], slug: 'document_read', reason: 'Task involves document access' },
    { keywords: ['search', 'find', 'lookup', 'web'], slug: 'web_search', reason: 'Task requires web search' },
    { keywords: ['knowledge', 'graph', 'relation', 'entity'], slug: 'knowledge_query', reason: 'Task needs knowledge graph query' },
    { keywords: ['aggregate', 'metrics', 'kpi', 'analytics', 'trend'], slug: 'data_aggregate', reason: 'Task requires data aggregation' },
    { keywords: ['alert', 'notify', 'notification'], slug: 'alert_send', reason: 'Task involves sending alerts' },
    { keywords: ['permission', 'access', 'security', 'rbac'], slug: 'security_check_permission', reason: 'Task involves permission checking' },
    { keywords: ['extract', 'parse', 'analyse text'], slug: 'text_extract', reason: 'Task involves text extraction' },
    { keywords: ['calculate', 'compute', 'formula', 'math'], slug: 'math_calculate', reason: 'Task involves calculation' },
  ]

  for (const p of PATTERNS) {
    if (!availableSlugs.includes(p.slug)) continue
    const matchCount = p.keywords.filter(k => t.includes(k)).length
    if (matchCount > 0) {
      const confidence = Math.min(95, 60 + matchCount * 15)
      matches.push({ slug: p.slug, reason: p.reason, confidence })
    }
  }

  return matches.sort((a, b) => b.confidence - a.confidence).slice(0, 5)
}

// ── MCP Manifest Generation ───────────────────────────────────────────────────

export interface McpManifestTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export function buildMcpManifest(tools: { name: string; slug: string; description: string | null; schema: unknown }[]): McpManifestTool[] {
  return tools.map(t => ({
    name: t.slug.replace(/_/g, '-'),
    description: t.description ?? t.name,
    inputSchema: (t.schema as Record<string, unknown>) ?? { type: 'object', properties: {} },
  }))
}

// ── Tool Health Assessment ────────────────────────────────────────────────────

export interface ToolHealth {
  score: number
  status: 'healthy' | 'degraded' | 'critical' | 'unknown'
  avgDurationMs: number
  successRate: number
  totalCalls: number
  issues: string[]
  recommendations: string[]
}

export function assessToolHealth(
  totalCalls: number,
  failedCalls: number,
  avgDurationMs: number,
): ToolHealth {
  const successRate = totalCalls > 0 ? ((totalCalls - failedCalls) / totalCalls) * 100 : 100
  const issues: string[] = []
  const recommendations: string[] = []

  let score = 100
  if (successRate < 90) { score -= 30; issues.push(`High failure rate: ${(100 - successRate).toFixed(1)}%`) }
  if (successRate < 70) { score -= 20; issues.push('Critical: majority of calls failing') }
  if (avgDurationMs > 3000) { score -= 20; issues.push('Slow response time (>3s)'); recommendations.push('Consider caching or optimising endpoint') }
  if (avgDurationMs > 1000) { score -= 10; issues.push('Elevated response time (>1s)') }
  if (totalCalls === 0) return { score: 0, status: 'unknown', avgDurationMs: 0, successRate: 100, totalCalls: 0, issues: ['No executions recorded yet'], recommendations: ['Execute the tool to establish baseline health'] }

  if (successRate < 70) recommendations.push('Investigate recurring failures in execution logs')
  if (successRate < 90) recommendations.push('Check tool endpoint availability and input validation')

  const status: ToolHealth['status'] = score >= 85 ? 'healthy' : score >= 60 ? 'degraded' : 'critical'
  return { score: Math.max(0, Math.round(score)), status, avgDurationMs, successRate: Math.round(successRate), totalCalls, issues, recommendations }
}

// ── Cost Calculation ──────────────────────────────────────────────────────────

export function calculateToolCost(category: string, durationMs: number): number {
  const CATEGORY_RATES: Record<string, number> = {
    crm: 0.00002, hr: 0.00002, finance: 0.000025, communication: 0.00003,
    calendar: 0.000015, document: 0.00002, search: 0.00004, analytics: 0.00003,
    integration: 0.000025, knowledge: 0.00002, security: 0.000015, custom: 0.00002,
  }
  const rate = CATEGORY_RATES[category] ?? 0.00002
  return parseFloat((durationMs * rate).toFixed(5))
}

// ── Dashboard Summary ─────────────────────────────────────────────────────────

export function generateActionLayerSummary(
  totalTools: number,
  activeTools: number,
  totalExecutions: number,
  successfulExecutions: number,
  totalCost: number,
  mcpServers: number,
): string {
  if (totalTools === 0) return 'No tools registered. Install tools from the System Catalog or register custom tools.'
  const successRate = totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 100
  return `${activeTools}/${totalTools} tools active · ${totalExecutions} executions (${successRate}% success rate) · ${mcpServers} MCP server${mcpServers !== 1 ? 's' : ''} · Total cost $${totalCost.toFixed(3)}`
}
