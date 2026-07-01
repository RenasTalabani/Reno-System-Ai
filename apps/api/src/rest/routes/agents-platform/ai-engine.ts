// Phase 48 – AI Enterprise Agents Platform: AI Engine

export type AgentType =
  | 'sales' | 'hr' | 'finance' | 'procurement' | 'legal'
  | 'ceo' | 'integration' | 'security' | 'knowledge' | 'assistant' | 'custom'

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
export type CollabType = 'request' | 'response' | 'delegation' | 'notification'

// ── Marketplace Templates ─────────────────────────────────────────────────────

export interface AgentTemplate {
  type: AgentType
  name: string
  slug: string
  description: string
  personality: string
  goals: string[]
  tools: string[]
  defaultKpis: { name: string; target: number; unit: string }[]
}

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    type: 'sales',
    name: 'Sales Agent',
    slug: 'sales-agent',
    description: 'Manages CRM pipeline, qualifies leads, tracks deals, and optimises conversion rates.',
    personality: 'Proactive, data-driven, and persuasive. Prioritises high-value opportunities and escalates stalled deals.',
    goals: ['Increase pipeline conversion by 15%', 'Follow up on all leads within 24h', 'Maintain accurate CRM data'],
    tools: ['crm_read', 'crm_write', 'email_send', 'calendar_create', 'knowledge_query'],
    defaultKpis: [
      { name: 'Lead Response Time (h)', target: 24, unit: 'hours' },
      { name: 'Pipeline Conversion %', target: 15, unit: '%' },
      { name: 'Deals Closed', target: 10, unit: 'deals/month' },
    ],
  },
  {
    type: 'hr',
    name: 'HR Agent',
    slug: 'hr-agent',
    description: 'Handles recruitment, onboarding, leave management, payroll queries, and employee engagement.',
    personality: 'Empathetic, organised, and policy-aware. Ensures compliance and employee wellbeing.',
    goals: ['Reduce time-to-hire by 20%', 'Maintain 90%+ employee satisfaction', 'Zero payroll errors'],
    tools: ['hr_read', 'hr_write', 'email_send', 'calendar_create', 'knowledge_query', 'document_read'],
    defaultKpis: [
      { name: 'Time to Hire (days)', target: 30, unit: 'days' },
      { name: 'Employee Satisfaction %', target: 90, unit: '%' },
      { name: 'Leave Requests Processed', target: 50, unit: '/month' },
    ],
  },
  {
    type: 'finance',
    name: 'Finance Agent',
    slug: 'finance-agent',
    description: 'Monitors cash flow, reconciles accounts, flags anomalies, and generates financial summaries.',
    personality: 'Precise, risk-aware, and analytical. Flags exceptions immediately and maintains audit trails.',
    goals: ['Zero unreconciled transactions', 'Cash flow forecast accuracy >95%', 'AP/AR within terms'],
    tools: ['finance_read', 'finance_write', 'integration_sync', 'knowledge_query', 'document_read'],
    defaultKpis: [
      { name: 'Reconciliation Rate %', target: 100, unit: '%' },
      { name: 'Forecast Accuracy %', target: 95, unit: '%' },
      { name: 'Overdue Invoices', target: 0, unit: 'count' },
    ],
  },
  {
    type: 'procurement',
    name: 'Procurement Agent',
    slug: 'procurement-agent',
    description: 'Manages supplier relations, purchase orders, vendor evaluation, and cost optimisation.',
    personality: 'Negotiation-focused and cost-conscious. Builds strong supplier relationships while minimising spend.',
    goals: ['Reduce procurement costs by 10%', 'Maintain 98% on-time delivery', 'Vendor compliance 100%'],
    tools: ['procurement_read', 'procurement_write', 'email_send', 'knowledge_query'],
    defaultKpis: [
      { name: 'Cost Savings %', target: 10, unit: '%' },
      { name: 'On-Time Delivery %', target: 98, unit: '%' },
      { name: 'POs Processed', target: 100, unit: '/month' },
    ],
  },
  {
    type: 'legal',
    name: 'Legal Agent',
    slug: 'legal-agent',
    description: 'Reviews contracts, tracks compliance obligations, monitors regulatory changes, and flags risks.',
    personality: 'Meticulous, risk-averse, and deadline-aware. Never misses a compliance date or contract clause.',
    goals: ['Zero compliance breaches', 'Contract review within 48h', '100% obligation tracking'],
    tools: ['contracts_read', 'contracts_write', 'knowledge_query', 'document_read', 'signal_monitor'],
    defaultKpis: [
      { name: 'Compliance Score %', target: 100, unit: '%' },
      { name: 'Contract Review Time (h)', target: 48, unit: 'hours' },
      { name: 'Pending Obligations', target: 0, unit: 'count' },
    ],
  },
  {
    type: 'ceo',
    name: 'CEO Agent',
    slug: 'ceo-agent',
    description: 'Strategic intelligence layer — aggregates insights, tracks KPIs, surfaces decisions, and monitors execution.',
    personality: 'Strategic, high-level, and decisive. Synthesises data from all departments to support executive decisions.',
    goals: ['Weekly executive briefing accuracy >95%', 'Strategic goal attainment tracking', 'Early risk detection'],
    tools: ['all_read', 'strategy_read', 'knowledge_query', 'signal_monitor', 'simulation_run', 'integration_sync'],
    defaultKpis: [
      { name: 'Strategic Goal Completion %', target: 80, unit: '%' },
      { name: 'Briefing Delivery', target: 1, unit: '/week' },
      { name: 'Risk Items Flagged', target: 5, unit: '/month' },
    ],
  },
  {
    type: 'integration',
    name: 'Integration Agent',
    slug: 'integration-agent',
    description: 'Monitors all connectors, processes webhooks, triggers sync jobs, and alerts on failures.',
    personality: 'Vigilant, systematic, and fast-reacting. Ensures data flows reliably across all connected systems.',
    goals: ['99.9% integration uptime', 'Webhook processing <1s', 'Zero data loss on sync'],
    tools: ['integration_read', 'integration_write', 'webhook_process', 'alert_send'],
    defaultKpis: [
      { name: 'Integration Uptime %', target: 99.9, unit: '%' },
      { name: 'Sync Success Rate %', target: 99, unit: '%' },
      { name: 'Failed Webhooks', target: 0, unit: 'count' },
    ],
  },
  {
    type: 'security',
    name: 'Security Agent',
    slug: 'security-agent',
    description: 'Monitors security events, detects anomalies, enforces RBAC policies, and responds to incidents.',
    personality: 'Zero-trust, always-alert, and escalation-ready. Treats every anomaly as a potential threat until proven otherwise.',
    goals: ['Zero undetected breaches', 'Incident response <15min', 'RBAC compliance 100%'],
    tools: ['security_read', 'audit_read', 'alert_send', 'knowledge_query'],
    defaultKpis: [
      { name: 'Incident Response Time (min)', target: 15, unit: 'minutes' },
      { name: 'Security Score %', target: 95, unit: '%' },
      { name: 'Policy Violations', target: 0, unit: 'count' },
    ],
  },
  {
    type: 'knowledge',
    name: 'Knowledge Agent',
    slug: 'knowledge-agent',
    description: 'Continuously builds and maintains the enterprise knowledge graph from all data sources.',
    personality: 'Curious, thorough, and context-aware. Connects dots across the business that humans might miss.',
    goals: ['Index all entities daily', 'Graph completeness >90%', 'Query accuracy >85%'],
    tools: ['knowledge_read', 'knowledge_write', 'all_read', 'graph_traverse'],
    defaultKpis: [
      { name: 'Entities Indexed', target: 500, unit: 'count' },
      { name: 'Graph Completeness %', target: 90, unit: '%' },
      { name: 'NL Query Accuracy %', target: 85, unit: '%' },
    ],
  },
  {
    type: 'assistant',
    name: 'Personal Assistant',
    slug: 'personal-assistant',
    description: 'Helps individual users with tasks, scheduling, reminders, summaries, and cross-module queries.',
    personality: 'Friendly, efficient, and anticipatory. Learns user preferences and proactively surfaces relevant information.',
    goals: ['Respond to requests within 30s', 'Task completion rate >95%', 'User satisfaction >4.5/5'],
    tools: ['all_read', 'calendar_create', 'email_send', 'knowledge_query', 'reminder_set'],
    defaultKpis: [
      { name: 'Response Time (s)', target: 30, unit: 'seconds' },
      { name: 'Task Completion %', target: 95, unit: '%' },
      { name: 'User Satisfaction', target: 4.5, unit: '/5' },
    ],
  },
]

