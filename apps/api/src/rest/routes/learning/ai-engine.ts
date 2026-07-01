// Phase 50 — AI Continuous Learning & Optimization Platform: AI Engine

export type LearningEventType =
  | 'tool_execution' | 'suggestion_accepted' | 'suggestion_rejected'
  | 'agent_task_result' | 'policy_trigger' | 'kg_query' | 'user_feedback'

export type InsightSeverity = 'info' | 'warning' | 'critical'
export type InsightStatus = 'open' | 'acknowledged' | 'applied' | 'dismissed'
export type KgFeedbackType = 'new_entity' | 'new_relation' | 'new_fact' | 'correction'
export type EvolutionTrend = 'improving' | 'stable' | 'declining'

// ── Tool Performance Analysis ─────────────────────────────────────────────────

export interface ToolPerformanceMetrics {
  totalCalls: number
  successRate: number
  avgDurationMs: number
  totalCost: number
  failureRate: number
  blockedRate: number
}

export interface ToolInsightResult {
  insightType: string
  severity: InsightSeverity
  title: string
  description: string
  suggestions: string[]
  metrics: Record<string, unknown>
}

export function analyzeToolPerformance(
  toolSlug: string,
  toolCategory: string,
  metrics: ToolPerformanceMetrics,
): ToolInsightResult[] {
  const insights: ToolInsightResult[] = []

  if (metrics.totalCalls < 5) return insights

  if (metrics.failureRate > 0.3) {
    insights.push({
      insightType: 'high_failure_rate',
      severity: metrics.failureRate > 0.5 ? 'critical' : 'warning',
      title: `High failure rate on '${toolSlug}'`,
      description: `${(metrics.failureRate * 100).toFixed(1)}% of executions are failing. This is significantly above the acceptable threshold of 10%.`,
      suggestions: [
        'Review input validation rules — callers may be sending malformed data',
        'Check tool endpoint availability and authentication config',
        'Enable require_approval policy to gate untrusted callers',
        'Review recent failed execution logs for common error patterns',
      ],
      metrics: { failureRate: metrics.failureRate, totalCalls: metrics.totalCalls },
    })
  }

  if (metrics.avgDurationMs > 4000) {
    insights.push({
      insightType: 'slow_response',
      severity: metrics.avgDurationMs > 8000 ? 'critical' : 'warning',
      title: `Slow response time on '${toolSlug}'`,
      description: `Average duration is ${metrics.avgDurationMs}ms. Agents depending on this tool may be timing out or accumulating cost.`,
      suggestions: [
        'Consider caching frequent read-only responses',
        'Add a timeout policy to fail fast and try alternatives',
        'Profile the tool endpoint for bottlenecks',
        'Evaluate switching to a faster tool variant',
      ],
      metrics: { avgDurationMs: metrics.avgDurationMs },
    })
  }

  const COST_THRESHOLDS: Record<string, number> = {
    search: 0.5, analytics: 0.3, integration: 0.4, default: 0.2,
  }
  const costThreshold = COST_THRESHOLDS[toolCategory] ?? COST_THRESHOLDS.default
  const avgCostPerCall = metrics.totalCalls > 0 ? metrics.totalCost / metrics.totalCalls : 0
  if (avgCostPerCall > costThreshold) {
    insights.push({
      insightType: 'high_cost',
      severity: 'warning',
      title: `High per-call cost on '${toolSlug}'`,
      description: `Average cost per call is $${avgCostPerCall.toFixed(4)}, above the ${toolCategory} category threshold of $${costThreshold}.`,
      suggestions: [
        'Add rate-limit policies to cap usage by agents and users',
        'Consider batching multiple calls into a single request',
        'Review if a cheaper tool alternative exists in the catalog',
      ],
      metrics: { avgCostPerCall, threshold: costThreshold, totalCost: metrics.totalCost },
    })
  }

  if (metrics.blockedRate > 0.2) {
    insights.push({
      insightType: 'policy_over_restriction',
      severity: 'info',
      title: `High block rate on '${toolSlug}'`,
      description: `${(metrics.blockedRate * 100).toFixed(1)}% of calls are blocked by policy. This may indicate overly restrictive rules.`,
      suggestions: [
        'Review deny policies — some agents or users may legitimately need access',
        'Consider changing deny to require_approval for borderline cases',
        'Audit which subjects are most frequently blocked',
      ],
      metrics: { blockedRate: metrics.blockedRate },
    })
  }

  if (metrics.successRate > 0.97 && metrics.totalCalls > 50 && avgCostPerCall < 0.01) {
    insights.push({
      insightType: 'optimization_opportunity',
      severity: 'info',
      title: `'${toolSlug}' is a high-performing candidate for caching`,
      description: `This tool has a ${(metrics.successRate * 100).toFixed(1)}% success rate and low cost — ideal for response caching to further reduce latency and cost.`,
      suggestions: [
        'Enable a caching layer for deterministic inputs',
        'Mark as a preferred tool in agent discovery',
      ],
      metrics: { successRate: metrics.successRate, avgCostPerCall },
    })
  }

  return insights
}

