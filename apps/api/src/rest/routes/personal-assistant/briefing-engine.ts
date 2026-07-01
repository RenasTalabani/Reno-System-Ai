/**
 * Briefing Engine — generates the daily AI briefing for each user.
 * Pulls cross-module signals (pending tasks, alerts, proposals, jobs)
 * and synthesises them into a personalised morning summary.
 */
import { prisma } from '@reno/database'

export interface BriefingSummary {
  pendingApprovals: number
  activeJobs: number
  openDiscoveries: number
  recentAuditActions: number
  openProposals: number
  alerts: Alert[]
  recommendations: Recommendation[]
  quickStats: QuickStat[]
}

export interface Alert {
  level: 'info' | 'warning' | 'critical'
  title: string
  detail: string
  module: string
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low'
  title: string
  reason: string
  action: string
  module: string
}

export interface QuickStat {
  label: string
  value: string | number
  trend?: 'up' | 'down' | 'stable'
}

export interface DailyPlanItem {
  time: string
  activity: string
  module?: string
  priority: 'high' | 'medium' | 'low'
}

const GREETINGS = [
  'Good morning', 'Welcome back', 'Ready to make today count',
  'Another great day ahead', 'Let\'s get started',
]

function hour(): number {
  return new Date().getHours()
}

function greeting(): string {
  const h = hour()
  const base = h < 12 ? GREETINGS[Math.floor(Math.random() * 3)] : h < 17 ? 'Good afternoon' : 'Good evening'
  return base
}

export async function generateBriefing(tenantId: string, userId: string, profile: {
  displayName?: string | null
  reportingStyle: string
  workStartHour: number
  workEndHour: number
  focusAreas: string[]
}) {
  const today = new Date().toISOString().slice(0, 10)
  const name = profile.displayName ?? 'there'

  // Parallel data collection from all modules
  const [
    pendingProposals,
    activeJobs,
    pendingSteps,
    openDiscoveries,
    recentAudit,
    openTasks,
    memories,
  ] = await Promise.all([
    prisma.awltProposal.count({ where: { tenantId, status: 'pending_approval' } }).catch(() => 0),
    prisma.awsJob.count({ where: { tenantId, userId, status: { in: ['running', 'ready'] } } }).catch(() => 0),
    prisma.awsJobStep.count({ where: { tenantId, status: 'pending_approval' } }).catch(() => 0),
    prisma.awsDiscovery.count({ where: { tenantId, status: 'open' } }).catch(() => 0),
    prisma.sysAuditLog.count({ where: { tenantId, userId, occurredAt: { gte: new Date(Date.now() - 86400000) } } }).catch(() => 0),
    prisma.aiwTask.count({ where: { tenantId, userId, status: { in: ['pending', 'in_progress'] } } }).catch(() => 0),
    prisma.apaMemory.findMany({ where: { tenantId, userId }, take: 20 }).catch(() => [] as unknown[]),
  ])

  const alerts: Alert[] = []
  const recommendations: Recommendation[] = []

  // Generate alerts
  if (pendingProposals > 0) {
    alerts.push({
      level: pendingProposals > 5 ? 'warning' : 'info',
      title: `${pendingProposals} Live Tool Proposal${pendingProposals > 1 ? 's' : ''} Waiting`,
      detail: 'AI tool proposals are pending your approval before they can execute.',
      module: 'live-tools',
    })
  }

  if (pendingSteps > 0) {
    alerts.push({
      level: 'warning',
      title: `${pendingSteps} Autonomous Job Step${pendingSteps > 1 ? 's' : ''} Need Approval`,
      detail: `${activeJobs} active job${activeJobs > 1 ? 's are' : ' is'} paused waiting for your step approval.`,
      module: 'ai-autonomous',
    })
  }

  if (openDiscoveries > 0) {
    const criticalLevel = openDiscoveries > 10 ? 'warning' : 'info'
    alerts.push({
      level: criticalLevel,
      title: `${openDiscoveries} Open Discovery Item${openDiscoveries > 1 ? 's' : ''}`,
      detail: 'Security issues, bugs, or TODOs discovered in your projects that need attention.',
      module: 'ai-autonomous',
    })
  }

  if (openTasks > 0) {
    alerts.push({
      level: openTasks > 10 ? 'warning' : 'info',
      title: `${openTasks} AI Task${openTasks > 1 ? 's' : ''} Pending`,
      detail: 'Tasks in your AI workspace are waiting for action.',
      module: 'ai-workspace',
    })
  }

  // Generate recommendations based on data
  if (pendingSteps > 0) {
    recommendations.push({
      priority: 'high',
      title: 'Continue autonomous jobs',
      reason: `${pendingSteps} step${pendingSteps > 1 ? 's' : ''} need your approval to move forward.`,
      action: 'Open AI Autonomous → Jobs and approve the next step.',
      module: 'ai-autonomous',
    })
  }

  if (openDiscoveries > 3) {
    recommendations.push({
      priority: 'medium',
      title: 'Review security discoveries',
      reason: `${openDiscoveries} open discoveries including potential security issues.`,
      action: 'Open AI Autonomous → Discoveries, review and resolve critical items first.',
      module: 'ai-autonomous',
    })
  }

  if (recentAudit < 5 && hour() > 10) {
    recommendations.push({
      priority: 'medium',
      title: 'Low activity today',
      reason: 'Only a few actions recorded this session. Consider planning your tasks.',
      action: 'Create a new autonomous job or use Live Tools to make progress.',
      module: 'ai-autonomous',
    })
  }

  // Apply reporting style filter
  const maxAlerts = profile.reportingStyle === 'brief' ? 3 : 10
  const maxRecommendations = profile.reportingStyle === 'brief' ? 2 : 5

  const summary: BriefingSummary = {
    pendingApprovals: pendingProposals + pendingSteps,
    activeJobs,
    openDiscoveries,
    recentAuditActions: recentAudit,
    openProposals: pendingProposals,
    alerts: alerts.slice(0, maxAlerts),
    recommendations: recommendations.slice(0, maxRecommendations),
    quickStats: [
      { label: 'Active Jobs', value: activeJobs },
      { label: 'Pending Approvals', value: pendingProposals + pendingSteps },
      { label: 'Open Discoveries', value: openDiscoveries },
      { label: 'AI Tasks', value: openTasks },
    ],
  }

  // Generate daily plan
  const aiPlan = buildDailyPlan(profile, summary)

  // Determine focus item
  const focusItem = determineFocus(summary, profile.focusAreas)

  const greet = `${greeting()}, ${name}! ${buildGreetingMessage(summary)}`

  return { summary, aiPlan, focusItem, greeting: greet, date: today, memories }
}

