import { prisma } from '@reno/database'
import { businessMemoryService } from './business-memory.service.js'

type BusinessMood = 'excellent' | 'good' | 'stable' | 'cautious' | 'critical'

interface Insight {
  type: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  evidence: string[]
  module: string
}

interface UrgentItem {
  title: string
  description: string
  action: string
  module: string
}

interface KeyMetrics {
  openTickets?: number
  pendingBrainActions?: number
  activeProjects?: number
  pendingInvoices?: number
  openOpportunities?: number
  pendingRecs?: number
  [key: string]: number | undefined
}

export const briefingService = {
  async generateDailyBriefing(tenantId: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const existing = await prisma.aiDailyBriefing.findFirst({
      where: { tenantId, briefingDate: today },
    })
    if (existing) return existing

    const [
      openTickets,
      pendingBrainActions,
      activeProjects,
      pendingInvoices,
      openOpportunities,
      recentLessons,
      pendingRecs,
      businessMemories,
    ] = await Promise.all([
      prisma.sdTicket.count({ where: { tenantId, status: { in: ['open', 'in_progress'] }, deletedAt: null } }).catch(() => 0),
      prisma.brainAction.count({ where: { tenantId, status: 'pending' } }).catch(() => 0),
      prisma.pmProject.count({ where: { tenantId, status: 'in_progress', deletedAt: null } }).catch(() => 0),
      prisma.salesInvoice.count({ where: { tenantId, status: { in: ['draft', 'sent'] }, deletedAt: null } }).catch(() => 0),
      prisma.crmOpportunity.count({ where: { tenantId, isActive: true, deletedAt: null } }).catch(() => 0),
      prisma.aiLessonLearned.findMany({
        where: { tenantId, isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }).catch(() => []),
      prisma.aiExecRecommendation.findMany({
        where: { tenantId, status: 'pending', isActive: true },
        orderBy: { priority: 'asc' },
        take: 5,
      }).catch(() => []),
      businessMemoryService.getContext(tenantId),
    ])

    const keyMetrics: KeyMetrics = {
      openTickets,
      pendingBrainActions,
      activeProjects,
      pendingInvoices,
      openOpportunities,
      pendingRecs: pendingRecs.length,
    }

    const insights: Insight[] = []

    if (pendingBrainActions > 5) {
      insights.push({
        type: 'bottleneck',
        title: `${pendingBrainActions} AI actions pending approval`,
        description: 'AI action backlog detected — may be causing workflow delays.',
        priority: pendingBrainActions > 10 ? 'high' : 'medium',
        evidence: [`${pendingBrainActions} brain actions awaiting review`],
        module: 'brain',
      })
    }

    if (openTickets > 10) {
      insights.push({
        type: 'support',
        title: `${openTickets} open support tickets`,
        description: 'Support queue requires attention to maintain service levels.',
        priority: openTickets > 20 ? 'high' : 'medium',
        evidence: [`${openTickets} tickets in open/in_progress status`],
        module: 'helpdesk',
      })
    }

    if (openOpportunities > 0) {
      insights.push({
        type: 'sales',
        title: `${openOpportunities} active opportunities in CRM`,
        description: 'Active pipeline requires follow-up to maintain momentum.',
        priority: 'medium',
        evidence: [`${openOpportunities} opportunities marked active`],
        module: 'crm',
      })
    }

    if (recentLessons.length > 0) {
      insights.push({
        type: 'learning',
        title: 'AI learning from recent decisions',
        description: recentLessons[0]?.lesson ?? 'AI has extracted lessons from recent outcomes.',
        priority: 'low',
        evidence: recentLessons.map((l) => l.title),
        module: 'brain',
      })
    }

    const urgentItems: UrgentItem[] = []

    if (pendingBrainActions > 0) {
      urgentItems.push({
        title: 'Pending AI Actions',
        description: `${pendingBrainActions} AI-proposed actions await your decision`,
        action: 'Review and approve',
        module: 'brain',
      })
    }
    if (openTickets > 10) {
      urgentItems.push({
        title: 'Open Support Tickets',
        description: `${openTickets} tickets need attention`,
        action: 'Assign and prioritize',
        module: 'helpdesk',
      })
    }

    const todayPriorities = pendingRecs.map((r) => ({
      title: r.title,
      description: r.description,
      module: r.category,
      confidence: r.confidenceScore,
      impact: r.impactLevel,
    }))

    const mood = this.determineMood(keyMetrics, insights)
    const headline = this.buildHeadline(mood, keyMetrics, todayPriorities.length)

    const memoryContext = businessMemories.length > 0
      ? ` Based on business memory: ${businessMemories.slice(0, 2).map((m) => m.title).join(', ')}.`
      : ''

    const summary =
      `Business status: ${mood}. ${pendingBrainActions > 0 ? `${pendingBrainActions} AI actions pending. ` : ''}` +
      `${activeProjects} active projects. ${openOpportunities} CRM opportunities open.` +
      memoryContext

    return prisma.aiDailyBriefing.create({
      data: {
        tenantId,
        briefingDate: today,
        headline,
        summary,
        keyMetrics: keyMetrics as never,
        topInsights: insights as never,
        urgentItems: urgentItems as never,
        opportunities: [] as never,
        risks: [] as never,
        todayPriorities: todayPriorities as never,
        businessMood: mood,
      },
    })
  },

  determineMood(metrics: KeyMetrics, insights: Insight[]): BusinessMood {
    const highPriorityCount = insights.filter((i) => i.priority === 'high').length
    if (highPriorityCount >= 3) return 'critical'
    if (highPriorityCount >= 2) return 'cautious'
    if ((metrics.pendingBrainActions ?? 0) > 10) return 'cautious'
    if ((metrics.openOpportunities ?? 0) > 5) return 'good'
    return 'stable'
  },

  buildHeadline(mood: BusinessMood, metrics: KeyMetrics, priorityCount: number): string {
    const moodEmoji: Record<BusinessMood, string> = {
      excellent: '🚀',
      good: '📈',
      stable: '✅',
      cautious: '⚠️',
      critical: '🔴',
    }
    return `${moodEmoji[mood]} Business ${mood} — ${metrics.pendingBrainActions ?? 0} AI actions pending, ${metrics.openOpportunities ?? 0} opportunities open, ${priorityCount} AI priorities for today`
  },

  async getTodayBriefing(tenantId: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return prisma.aiDailyBriefing.findFirst({
      where: { tenantId, briefingDate: today },
    })
  },

  async markViewed(id: string, userId: string) {
    const briefing = await prisma.aiDailyBriefing.findUnique({ where: { id } })
    if (!briefing) return null
    const viewedBy = (briefing.viewedBy as string[]) ?? []
    if (!viewedBy.includes(userId)) {
      return prisma.aiDailyBriefing.update({
        where: { id },
        data: { viewedBy: [...viewedBy, userId] as never },
      })
    }
    return briefing
  },

  async listBriefings(tenantId: string, limit = 30) {
    return prisma.aiDailyBriefing.findMany({
      where: { tenantId },
      orderBy: { briefingDate: 'desc' },
      take: limit,
    })
  },
}