// ── Agent Performance Analysis ────────────────────────────────────────────────

export interface AgentPerformanceMetrics {
  agentType: string
  totalTasks: number
  completedTasks: number
  failedTasks: number
  totalCost: number
  avgDurationMs: number
}

export interface AgentInsightResult {
  insightType: string
  severity: InsightSeverity
  title: string
  description: string
  suggestions: string[]
  metrics: Record<string, unknown>
}

export function analyzeAgentPerformance(
  agentName: string,
  metrics: AgentPerformanceMetrics,
): AgentInsightResult[] {
  const insights: AgentInsightResult[] = []

  if (metrics.totalTasks < 3) return insights

  const completionRate = metrics.totalTasks > 0 ? metrics.completedTasks / metrics.totalTasks : 1
  const failureRate = metrics.totalTasks > 0 ? metrics.failedTasks / metrics.totalTasks : 0

  if (failureRate > 0.25) {
    insights.push({
      insightType: 'low_completion_rate',
      severity: failureRate > 0.5 ? 'critical' : 'warning',
      title: `Low task completion rate for '${agentName}'`,
      description: `${(failureRate * 100).toFixed(1)}% of tasks are failing. Review the agent's tool access and goal configuration.`,
      suggestions: [
        'Review whether the agent has access to required tools',
        'Check for policy blocks preventing tool execution',
        "Refine the agent's personality and goal definitions",
        'Consider splitting complex tasks into sub-tasks via collaboration',
      ],
      metrics: { failureRate, completionRate, totalTasks: metrics.totalTasks },
    })
  }

  const avgCostPerTask = metrics.totalTasks > 0 ? metrics.totalCost / metrics.totalTasks : 0
  if (avgCostPerTask > 0.5) {
    insights.push({
      insightType: 'high_task_cost',
      severity: 'warning',
      title: `High task cost for '${agentName}'`,
      description: `Average cost per task is $${avgCostPerTask.toFixed(3)}. Consider optimizing tool selection and task planning.`,
      suggestions: [
        'Use cheaper tools where possible (e.g., local search over web search)',
        'Reduce unnecessary tool calls in task plans',
        'Set per-agent cost budgets in the policy engine',
      ],
      metrics: { avgCostPerTask, totalCost: metrics.totalCost },
    })
  }

  if (completionRate > 0.92 && metrics.totalTasks > 20) {
    insights.push({
      insightType: 'strategy_improvement',
      severity: 'info',
      title: `'${agentName}' is a top performer — consider expanding its role`,
      description: `This agent achieves ${(completionRate * 100).toFixed(1)}% completion across ${metrics.totalTasks} tasks. It may be suitable for more complex or high-priority workflows.`,
      suggestions: [
        'Assign this agent as a primary handler for critical workflows',
        'Use as a collaboration target for other agents in its domain',
        'Consider creating specialised sub-agents based on its most common task patterns',
      ],
      metrics: { completionRate, totalTasks: metrics.totalTasks },
    })
  }

  const SLOW_THRESHOLDS: Record<string, number> = {
    ceo: 30000, finance: 20000, legal: 25000, default: 15000,
  }
  const slowThreshold = SLOW_THRESHOLDS[metrics.agentType] ?? SLOW_THRESHOLDS.default
  if (metrics.avgDurationMs > slowThreshold) {
    insights.push({
      insightType: 'slow_execution',
      severity: 'info',
      title: `'${agentName}' tasks are running slowly`,
      description: `Average task duration is ${(metrics.avgDurationMs / 1000).toFixed(1)}s, above the ${metrics.agentType} agent threshold.`,
      suggestions: [
        'Reduce plan complexity — fewer steps per task',
        'Pre-cache common tool responses used by this agent',
        'Review if collaboration with other agents can parallelize work',
      ],
      metrics: { avgDurationMs: metrics.avgDurationMs, threshold: slowThreshold },
    })
  }

  return insights
}

