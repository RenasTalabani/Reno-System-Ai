// Phase 51 — AI Enterprise Operating System Runtime: AI Engine

export type RuntimeStatus = 'running' | 'paused' | 'stopped' | 'error'
export type JobType = 'scheduled' | 'event_triggered' | 'manual' | 'recurring'
export type HookType =
  | 'pre_tool_execution' | 'post_tool_execution'
  | 'pre_agent_task' | 'post_agent_task'
  | 'on_policy_block' | 'on_error' | 'on_event'
export type EventPriority = 'low' | 'normal' | 'high' | 'critical'

// ── System Event Channels ─────────────────────────────────────────────────────

export const EVENT_CHANNELS = [
  'agent.task.started', 'agent.task.completed', 'agent.task.failed',
  'tool.executed', 'tool.blocked', 'tool.error',
  'policy.triggered', 'policy.blocked',
  'job.started', 'job.completed', 'job.failed',
  'resource.threshold_reached', 'resource.budget_exceeded',
  'learning.insight_generated', 'kg.feedback_proposed',
  'runtime.started', 'runtime.paused', 'runtime.error',
  'user.action', 'system.alert',
] as const

export type EventChannel = typeof EVENT_CHANNELS[number]

// ── Built-in Job Templates ────────────────────────────────────────────────────

export interface JobTemplate {
  name: string
  slug: string
  jobType: JobType
  handler: string
  defaultSchedule?: string
  description: string
  params: Record<string, unknown>
}

export const JOB_TEMPLATES: JobTemplate[] = [
  {
    name: 'Daily Learning Optimization',
    slug: 'daily_learning_opt',
    jobType: 'scheduled',
    handler: 'learning:runOptimization',
    defaultSchedule: '0 6 * * *',
    description: 'Run full learning optimization scan every morning at 06:00',
    params: {},
  },
  {
    name: 'Hourly Resource Snapshot',
    slug: 'hourly_resource_snapshot',
    jobType: 'recurring',
    handler: 'aos:captureResourceUsage',
    defaultSchedule: '0 * * * *',
    description: 'Capture hourly resource usage across all modules',
    params: { period: 'hourly' },
  },
  {
    name: 'Daily Evolution Snapshot',
    slug: 'daily_evolution_snapshot',
    jobType: 'scheduled',
    handler: 'learning:evolutionSnapshot',
    defaultSchedule: '30 23 * * *',
    description: 'Take a daily evolution snapshot at 23:30',
    params: { period: 'daily' },
  },
  {
    name: 'Weekly Agent Performance Review',
    slug: 'weekly_agent_review',
    jobType: 'scheduled',
    handler: 'learning:agentInsightsAnalyze',
    defaultSchedule: '0 9 * * 1',
    description: 'Analyze agent performance every Monday at 09:00',
    params: {},
  },
  {
    name: 'Weekly Tool Health Check',
    slug: 'weekly_tool_health',
    jobType: 'scheduled',
    handler: 'learning:toolInsightsAnalyze',
    defaultSchedule: '0 9 * * 1',
    description: 'Analyze tool health every Monday at 09:00',
    params: {},
  },
  {
    name: 'KG Feedback Digest',
    slug: 'daily_kg_digest',
    jobType: 'scheduled',
    handler: 'learning:kgFeedbackDigest',
    defaultSchedule: '0 8 * * *',
    description: 'Send daily KG feedback digest to knowledge admins',
    params: {},
  },
  {
    name: 'Policy Conflict Scan',
    slug: 'weekly_policy_scan',
    jobType: 'scheduled',
    handler: 'learning:policyInsightsAnalyze',
    defaultSchedule: '0 8 * * 1',
    description: 'Detect policy conflicts and gaps weekly',
    params: {},
  },
]

// ── Cron Schedule Parsing ─────────────────────────────────────────────────────

export function parseCronDescription(schedule: string): string {
  const PRESETS: Record<string, string> = {
    '0 * * * *':   'Every hour',
    '0 6 * * *':   'Daily at 06:00',
    '0 8 * * *':   'Daily at 08:00',
    '30 23 * * *': 'Daily at 23:30',
    '0 9 * * 1':   'Every Monday at 09:00',
    '0 0 * * *':   'Daily at midnight',
    '0 12 * * *':  'Daily at noon',
    '0 0 * * 0':   'Every Sunday at midnight',
    '0 0 1 * *':   'First day of every month',
  }
  return PRESETS[schedule] ?? `Cron: ${schedule}`
}

export function calculateNextRunAt(schedule: string, fromNow = new Date()): Date {
  const parts = schedule.split(' ')
  if (parts.length !== 5) return new Date(fromNow.getTime() + 60_000)
  const [minute, hour] = parts.map(Number)
  const next = new Date(fromNow)
  next.setSeconds(0, 0)
  if (!isNaN(hour)) next.setHours(hour)
  if (!isNaN(minute)) next.setMinutes(minute)
  if (next <= fromNow) next.setDate(next.getDate() + 1)
  return next
}

// ── Event Priority & Routing ──────────────────────────────────────────────────

export function resolveEventPriority(channel: string, payload: Record<string, unknown>): EventPriority {
  if (channel.includes('error') || channel.includes('budget_exceeded')) return 'critical'
  if (channel.includes('blocked') || channel.includes('threshold_reached')) return 'high'
  if (channel.includes('failed')) return 'high'
  if (channel.includes('completed') || channel.includes('started')) return 'normal'
  if ((payload.priority as string) === 'critical') return 'critical'
  return 'normal'
}