function buildGreetingMessage(s: BriefingSummary): string {
  const parts: string[] = []
  if (s.pendingApprovals > 0) parts.push(`You have ${s.pendingApprovals} item${s.pendingApprovals > 1 ? 's' : ''} waiting for approval.`)
  if (s.activeJobs > 0) parts.push(`${s.activeJobs} autonomous job${s.activeJobs > 1 ? 's are' : ' is'} in progress.`)
  if (s.alerts.some(a => a.level === 'critical')) parts.push('There are critical alerts that need your attention.')
  return parts.join(' ') || 'Everything looks good — have a productive day!'
}

function determineFocus(s: BriefingSummary, focusAreas: string[]): string {
  if (s.pendingApprovals > 3) return 'Clear your approval queue — multiple AI actions are waiting.'
  if (s.openDiscoveries > 5) return 'Review and resolve open security/bug discoveries in your projects.'
  if (s.activeJobs > 0) return 'Continue and complete your in-progress autonomous jobs.'
  if (focusAreas.length > 0) return `Focus area: ${focusAreas[0]}`
  return 'Plan and prioritise your most impactful work for today.'
}

function buildDailyPlan(profile: { workStartHour: number; workEndHour: number }, summary: BriefingSummary): DailyPlanItem[] {
  const plan: DailyPlanItem[] = []
  const start = profile.workStartHour

  plan.push({
    time: `${start.toString().padStart(2, '0')}:00`,
    activity: 'Review daily briefing and set priorities',
    module: 'personal-assistant',
    priority: 'high',
  })

  if (summary.pendingApprovals > 0) {
    plan.push({
      time: `${(start + 1).toString().padStart(2, '0')}:00`,
      activity: `Review and approve ${summary.pendingApprovals} pending AI action${summary.pendingApprovals > 1 ? 's' : ''}`,
      module: 'ai-autonomous',
      priority: 'high',
    })
  }

  if (summary.openDiscoveries > 0) {
    plan.push({
      time: `${(start + 2).toString().padStart(2, '0')}:00`,
      activity: `Address ${summary.openDiscoveries} open discovery item${summary.openDiscoveries > 1 ? 's' : ''}`,
      module: 'ai-autonomous',
      priority: 'medium',
    })
  }

  plan.push({
    time: `${(start + 3).toString().padStart(2, '0')}:00`,
    activity: 'Deep work session — focus on your primary objective',
    priority: 'high',
  })

  plan.push({
    time: `${(start + 5).toString().padStart(2, '0')}:00`,
    activity: 'Review AI tool proposals and live tool results',
    module: 'live-tools',
    priority: 'medium',
  })

  const end = profile.workEndHour
  plan.push({
    time: `${(end - 1).toString().padStart(2, '0')}:00`,
    activity: 'End-of-day review — log progress, plan tomorrow',
    module: 'personal-assistant',
    priority: 'low',
  })

  return plan
}