// ── Policy Analysis ───────────────────────────────────────────────────────────

export interface PolicyRecord {
  id: string
  name: string
  toolId: string
  subjectType: string
  subjectId: string | null
  action: string
  priority: number
  isActive: boolean
}

export interface PolicyInsightResult {
  insightType: string
  severity: InsightSeverity
  title: string
  description: string
  affectedPolicies: string[]
  suggestion: string
}

export function analyzePolicies(policies: PolicyRecord[]): PolicyInsightResult[] {
  const insights: PolicyInsightResult[] = []
  const active = policies.filter(p => p.isActive)

  // Detect conflicts: same tool + same subject has both allow and deny
  const byToolSubject = new Map<string, PolicyRecord[]>()
  for (const p of active) {
    const key = `${p.toolId}:${p.subjectType}:${p.subjectId ?? '*'}`
    if (!byToolSubject.has(key)) byToolSubject.set(key, [])
    byToolSubject.get(key)!.push(p)
  }

  for (const [, group] of byToolSubject) {
    const actions = new Set(group.map(p => p.action))
    if (actions.has('allow') && actions.has('deny')) {
      insights.push({
        insightType: 'conflict',
        severity: 'critical',
        title: 'Conflicting allow/deny policies on the same tool+subject',
        description: `${group.length} policies exist on the same tool/subject combination with contradictory actions. The deny will take precedence, but this may be unintentional.`,
        affectedPolicies: group.map(p => p.name),
        suggestion: 'Review and consolidate these policies. Keep only one action per tool/subject scope, or use priority ordering intentionally.',
      })
    }
  }

  // Detect redundancy: multiple 'allow all' policies on same tool
  const byTool = new Map<string, PolicyRecord[]>()
  for (const p of active) {
    if (!byTool.has(p.toolId)) byTool.set(p.toolId, [])
    byTool.get(p.toolId)!.push(p)
  }

  for (const [, group] of byTool) {
    const allowAll = group.filter(p => p.action === 'allow' && p.subjectType === 'all')
    if (allowAll.length > 1) {
      insights.push({
        insightType: 'redundancy',
        severity: 'info',
        title: 'Redundant allow-all policies on the same tool',
        description: `${allowAll.length} 'allow all' policies exist for the same tool. Only one is needed.`,
        affectedPolicies: allowAll.map(p => p.name),
        suggestion: 'Remove all but the highest-priority allow-all policy to keep rules clean.',
      })
    }
  }

  // Detect no-policy tools (gap detection — communicated as info)
  if (active.length === 0 && policies.length > 0) {
    insights.push({
      insightType: 'gap',
      severity: 'info',
      title: 'All policies are inactive',
      description: 'No active execution policies found. All tool executions default to allow.',
      affectedPolicies: [],
      suggestion: 'Consider adding at least a default policy to enforce rate-limits and prevent abuse.',
    })
  }

  return insights
}

// ── Knowledge Graph Feedback Generation ──────────────────────────────────────

export interface KgFeedbackProposal {
  feedbackType: KgFeedbackType
  sourceModule: string
  proposedData: Record<string, unknown>
  confidence: number
}