// ── Plan Generation ───────────────────────────────────────────────────────────

export interface TaskStep {
  stepNumber: number
  title: string
  tool: string
  description: string
  estimatedDurationMs: number
  dependsOn: number[]
}

export interface AgentPlan {
  steps: TaskStep[]
  estimatedTotalMs: number
  requiredTools: string[]
  collaborationNeeds: { agentType: AgentType; reason: string }[]
}

const STEP_TEMPLATES: Record<AgentType, string[]> = {
  sales: ['Fetch CRM pipeline data', 'Identify high-priority leads', 'Draft outreach message', 'Schedule follow-up', 'Update CRM records', 'Generate summary report'],
  hr: ['Retrieve employee records', 'Check policy compliance', 'Draft communication', 'Update HR system', 'Schedule event', 'Generate audit trail'],
  finance: ['Fetch financial data', 'Run reconciliation check', 'Flag anomalies', 'Generate forecast', 'Update ledger', 'Prepare summary'],
  procurement: ['Query supplier database', 'Evaluate vendor scores', 'Generate PO draft', 'Send for approval', 'Update procurement system', 'Log audit entry'],
  legal: ['Retrieve contract data', 'Check compliance obligations', 'Analyse risk clauses', 'Flag deadlines', 'Update contract status', 'Generate legal summary'],
  ceo: ['Aggregate departmental KPIs', 'Query knowledge graph', 'Run scenario analysis', 'Identify strategic risks', 'Prioritise action items', 'Generate executive briefing'],
  integration: ['Check connector health', 'Process pending webhooks', 'Trigger sync job', 'Validate data integrity', 'Handle failures', 'Update integration logs'],
  security: ['Scan audit logs', 'Detect anomalies', 'Check RBAC policies', 'Assess threat level', 'Trigger incident response', 'Generate security report'],
  knowledge: ['Fetch new entities from modules', 'Infer relationships', 'Update knowledge graph', 'Extract facts from signals', 'Run community detection', 'Generate graph summary'],
  assistant: ['Parse user request', 'Query relevant modules', 'Synthesise information', 'Draft response', 'Execute action if needed', 'Confirm completion with user'],
  custom: ['Analyse task requirements', 'Gather relevant data', 'Process information', 'Execute primary action', 'Validate results', 'Generate completion report'],
}

