import { prisma } from '@reno/database'

export type FeedbackOutcome = 'accepted' | 'rejected' | 'ignored' | 'implemented' | 'failed' | 'succeeded'
export type FeedbackSourceType = 'recommendation' | 'prediction' | 'briefing' | 'report' | 'lesson'

export interface SubmitFeedbackInput {
  sourceType: FeedbackSourceType
  sourceId: string
  rating: number
  outcome: FeedbackOutcome
  feedbackText?: string
  rejectionReason?: string
  implementedResult?: string
  confidenceAtTime: number
  actualAccurate?: boolean
  submittedBy: string
}

export const learningService = {
  async submitFeedback(tenantId: string, input: SubmitFeedbackInput) {
    // Save feedback
    const feedback = await prisma.aiFeedbackLoop.create({
      data: {
        tenantId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        rating: Math.max(1, Math.min(5, input.rating)),
        outcome: input.outcome,
        feedbackText: input.feedbackText,
        rejectionReason: input.rejectionReason,
        implementedResult: input.implementedResult,
        confidenceAtTime: input.confidenceAtTime,
        actualAccurate: input.actualAccurate,
        learnedPatterns: [] as never,
        submittedBy: input.submittedBy,
      },
    })

    // Update recommendation status if applicable
    if (input.sourceType === 'recommendation') {
      await this.updateRecommendationFromFeedback(tenantId, input)
    }

    // Update accuracy metrics
    await this.updateAccuracyMetrics(tenantId, input)

    // Auto-extract lesson if implemented or failed with text
    if ((input.outcome === 'implemented' || input.outcome === 'failed') && input.feedbackText) {
      await this.extractLesson(tenantId, input)
    }

    return feedback
  },

  async updateRecommendationFromFeedback(tenantId: string, input: SubmitFeedbackInput) {
    const statusMap: Record<FeedbackOutcome, string> = {
      accepted: 'approved',
      rejected: 'rejected',
      ignored: 'ignored',
      implemented: 'implemented',
      failed: 'failed',
      succeeded: 'completed',
    }
    const newStatus = statusMap[input.outcome]

    await prisma.aiExecRecommendation.updateMany({
      where: { id: input.sourceId, tenantId },
      data: {
        status: newStatus,
        ...(input.outcome === 'rejected' ? { rejectionReason: input.rejectionReason } : {}),
        ...(input.outcome === 'implemented' ? { implementedAt: new Date(), outcome: input.implementedResult } : {}),
      },
    })
  },

  async updateAccuracyMetrics(tenantId: string, input: SubmitFeedbackInput) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const periods: Array<{ period: string; date: Date }> = [
      { period: 'daily', date: today },
      {
        period: 'weekly',
        date: (() => {
          const d = new Date(today)
          d.setDate(d.getDate() - d.getDay())
          return d
        })(),
      },
      {
        period: 'monthly',
        date: new Date(today.getFullYear(), today.getMonth(), 1),
      },
    ]

    for (const { period, date } of periods) {
      const existing = await prisma.aiAccuracyMetric.findFirst({
        where: { tenantId, period, periodDate: date, category: null },
      })

      const isPositive = ['accepted', 'implemented', 'succeeded'].includes(input.outcome)

      if (existing) {
        await prisma.aiAccuracyMetric.update({
          where: { id: existing.id },
          data: {
            totalRecs: { increment: 1 },
            acceptedRecs: isPositive ? { increment: 1 } : undefined,
            rejectedRecs: input.outcome === 'rejected' ? { increment: 1 } : undefined,
            ignoredRecs: input.outcome === 'ignored' ? { increment: 1 } : undefined,
            implementedRecs: input.outcome === 'implemented' ? { increment: 1 } : undefined,
            accuracyRate: existing.totalRecs > 0
              ? (existing.acceptedRecs + (isPositive ? 1 : 0)) / (existing.totalRecs + 1)
              : isPositive ? 1 : 0,
          },
        })
      } else {
        await prisma.aiAccuracyMetric.create({
          data: {
            tenantId,
            period,
            periodDate: date,
            category: null,
            totalRecs: 1,
            acceptedRecs: isPositive ? 1 : 0,
            rejectedRecs: input.outcome === 'rejected' ? 1 : 0,
            ignoredRecs: input.outcome === 'ignored' ? 1 : 0,
            implementedRecs: input.outcome === 'implemented' ? 1 : 0,
            avgConfidence: input.confidenceAtTime,
            accuracyRate: isPositive ? 1 : 0,
          },
        })
      }
    }
  },

  async extractLesson(tenantId: string, input: SubmitFeedbackInput) {
    if (!input.feedbackText) return

    await prisma.aiLessonLearned.create({
      data: {
        tenantId,
        category: input.sourceType,
        title: `${input.outcome === 'failed' ? 'Failure' : 'Success'} lesson from ${input.sourceType}`,
        context: `Source: ${input.sourceType} (${input.sourceId})`,
        outcome: input.outcome,
        lesson: input.feedbackText,
        tags: [input.sourceType, input.outcome],
        confidence: Math.min(0.9, input.confidenceAtTime + (input.outcome === 'succeeded' ? 0.1 : -0.1)),
        relatedDecisions: [{ sourceType: input.sourceType, sourceId: input.sourceId }] as never,
        createdBy: input.submittedBy,
      },
    })
  },

  async getAccuracyTrend(tenantId: string, period: string, limit = 30) {
    return prisma.aiAccuracyMetric.findMany({
      where: { tenantId, period, category: null },
      orderBy: { periodDate: 'desc' },
      take: limit,
    })
  },

  async getAccuracySummary(tenantId: string) {
    const [daily, weekly, monthly, totalFeedback] = await Promise.all([
      prisma.aiAccuracyMetric.findFirst({
        where: { tenantId, period: 'daily', category: null },
        orderBy: { periodDate: 'desc' },
      }),
      prisma.aiAccuracyMetric.findFirst({
        where: { tenantId, period: 'weekly', category: null },
        orderBy: { periodDate: 'desc' },
      }),
      prisma.aiAccuracyMetric.findFirst({
        where: { tenantId, period: 'monthly', category: null },
        orderBy: { periodDate: 'desc' },
      }),
      prisma.aiFeedbackLoop.count({ where: { tenantId } }),
    ])

    return { daily, weekly, monthly, totalFeedback }
  },
}