export function generateKgFeedbackFromToolExecution(
  toolSlug: string,
  input: Record<string, unknown>,
  output: Record<string, unknown>,
): KgFeedbackProposal[] {
  const proposals: KgFeedbackProposal[] = []

  if (toolSlug.startsWith('crm_') && output.contact) {
    const c = output.contact as Record<string, unknown>
    if (c.name && c.email) {
      proposals.push({
        feedbackType: 'new_entity',
        sourceModule: 'action-layer',
        proposedData: { type: 'Person', name: c.name, email: c.email, source: 'crm_contact', toolSlug },
        confidence: 75,
      })
    }
  }

  if (toolSlug.startsWith('hr_') && output.employee) {
    const e = output.employee as Record<string, unknown>
    if (e.name && e.department) {
      proposals.push({
        feedbackType: 'new_relation',
        sourceModule: 'action-layer',
        proposedData: { fromType: 'Person', fromName: e.name, relation: 'WORKS_IN', toType: 'Department', toName: e.department },
        confidence: 80,
      })
    }
  }

  if (toolSlug === 'web_search' && input.query) {
    proposals.push({
      feedbackType: 'new_fact',
      sourceModule: 'action-layer',
      proposedData: { subject: 'SearchQuery', predicate: 'returned', object: String(output.total ?? 0) + ' results', query: input.query },
      confidence: 45,
    })
  }

  return proposals
}

// ── Evolution Snapshot Generation ────────────────────────────────────────────

export interface EvolutionMetrics {
  toolMetrics: { totalTools: number; activeTools: number; totalExecutions: number; successRate: number; avgCostPerExecution: number }
  agentMetrics: { totalAgents: number; activeAgents: number; totalTasks: number; completionRate: number; avgTaskCost: number }
  kgMetrics: { totalEntities: number; totalRelations: number; totalFacts: number; pendingFeedback: number }
  policyMetrics: { totalPolicies: number; activePolicies: number; blockedExecutions: number; insightCount: number }
}

export function calculateEvolutionScore(metrics: EvolutionMetrics): { score: number; trend?: EvolutionTrend; notes: string[] } {
  const notes: string[] = []
  let score = 0

  // Tools (30 pts)
  const toolScore = Math.min(30, Math.round(metrics.toolMetrics.successRate * 20 + (metrics.toolMetrics.activeTools / Math.max(1, metrics.toolMetrics.totalTools)) * 10))
  score += toolScore
  if (metrics.toolMetrics.successRate < 0.8) notes.push('Tool success rate below 80% — investigate failing tools')

  // Agents (30 pts)
  const agentScore = Math.min(30, Math.round(metrics.agentMetrics.completionRate * 20 + (metrics.agentMetrics.activeAgents / Math.max(1, metrics.agentMetrics.totalAgents)) * 10))
  score += agentScore
  if (metrics.agentMetrics.completionRate < 0.75) notes.push('Agent task completion below 75% — review agent configurations')

  // Knowledge Graph (20 pts)
  const kgScore = Math.min(20, Math.round((metrics.kgMetrics.totalEntities > 0 ? 10 : 0) + (metrics.kgMetrics.pendingFeedback < 10 ? 10 : 5)))
  score += kgScore
  if (metrics.kgMetrics.pendingFeedback > 20) notes.push(`${metrics.kgMetrics.pendingFeedback} KG feedback items awaiting review`)

  // Policies (20 pts)
  const policyScore = Math.min(20, Math.round(
    (metrics.policyMetrics.activePolicies > 0 ? 10 : 0) +
    (metrics.policyMetrics.insightCount === 0 ? 10 : metrics.policyMetrics.insightCount < 3 ? 7 : 3),
  ))
  score += policyScore
  if (metrics.policyMetrics.insightCount > 5) notes.push('Multiple open policy insights — consolidate and clean up policies')

  if (score === 0) return { score: 0, notes }

  return { score: Math.min(100, score), notes }
}

export function determineEvolutionTrend(current: number, previous: number | null): EvolutionTrend {
  if (previous === null) return 'stable'
  const delta = current - previous
  if (delta >= 5) return 'improving'
  if (delta <= -5) return 'declining'
  return 'stable'
}

// ── Learning Loop Score ───────────────────────────────────────────────────────

