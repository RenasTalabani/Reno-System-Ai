import type Anthropic from '@anthropic-ai/sdk'
import { TOOL_REGISTRY, type ToolMeta } from '../tools/registry.js'

export interface SkillPlan {
  selectedTools: string[]
  readOnlyTools: string[]
  writeTools: string[]
  hasWriteActions: boolean
  estimatedComplexity: 'simple' | 'moderate' | 'complex'
  matchedKeywords: string[]
  reasoning: string
}

// Keyword → tool name mapping
const KEYWORD_TOOL_MAP: Array<{ pattern: RegExp; tools: string[] }> = [
  {
    pattern: /customer|contact|client|lead|deal|crm|company|prospect/i,
    tools: ['read_customer'],
  },
  {
    pattern: /employee|staff|hr|hire|headcount|personnel|team member|leave|attendance/i,
    tools: ['read_employee'],
  },
  {
    pattern: /invoice|billing|bill|payment|revenue|receivable|outstanding|overdue/i,
    tools: ['read_invoice'],
  },
  {
    pattern: /stock|inventory|warehouse|product|sku|on.?hand|low.?stock|out.?of.?stock/i,
    tools: ['read_inventory_stock'],
  },
  {
    pattern: /project|milestone|sprint|deadline|deliverable/i,
    tools: ['read_project'],
  },
  {
    pattern: /ticket|support|helpdesk|issue|complaint|sla/i,
    tools: ['read_ticket'],
  },
  {
    pattern: /report|summary|overview|analysis|trend|chart|metric|kpi|insight/i,
    tools: ['generate_report', 'read_dashboard_summary'],
  },
  {
    pattern: /dashboard|health|status|overview|how is|how are|what is my/i,
    tools: ['read_dashboard_summary'],
  },
  {
    pattern: /purchase.?order|supplier|vendor|procurement|buy|order from/i,
    tools: ['read_inventory_stock', 'create_purchase_order_proposal'],
  },
  {
    pattern: /create.?task|add.?task|new.?task|assign.?task/i,
    tools: ['create_task_proposal'],
  },
  {
    pattern: /workflow|automate|automation|trigger|rule/i,
    tools: ['create_workflow_proposal'],
  },
  {
    pattern: /create.?invoice|draft.?invoice|invoice.?for|bill.?customer/i,
    tools: ['create_invoice_draft', 'read_customer'],
  },
  {
    pattern: /reply.?to.?ticket|respond.?to|ticket.?response|support.?reply/i,
    tools: ['read_ticket', 'create_support_reply_draft'],
  },
  {
    pattern: /profit|loss|margin|expense|cost|spend|budget/i,
    tools: ['generate_report', 'read_dashboard_summary'],
  },
  {
    pattern: /sales.?order|sale|quotation|deal|won|closed/i,
    tools: ['generate_report', 'read_invoice'],
  },
]

export function planSkills(userMessage: string): SkillPlan {
  const matchedTools = new Set<string>()
  const matchedKeywords: string[] = []

  for (const { pattern, tools } of KEYWORD_TOOL_MAP) {
    const match = userMessage.match(pattern)
    if (match) {
      matchedKeywords.push(match[0])
      tools.forEach(t => matchedTools.add(t))
    }
  }

  // For complex multi-module queries, add dashboard for context
  const moduleMatches = KEYWORD_TOOL_MAP.filter(({ pattern }) => pattern.test(userMessage))
  if (moduleMatches.length >= 3 && !matchedTools.has('read_dashboard_summary')) {
    matchedTools.add('read_dashboard_summary')
  }

  // If no specific match, include all read tools (Claude decides what to use)
  const selectedTools = matchedTools.size > 0
    ? Array.from(matchedTools)
    : TOOL_REGISTRY.filter(t => t.category === 'read').map(t => t.name)

  const meta = selectedTools.map(name => TOOL_REGISTRY.find(t => t.name === name)).filter(Boolean) as ToolMeta[]
  const readOnlyTools = meta.filter(t => t.category === 'read').map(t => t.name)
  const writeTools = meta.filter(t => t.category !== 'read').map(t => t.name)

  const toolCount = selectedTools.length
  const estimatedComplexity: 'simple' | 'moderate' | 'complex' =
    toolCount <= 1 ? 'simple' : toolCount <= 3 ? 'moderate' : 'complex'

  const hasWriteActions = writeTools.length > 0

  const reasoning = matchedTools.size > 0
    ? `Matched ${matchedKeywords.length} keyword(s): [${matchedKeywords.slice(0, 3).join(', ')}] → selected ${selectedTools.length} tool(s)`
    : 'No specific keywords matched — using all read tools and letting Claude decide'

  return {
    selectedTools,
    readOnlyTools,
    writeTools,
    hasWriteActions,
    estimatedComplexity,
    matchedKeywords,
    reasoning,
  }
}

// Filter Anthropic tool definitions to only the planned tools
export function filterToolDefinitions(
  allDefs: Anthropic.Tool[],
  selectedTools: string[]
): Anthropic.Tool[] {
  if (selectedTools.length === 0) return allDefs
  return allDefs.filter(def => selectedTools.includes(def.name))
}