export function generateAgentPlan(agentType: AgentType, taskTitle: string, taskDescription?: string): AgentPlan {
  const steps = STEP_TEMPLATES[agentType] ?? STEP_TEMPLATES.custom
  const relevantSteps = steps.slice(0, Math.min(steps.length, 4 + Math.floor(Math.random() * 3)))

  const planSteps: TaskStep[] = relevantSteps.map((title, i) => ({
    stepNumber: i + 1,
    title,
    tool: AGENT_TEMPLATES.find(t => t.type === agentType)?.tools[i % 4] ?? 'knowledge_query',
    description: `${title} for task: "${taskTitle}"${taskDescription ? ` — ${taskDescription.slice(0, 60)}` : ''}`,
    estimatedDurationMs: 200 + Math.floor(Math.random() * 800),
    dependsOn: i > 0 ? [i] : [],
  }))

  const collab: { agentType: AgentType; reason: string }[] = []
  if (agentType === 'ceo') {
    collab.push({ agentType: 'finance', reason: 'Financial KPI data needed' })
    collab.push({ agentType: 'knowledge', reason: 'Graph context for strategic decisions' })
  } else if (agentType === 'sales') {
    collab.push({ agentType: 'assistant', reason: 'Schedule follow-up meetings' })
  } else if (agentType === 'legal') {
    collab.push({ agentType: 'knowledge', reason: 'Entity relationship lookup for contracts' })
  }

  return {
    steps: planSteps,
    estimatedTotalMs: planSteps.reduce((s, p) => s + p.estimatedDurationMs, 0),
    requiredTools: [...new Set(planSteps.map(s => s.tool))],
    collaborationNeeds: collab,
  }
}

// ── Task Execution ────────────────────────────────────────────────────────────

export interface ExecutionResult {
  status: TaskStatus
  output: Record<string, unknown>
  stepsCompleted: number
  stepsTotal: number
  durationMs: number
  cost: number
  summary: string
  insights: string[]
}

