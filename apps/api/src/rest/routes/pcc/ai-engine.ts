// Phase 55 — AI Platform Command Center: AI Engine

// ── Platform Modules Registry ─────────────────────────────────────────────────

export const PLATFORM_MODULES = [
  { id: 'core', name: 'Core Platform', icon: '🏢', category: 'foundation' },
  { id: 'crm', name: 'CRM', icon: '👥', category: 'business' },
  { id: 'hr', name: 'HR', icon: '👨‍💼', category: 'business' },
  { id: 'finance', name: 'Finance', icon: '💰', category: 'business' },
  { id: 'brain', name: 'Reno Brain', icon: '🧠', category: 'ai' },
  { id: 'agents', name: 'AI Agents', icon: '🤖', category: 'ai' },
  { id: 'knowledge_graph', name: 'Knowledge Graph', icon: '🕸️', category: 'ai' },
  { id: 'action_layer', name: 'Action Layer', icon: '⚡', category: 'ai' },
  { id: 'learning', name: 'Learning & Opt', icon: '📈', category: 'ai' },
  { id: 'aos', name: 'AOS Runtime', icon: '⚙️', category: 'ai' },
  { id: 'pae', name: 'Process Automation', icon: '🔄', category: 'ai' },
  { id: 'adi', name: 'Document Intelligence', icon: '📄', category: 'ai' },
  { id: 'mch', name: 'Comm Hub', icon: '📡', category: 'communication' },
  { id: 'analytics', name: 'Analytics', icon: '📊', category: 'intelligence' },
  { id: 'security', name: 'Security', icon: '🔒', category: 'platform' },
  { id: 'backup', name: 'Backup & DR', icon: '💾', category: 'platform' },
] as const

// ── Health Check Simulation ───────────────────────────────────────────────────

export interface ModuleHealth {
  module: string
  status: 'healthy' | 'degraded' | 'down'
  responseMs: number
  details: Record<string, unknown>
}

export function runHealthCheck(moduleId: string): ModuleHealth {
  const rand = Math.random()
  const responseMs = 10 + Math.floor(Math.random() * 90)

  const status: ModuleHealth['status'] = rand < 0.92 ? 'healthy' : rand < 0.98 ? 'degraded' : 'down'

  const details: Record<string, unknown> = {
    latency: responseMs, dbConnected: true, lastCheck: new Date().toISOString(),
    ...(status === 'degraded' && { warning: 'High response time detected' }),
    ...(status === 'down' && { error: 'Service unavailable' }),
  }

  return { module: moduleId, status, responseMs, details }
}

// ── Platform Metrics Aggregation ──────────────────────────────────────────────

export interface PlatformMetrics {
  aiScore: number
  trend: 'improving' | 'stable' | 'declining'
  modules: {
    totalModules: number; healthyModules: number; degradedModules: number; downModules: number
  }
  ai: {
    totalAgentTasks: number; totalToolCalls: number; totalLearningEvents: number
    avgTaskSuccessRate: number; totalEventsProcessed: number
  }
  business: {
    totalCrmContacts: number; totalDocumentsProcessed: number
    totalMessagesSent: number; totalWorkflowRuns: number
  }
  costSummary: {
    totalAiCost: number; budgetUsedPct: number
  }
}

export async function gatherPlatformMetrics(
  prisma: import('@prisma/client').PrismaClient,
  tenantId: string,
): Promise<PlatformMetrics> {
  const [
    agentTasks, toolCalls, learningEvents, aosEvents, aosJobs,
    documents, messages, workflowRuns, resourceUsage,
  ] = await Promise.all([
    prisma.eapAgentTask.count({ where: { tenantId } }).catch(() => 0),
    prisma.ualToolExecution.count({ where: { tenantId } }).catch(() => 0),
    prisma.aclLearningEvent.count({ where: { tenantId } }).catch(() => 0),
    prisma.aosEvent.count({ where: { tenantId } }).catch(() => 0),
    prisma.aosJobExecution.count({ where: { tenantId } }).catch(() => 0),
    prisma.adiDocument.count({ where: { tenantId, deletedAt: null } }).catch(() => 0),
    prisma.mchMessage.count({ where: { tenantId } }).catch(() => 0),
    prisma.paeWorkflowExecution.count({ where: { tenantId } }).catch(() => 0),
    prisma.aosResourceUsage.findFirst({ where: { tenantId }, orderBy: { createdAt: 'desc' } }).catch(() => null),
  ])

  const successfulTasks = await prisma.eapAgentTask.count({ where: { tenantId, status: 'completed' } }).catch(() => 0)
  const avgTaskSuccessRate = agentTasks > 0 ? (successfulTasks / agentTasks) * 100 : 100

  const totalCost = resourceUsage?.totalCost ?? 0
  const budgetUsedPct = resourceUsage?.budgetUsedPct ?? 0

  // AI Score: weighted average of health indicators
  const aiScore = Math.round(
    (avgTaskSuccessRate * 0.3) +
    (Math.min(agentTasks / 10, 100) * 0.2) +
    (Math.min(toolCalls / 20, 100) * 0.2) +
    (Math.min(learningEvents / 5, 100) * 0.15) +
    (Math.max(100 - budgetUsedPct, 0) * 0.15),
  )

  const trend: PlatformMetrics['trend'] = aiScore >= 75 ? 'improving' : aiScore >= 50 ? 'stable' : 'declining'

  return {
    aiScore,
    trend,
    modules: { totalModules: PLATFORM_MODULES.length, healthyModules: 0, degradedModules: 0, downModules: 0 },
    ai: { totalAgentTasks: agentTasks, totalToolCalls: toolCalls, totalLearningEvents: learningEvents, avgTaskSuccessRate, totalEventsProcessed: aosEvents + aosJobs },
    business: { totalCrmContacts: 0, totalDocumentsProcessed: documents, totalMessagesSent: messages, totalWorkflowRuns: workflowRuns },
    costSummary: { totalAiCost: totalCost, budgetUsedPct },
  }
}