// ── Weekly review generation ─────────────────────────────────────────────────

export async function generateWeeklyReview(tenantId: string, userId: string) {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sun, 1=Mon...
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const weekStart = monday.toISOString().slice(0, 10)
  const weekEnd = sunday.toISOString().slice(0, 10)

  const [jobsCompleted, stepsExecuted, discoveriesResolved, auditCount, proposals] = await Promise.all([
    prisma.awsJob.findMany({
      where: { tenantId, userId, status: 'completed', completedAt: { gte: monday, lte: sunday } },
      select: { title: true, totalSteps: true, completedAt: true },
    }).catch(() => []),
    prisma.awsJobStep.count({
      where: { tenantId, status: 'completed', executedAt: { gte: monday, lte: sunday } },
    }).catch(() => 0),
    prisma.awsDiscovery.count({
      where: { tenantId, userId, status: 'resolved', updatedAt: { gte: monday, lte: sunday } },
    }).catch(() => 0),
    prisma.sysAuditLog.count({
      where: { tenantId, userId, occurredAt: { gte: monday, lte: sunday } },
    }).catch(() => 0),
    prisma.awltProposal.count({
      where: { tenantId, userId, status: 'executed', executedAt: { gte: monday, lte: sunday } },
    }).catch(() => 0),
  ])

  const [pendingJobs, openDiscoveries] = await Promise.all([
    prisma.awsJob.count({ where: { tenantId, userId, status: { in: ['running', 'ready', 'paused'] } } }).catch(() => 0),
    prisma.awsDiscovery.count({ where: { tenantId, userId, status: 'open' } }).catch(() => 0),
  ])

  const accomplished = {
    jobsCompleted: jobsCompleted.length,
    jobTitles: jobsCompleted.map(j => j.title),
    stepsExecuted,
    discoveriesResolved,
    auditActions: auditCount,
    toolProposalsExecuted: proposals,
  }

  const delayed = {
    jobsPending: pendingJobs,
    openDiscoveries,
    summary: pendingJobs > 0 || openDiscoveries > 0
      ? `${pendingJobs} job${pendingJobs !== 1 ? 's' : ''} still in progress and ${openDiscoveries} open discovery${openDiscoveries !== 1 ? 'ies' : 'y'} carry over to next week.`
      : 'No carry-over items.',
  }

  const improvements = {
    suggestions: buildImprovements(accomplished, delayed),
  }

  const highlights: string[] = []
  if (jobsCompleted.length > 0) highlights.push(`Completed ${jobsCompleted.length} autonomous job${jobsCompleted.length > 1 ? 's' : ''}`)
  if (stepsExecuted > 5) highlights.push(`Executed ${stepsExecuted} AI-guided steps with human approval`)
  if (discoveriesResolved > 0) highlights.push(`Resolved ${discoveriesResolved} code/security discovery${discoveriesResolved > 1 ? 'ies' : 'y'}`)
  if (proposals > 0) highlights.push(`Ran ${proposals} approved Live Tool operation${proposals > 1 ? 's' : ''}`)

  const score = calculateScore(accomplished, delayed)
  const nextWeekFocus = buildNextWeekFocus(delayed)

  return {
    weekStart, weekEnd, accomplished, delayed, improvements,
    highlights, nextWeekFocus, productivityScore: score,
  }
}