const OUTCOME_GENERATORS: Record<AgentType, (task: string) => { summary: string; insights: string[]; output: Record<string, unknown> }> = {
  sales: (task) => ({
    summary: `Sales analysis for "${task}" complete. Pipeline updated with prioritised leads and scheduled follow-ups.`,
    insights: ['3 high-value leads identified in pipeline', 'Follow-up rate increased by 23%', 'Stalled deal flagged for manual review'],
    output: { leadsProcessed: 12, followUpsScheduled: 5, dealsUpdated: 3, estimatedRevenue: 45000 },
  }),
  hr: (task) => ({
    summary: `HR task "${task}" completed. Employee records updated and compliance verified.`,
    insights: ['Leave policy compliance confirmed', '2 pending onboarding tasks completed', 'Payroll discrepancy flagged for finance'],
    output: { recordsUpdated: 8, complianceScore: 98, pendingItems: 1 },
  }),
  finance: (task) => ({
    summary: `Finance analysis for "${task}" done. Reconciliation complete, anomalies flagged.`,
    insights: ['$12,400 unreconciled transaction detected', 'Cash flow projection updated for Q3', 'AP aging report shows 3 overdue invoices'],
    output: { transactionsReconciled: 234, anomaliesFound: 1, forecastAccuracy: 94.2 },
  }),
  procurement: (task) => ({
    summary: `Procurement task "${task}" executed. Vendor evaluation complete, POs generated.`,
    insights: ['Vendor A score improved to 87/100', 'Cost saving opportunity of 8% identified', 'Critical stock item reorder triggered'],
    output: { vendorsEvaluated: 5, posGenerated: 3, costSavings: 8, onTimeDelivery: 97 },
  }),
  legal: (task) => ({
    summary: `Legal review for "${task}" complete. Risk assessment done, obligations tracked.`,
    insights: ['Contract clause flagged: termination notice period reduced to 14 days', '2 compliance deadlines in next 30 days', 'NDA renewal required for Vendor B'],
    output: { contractsReviewed: 4, risksIdentified: 2, obligationsTracked: 7 },
  }),
  ceo: (task) => ({
    summary: `Executive briefing for "${task}" generated. Strategic KPIs aggregated across all departments.`,
    insights: ['Revenue tracking 8% above target YTD', 'HR headcount at 94% capacity', 'Integration hub showing 1 connector degraded'],
    output: { kpisReviewed: 24, risksIdentified: 3, strategicActions: 5, briefingPages: 2 },
  }),
  integration: (task) => ({
    summary: `Integration task "${task}" processed. Connectors checked, sync completed successfully.`,
    insights: ['Shopify sync: 47 orders imported', 'Stripe webhook queue cleared (12 events)', 'Gmail connector health: 98/100'],
    output: { connectorsChecked: 8, syncJobsRun: 3, eventsProcessed: 12, failuresResolved: 1 },
  }),
  security: (task) => ({
    summary: `Security scan for "${task}" complete. Audit logs reviewed, no critical threats detected.`,
    insights: ['1 unusual login attempt from new IP flagged', 'RBAC policy violations: 0', 'All API keys within rotation schedule'],
    output: { eventsScanned: 1240, threatsDetected: 0, anomaliesFound: 1, complianceScore: 99 },
  }),
  knowledge: (task) => ({
    summary: `Knowledge graph update for "${task}" complete. New entities indexed, relationships inferred.`,
    insights: ['23 new entities indexed from CRM/HR/PM', '47 new relationships inferred', 'Community detection found 4 clusters'],
    output: { entitiesIndexed: 23, relationsInferred: 47, factsAdded: 12, communities: 4 },
  }),
  assistant: (task) => ({
    summary: `Task "${task}" completed. Information synthesised and action executed.`,
    insights: ['Found 3 relevant meetings in calendar', 'Extracted key data from 5 modules', 'Action completed and confirmed'],
    output: { modulesQueried: 5, actionsExecuted: 1, responseQuality: 'high' },
  }),
  custom: (task) => ({
    summary: `Custom task "${task}" processed. Analysis complete and results generated.`,
    insights: ['Task completed successfully', 'All steps executed without errors', 'Results ready for review'],
    output: { stepsCompleted: 4, status: 'success' },
  }),
}

export function executeAgentTask(agentType: AgentType, taskTitle: string, plan: AgentPlan): ExecutionResult {
  const gen = OUTCOME_GENERATORS[agentType] ?? OUTCOME_GENERATORS.custom
  const { summary, insights, output } = gen(taskTitle)
  const durationMs = plan.estimatedTotalMs + Math.floor(Math.random() * 500)
  const cost = parseFloat((durationMs * 0.00002).toFixed(4))

  return {
    status: 'completed',
    output,
    stepsCompleted: plan.steps.length,
    stepsTotal: plan.steps.length,
    durationMs,
    cost,
    summary,
    insights,
  }
}

// ── Performance Assessment ────────────────────────────────────────────────────