// ── Alert Generation ──────────────────────────────────────────────────────────

export interface AlertSuggestion {
  module: string
  alertType: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  metadata: Record<string, unknown>
}

export function generateAlerts(metrics: PlatformMetrics, health: ModuleHealth[]): AlertSuggestion[] {
  const alerts: AlertSuggestion[] = []

  // Budget alert
  if (metrics.costSummary.budgetUsedPct >= 80) {
    alerts.push({
      module: 'aos', alertType: 'budget_warning', severity: metrics.costSummary.budgetUsedPct >= 100 ? 'critical' : 'warning',
      title: `AI Budget ${metrics.costSummary.budgetUsedPct >= 100 ? 'Exceeded' : 'Near Limit'}`,
      message: `AI budget is at ${metrics.costSummary.budgetUsedPct.toFixed(0)}% ($${metrics.costSummary.totalAiCost.toFixed(2)})`,
      metadata: { budgetUsedPct: metrics.costSummary.budgetUsedPct, totalCost: metrics.costSummary.totalAiCost },
    })
  }

  // Down module alerts
  for (const h of health) {
    if (h.status === 'down') {
      alerts.push({
        module: h.module, alertType: 'module_down', severity: 'critical',
        title: `Module ${h.module} is Down`,
        message: `Health check failed for ${h.module} (${h.responseMs}ms)`,
        metadata: h.details,
      })
    } else if (h.status === 'degraded') {
      alerts.push({
        module: h.module, alertType: 'module_degraded', severity: 'warning',
        title: `Module ${h.module} Degraded`,
        message: `Performance degradation detected (${h.responseMs}ms response)`,
        metadata: h.details,
      })
    }
  }

  // AI score alert
  if (metrics.aiScore < 50) {
    alerts.push({
      module: 'platform', alertType: 'low_ai_score', severity: 'warning',
      title: 'AI Platform Score Below Threshold',
      message: `AI score is ${metrics.aiScore}/100. Review learning events and agent performance.`,
      metadata: { aiScore: metrics.aiScore, trend: metrics.trend },
    })
  }

  return alerts
}

// ── Intelligence Insights ─────────────────────────────────────────────────────

export interface PlatformInsight {
  type: 'opportunity' | 'risk' | 'achievement' | 'recommendation'
  title: string
  description: string
  impact: 'low' | 'medium' | 'high'
  module: string
  actionable: boolean
}

export function generateInsights(metrics: PlatformMetrics): PlatformInsight[] {
  const insights: PlatformInsight[] = []

  if (metrics.ai.totalToolCalls > 100) {
    insights.push({ type: 'achievement', title: 'High Tool Adoption', description: `${metrics.ai.totalToolCalls} tool calls processed. Automation is working.`, impact: 'high', module: 'action_layer', actionable: false })
  }

  if (metrics.ai.avgTaskSuccessRate < 70) {
    insights.push({ type: 'risk', title: 'Agent Task Success Rate Low', description: `Only ${metrics.ai.avgTaskSuccessRate.toFixed(0)}% of agent tasks succeed. Review agent configs.`, impact: 'high', module: 'agents', actionable: true })
  }

  if (metrics.business.totalDocumentsProcessed > 0) {
    insights.push({ type: 'achievement', title: 'Document Intelligence Active', description: `${metrics.business.totalDocumentsProcessed} documents processed. AI extraction is delivering value.`, impact: 'medium', module: 'adi', actionable: false })
  }

  if (metrics.ai.totalLearningEvents === 0) {
    insights.push({ type: 'recommendation', title: 'Learning Engine Idle', description: 'No learning events recorded. Enable AI tools to start continuous improvement.', impact: 'medium', module: 'learning', actionable: true })
  }

  if (metrics.costSummary.totalAiCost === 0) {
    insights.push({ type: 'opportunity', title: 'AI Usage Not Started', description: 'No AI cost tracked yet. Consider enabling AI tools and agents.', impact: 'high', module: 'platform', actionable: true })
  }

  if (metrics.business.totalWorkflowRuns > 10) {
    insights.push({ type: 'achievement', title: 'Process Automation Running', description: `${metrics.business.totalWorkflowRuns} workflow runs completed. Process automation is active.`, impact: 'medium', module: 'pae', actionable: false })
  }

  return insights
}

// ── Command Center Summary ────────────────────────────────────────────────────

export function generateCommandCenterSummary(aiScore: number, trend: string, alertCount: number, healthyModules: number, totalModules: number): string {
  const health = Math.round((healthyModules / totalModules) * 100)
  const trendIcon = trend === 'improving' ? '↑' : trend === 'declining' ? '↓' : '→'
  return `Platform AI Score: ${aiScore}/100 ${trendIcon} · ${health}% modules healthy · ${alertCount} active alert${alertCount !== 1 ? 's' : ''}`
}