export function getHooksForChannel(channel: string, hookType: HookType): boolean {
  const CHANNEL_HOOK_MAP: Partial<Record<HookType, string[]>> = {
    pre_tool_execution:  ['tool.executed'],
    post_tool_execution: ['tool.executed', 'tool.error', 'tool.blocked'],
    pre_agent_task:      ['agent.task.started'],
    post_agent_task:     ['agent.task.completed', 'agent.task.failed'],
    on_policy_block:     ['tool.blocked', 'policy.blocked', 'policy.triggered'],
    on_error:            ['tool.error', 'job.failed', 'runtime.error'],
    on_event:            [...EVENT_CHANNELS],
  }
  return CHANNEL_HOOK_MAP[hookType]?.includes(channel) ?? false
}

// ── Resource Usage Analysis ───────────────────────────────────────────────────

export interface ResourceAlert {
  type: 'budget_warning' | 'budget_exceeded' | 'rate_limit_warning' | 'token_quota_warning'
  message: string
  severity: 'warning' | 'critical'
  value: number
  threshold: number
}

export function analyzeResourceUsage(
  totalCost: number,
  maxCostPerDay: number | null,
  tokensUsed: number,
  maxTokensPerHour: number | null,
  toolCalls: number,
  agentTasks: number,
): { alerts: ResourceAlert[]; budgetUsedPct: number | null } {
  const alerts: ResourceAlert[] = []

  let budgetUsedPct: number | null = null
  if (maxCostPerDay !== null && maxCostPerDay > 0) {
    budgetUsedPct = (totalCost / maxCostPerDay) * 100
    if (budgetUsedPct >= 100) {
      alerts.push({ type: 'budget_exceeded', message: `Daily budget exceeded: $${totalCost.toFixed(3)} / $${maxCostPerDay}`, severity: 'critical', value: totalCost, threshold: maxCostPerDay })
    } else if (budgetUsedPct >= 80) {
      alerts.push({ type: 'budget_warning', message: `Daily budget at ${budgetUsedPct.toFixed(0)}% — approaching limit`, severity: 'warning', value: totalCost, threshold: maxCostPerDay })
    }
  }

  if (maxTokensPerHour !== null && maxTokensPerHour > 0 && tokensUsed > 0) {
    const tokenPct = (tokensUsed / maxTokensPerHour) * 100
    if (tokenPct >= 90) {
      alerts.push({ type: tokenPct >= 100 ? 'budget_exceeded' : 'token_quota_warning', message: `Token quota at ${tokenPct.toFixed(0)}% (${tokensUsed}/${maxTokensPerHour})`, severity: tokenPct >= 100 ? 'critical' : 'warning', value: tokensUsed, threshold: maxTokensPerHour })
    }
  }

  return { alerts, budgetUsedPct }
}

// ── Job Execution Simulation ──────────────────────────────────────────────────

export interface JobExecutionResult {
  status: 'completed' | 'failed'
  output: Record<string, unknown>
  durationMs: number
  error?: string
}

export function simulateJobExecution(handler: string, params: Record<string, unknown>): JobExecutionResult {
  const durationMs = 200 + Math.floor(Math.random() * 800)
  const outputMap: Record<string, Record<string, unknown>> = {
    'learning:runOptimization':      { success: true, insightsGenerated: Math.floor(Math.random() * 5), handler },
    'aos:captureResourceUsage':      { success: true, period: params.period ?? 'hourly', recorded: true },
    'learning:evolutionSnapshot':    { success: true, score: 70 + Math.floor(Math.random() * 25), trend: 'stable' },
    'learning:agentInsightsAnalyze': { success: true, insightsCreated: Math.floor(Math.random() * 3) },
    'learning:toolInsightsAnalyze':  { success: true, insightsCreated: Math.floor(Math.random() * 3) },
    'learning:kgFeedbackDigest':     { success: true, itemsInDigest: Math.floor(Math.random() * 10) },
    'learning:policyInsightsAnalyze':{ success: true, insightsCreated: Math.floor(Math.random() * 2) },
  }
  const output = outputMap[handler] ?? { success: true, handler, params }
  return { status: 'completed', output, durationMs }
}

// ── Hook Firing ───────────────────────────────────────────────────────────────

export interface HookFiringResult {
  hookId: string
  hookName: string
  fired: boolean
  reason: string
  durationMs: number
}

export function evaluateHookConditions(
  conditions: Record<string, unknown>,
  eventPayload: Record<string, unknown>,
): boolean {
  if (Object.keys(conditions).length === 0) return true

  // Simple condition matching: check if all condition keys match payload values
  for (const [key, expected] of Object.entries(conditions)) {
    const actual = eventPayload[key]
    if (actual !== expected) return false
  }
  return true
}

// ── Runtime Dashboard Summary ─────────────────────────────────────────────────

export function generateRuntimeSummary(
  status: string,
  totalEvents: number,
  totalJobs: number,
  activeJobCount: number,
  hookCount: number,
  uptimeSeconds: number,
): string {
  const uptimeStr = uptimeSeconds < 3600
    ? `${Math.floor(uptimeSeconds / 60)}m`
    : `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m`

  if (status !== 'running') return `Runtime is ${status}. ${totalEvents} events processed, ${totalJobs} jobs tracked.`
  return `Runtime running (uptime ${uptimeStr}) · ${totalEvents} events processed · ${activeJobCount}/${totalJobs} jobs active · ${hookCount} hooks`
}

// ── Event Channel Stats ───────────────────────────────────────────────────────

export function buildChannelStats(events: { channel: string }[]): { channel: string; count: number }[] {
  const map = new Map<string, number>()
  for (const e of events) map.set(e.channel, (map.get(e.channel) ?? 0) + 1)
  return [...map.entries()].map(([channel, count]) => ({ channel, count })).sort((a, b) => b.count - a.count)
}