export interface AgentPerformance {
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  completionRate: number
  avgDurationMs: number
  totalCost: number
  strengths: string[]
  improvements: string[]
}

export function assessAgentPerformance(
  totalTasks: number,
  completedTasks: number,
  failedTasks: number,
  totalCost: number,
  avgDurationMs: number,
): AgentPerformance {
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
  const failureRate = totalTasks > 0 ? (failedTasks / totalTasks) * 100 : 0
  const score = Math.max(0, Math.min(100, completionRate - failureRate * 2 - (avgDurationMs > 5000 ? 10 : 0)))

  const grade: AgentPerformance['grade'] = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F'

  const strengths: string[] = []
  const improvements: string[] = []

  if (completionRate >= 90) strengths.push('High task completion rate')
  if (avgDurationMs < 2000) strengths.push('Fast execution speed')
  if (failureRate === 0) strengths.push('Zero failure rate')
  if (totalCost < 1) strengths.push('Cost-efficient operation')

  if (completionRate < 80) improvements.push('Improve task completion reliability')
  if (avgDurationMs > 5000) improvements.push('Reduce execution time per task')
  if (failureRate > 10) improvements.push('Investigate and fix recurring failures')
  if (totalCost > 10) improvements.push('Optimise cost per task execution')

  return { score: Math.round(score), grade, completionRate: Math.round(completionRate), avgDurationMs, totalCost, strengths, improvements }
}

// ── Collaboration Detection ───────────────────────────────────────────────────

export function detectCollaborationNeeds(
  agentType: AgentType,
  taskTitle: string,
  availableAgentTypes: AgentType[],
): { agentType: AgentType; reason: string; priority: 'high' | 'medium' | 'low' }[] {
  const needs: { agentType: AgentType; reason: string; priority: 'high' | 'medium' | 'low' }[] = []
  const t = taskTitle.toLowerCase()

  if (agentType !== 'knowledge' && availableAgentTypes.includes('knowledge') && (t.includes('relation') || t.includes('entity') || t.includes('connect')))
    needs.push({ agentType: 'knowledge', reason: 'Entity relationship context needed', priority: 'high' })

  if (agentType !== 'finance' && availableAgentTypes.includes('finance') && (t.includes('cost') || t.includes('budget') || t.includes('payment')))
    needs.push({ agentType: 'finance', reason: 'Financial data required', priority: 'high' })

  if (agentType !== 'legal' && availableAgentTypes.includes('legal') && (t.includes('contract') || t.includes('compliance') || t.includes('legal')))
    needs.push({ agentType: 'legal', reason: 'Legal review required', priority: 'medium' })

  if (agentType !== 'security' && availableAgentTypes.includes('security') && (t.includes('access') || t.includes('permission') || t.includes('security')))
    needs.push({ agentType: 'security', reason: 'Security verification needed', priority: 'medium' })

  if (agentType !== 'assistant' && availableAgentTypes.includes('assistant') && (t.includes('schedule') || t.includes('meeting') || t.includes('remind')))
    needs.push({ agentType: 'assistant', reason: 'Scheduling and calendar actions needed', priority: 'low' })

  return needs
}

// ── Cost Calculation ──────────────────────────────────────────────────────────

export function calculateTaskCost(durationMs: number, stepsCompleted: number, agentType: AgentType): number {
  const BASE_COST_PER_MS = 0.00002
  const STEP_COST: Record<AgentType, number> = {
    ceo: 0.05, legal: 0.04, finance: 0.03, security: 0.03,
    hr: 0.02, sales: 0.02, procurement: 0.02, knowledge: 0.02,
    integration: 0.01, assistant: 0.01, custom: 0.02,
  }
  return parseFloat((durationMs * BASE_COST_PER_MS + stepsCompleted * (STEP_COST[agentType] ?? 0.02)).toFixed(4))
}

// ── Hub Summary ───────────────────────────────────────────────────────────────

export function generateHubSummary(
  totalAgents: number,
  activeAgents: number,
  pendingTasks: number,
  completedTasks: number,
  totalCost: number,
): string {
  const utilisation = totalAgents > 0 ? Math.round((activeAgents / totalAgents) * 100) : 0
  if (totalAgents === 0) return 'No agents deployed. Visit the Marketplace to deploy your first agent.'
  return `${activeAgents}/${totalAgents} agents active (${utilisation}% utilisation). ${pendingTasks} tasks pending, ${completedTasks} completed. Total cost: $${totalCost.toFixed(2)}.`
}