function buildImprovements(acc: Record<string, unknown>, del: Record<string, unknown>): string[] {
  const suggestions: string[] = []
  const pendingJobs = del.jobsPending as number
  const openDisc = del.openDiscoveries as number
  const stepsExecuted = acc.stepsExecuted as number

  if (pendingJobs > 2) suggestions.push('Try to reduce parallel jobs — focus on completing one job before starting another.')
  if (openDisc > 5) suggestions.push('Schedule a dedicated session to clear discovery backlog — critical items should be resolved within 48h.')
  if (stepsExecuted < 5) suggestions.push('Consider creating more autonomous jobs to increase AI-assisted productivity.')
  if (suggestions.length === 0) suggestions.push('Strong week! Keep the same level of engagement with AI tools.')
  return suggestions
}

function calculateScore(acc: Record<string, unknown>, del: Record<string, unknown>): number {
  let score = 50
  const jobs = acc.jobsCompleted as number
  const steps = acc.stepsExecuted as number
  const resolutions = acc.discoveriesResolved as number
  const pending = del.jobsPending as number
  const open = del.openDiscoveries as number

  score += Math.min(jobs * 10, 25)
  score += Math.min(steps * 2, 15)
  score += Math.min(resolutions * 3, 15)
  score -= Math.min(pending * 3, 10)
  score -= Math.min(open * 1, 5)

  return Math.min(100, Math.max(0, score))
}

function buildNextWeekFocus(del: Record<string, unknown>): string {
  const jobs = del.jobsPending as number
  const disc = del.openDiscoveries as number
  if (jobs > 0 && disc > 0) return `Complete ${jobs} carry-over job${jobs > 1 ? 's' : ''} and resolve ${disc} open discovery${disc > 1 ? 'ies' : 'y'}.`
  if (jobs > 0) return `Complete ${jobs} in-progress autonomous job${jobs > 1 ? 's' : ''}.`
  if (disc > 0) return `Clear ${disc} open discovery item${disc > 1 ? 's' : ''}.`
  return 'Plan and execute new improvement initiatives with AI assistance.'
}

// ── Coaching insights ────────────────────────────────────────────────────────

export async function generateCoachingInsights(tenantId: string, userId: string, profile: {
  workStartHour: number
  workEndHour: number
  coachingEnabled: boolean
  teamCoachEnabled: boolean
}) {
  if (!profile.coachingEnabled) return { insights: [], teamInsights: [] }

  const insights: { type: string; message: string; suggestion: string }[] = []

  const [pendingCount, recentActivity, oldJobs] = await Promise.all([
    prisma.awsJobStep.count({ where: { tenantId, status: 'pending_approval' } }).catch(() => 0),
    prisma.sysAuditLog.count({ where: { tenantId, userId, occurredAt: { gte: new Date(Date.now() - 3600000) } } }).catch(() => 0),
    prisma.awsJob.findMany({
      where: { tenantId, userId, status: { in: ['paused', 'ready'] }, createdAt: { lt: new Date(Date.now() - 86400000 * 3) } },
      select: { title: true, createdAt: true },
      take: 3,
    }).catch(() => []),
  ])

  if (pendingCount > 5) {
    insights.push({
      type: 'backlog',
      message: `${pendingCount} steps are waiting for approval — your approval queue is growing.`,
      suggestion: 'Set aside 15 minutes to review and approve pending steps in AI Autonomous.',
    })
  }

  if (recentActivity === 0 && hour() > 11 && hour() < 17) {
    insights.push({
      type: 'engagement',
      message: 'No activity detected in the last hour during working hours.',
      suggestion: 'Consider reviewing pending approvals or starting a new autonomous job.',
    })
  }

  if (oldJobs.length > 0) {
    insights.push({
      type: 'stale_jobs',
      message: `${oldJobs.length} job${oldJobs.length > 1 ? 's have' : ' has'} been paused for 3+ days.`,
      suggestion: `Resume or cancel stale jobs: ${oldJobs.map(j => `"${j.title}"`).join(', ')}.`,
    })
  }

  const teamInsights: { type: string; message: string }[] = []

  return { insights, teamInsights }
}