export interface LearningStats {
  totalEvents: number
  successEvents: number
  failureEvents: number
  feedbackPositive: number
  feedbackNegative: number
  openInsights: number
  appliedInsights: number
}

export function calculateLearningScore(stats: LearningStats): { score: number; grade: 'A' | 'B' | 'C' | 'D' | 'F'; summary: string } {
  if (stats.totalEvents === 0) return { score: 0, grade: 'F', summary: 'No learning events recorded yet. Start using agents and tools to build the learning loop.' }

  let score = 50 // baseline for having events

  const successRate = stats.successEvents / stats.totalEvents
  score += Math.round(successRate * 25) // 0–25

  const feedbackTotal = stats.feedbackPositive + stats.feedbackNegative
  if (feedbackTotal > 0) {
    const posRate = stats.feedbackPositive / feedbackTotal
    score += Math.round(posRate * 15) // 0–15
  }

  const totalInsights = stats.openInsights + stats.appliedInsights
  if (totalInsights > 0) {
    const appliedRate = stats.appliedInsights / totalInsights
    score += Math.round(appliedRate * 10) // 0–10
  }

  score = Math.min(100, Math.max(0, score))
  const grade: 'A' | 'B' | 'C' | 'D' | 'F' = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 45 ? 'D' : 'F'

  const summary = score >= 80
    ? `Strong learning loop (${score}/100). The system is consistently learning from outcomes and applying insights.`
    : score >= 60
    ? `Developing learning loop (${score}/100). Good event volume — focus on applying open insights to improve further.`
    : `Early-stage learning (${score}/100). Increase system usage and apply open insights to build momentum.`

  return { score, grade, summary }
}

// ── Optimization Suggestions ──────────────────────────────────────────────────

export interface OptimizationSuggestion {
  category: 'tools' | 'agents' | 'policies' | 'knowledge'
  priority: 'high' | 'medium' | 'low'
  action: string
  impact: string
}

export function generateTopSuggestions(
  toolInsightCount: number,
  agentInsightCount: number,
  policyInsightCount: number,
  kgPendingFeedback: number,
): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = []

  if (toolInsightCount > 0) {
    suggestions.push({ category: 'tools', priority: toolInsightCount > 3 ? 'high' : 'medium', action: `Review ${toolInsightCount} open tool insight${toolInsightCount > 1 ? 's' : ''}`, impact: 'Reduce cost and improve success rates across the action layer' })
  }
  if (agentInsightCount > 0) {
    suggestions.push({ category: 'agents', priority: agentInsightCount > 2 ? 'high' : 'medium', action: `Apply ${agentInsightCount} agent optimization insight${agentInsightCount > 1 ? 's' : ''}`, impact: 'Improve agent task completion rates and reduce per-task cost' })
  }
  if (policyInsightCount > 0) {
    suggestions.push({ category: 'policies', priority: 'high', action: `Resolve ${policyInsightCount} policy conflict${policyInsightCount > 1 ? 's' : ''} or redundanc${policyInsightCount > 1 ? 'ies' : 'y'}`, impact: 'Prevent unintended blocks and ensure correct access control' })
  }
  if (kgPendingFeedback > 0) {
    suggestions.push({ category: 'knowledge', priority: kgPendingFeedback > 10 ? 'medium' : 'low', action: `Review ${kgPendingFeedback} pending Knowledge Graph feedback item${kgPendingFeedback > 1 ? 's' : ''}`, impact: 'Enrich the knowledge graph with newly discovered relationships' })
  }
  if (suggestions.length === 0) {
    suggestions.push({ category: 'tools', priority: 'low', action: 'System is well-optimized — run a new evolution snapshot to confirm', impact: 'Maintain current performance baseline' })
  }

  return suggestions
}

// ── Dashboard Summary ─────────────────────────────────────────────────────────

export function generateLearningSummary(learningScore: number, grade: string, totalEvents: number, appliedInsights: number): string {
  if (totalEvents === 0) return 'No learning events yet. Use agents and tools to start building the optimization loop.'
  return `Learning score ${learningScore}/100 (${grade}) · ${totalEvents} events processed · ${appliedInsights} insights applied — system is continuously optimizing.`
}
