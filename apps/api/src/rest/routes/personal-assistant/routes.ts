import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import { generateBriefing, generateWeeklyReview, generateCoachingInsights } from './briefing-engine.js'

export async function personalAssistantRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Profile ────────────────────────────────────────────────────────────────

  app.get('/profile', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const profile = await prisma.apaProfile.findFirst({ where: { tenantId, userId } })
    if (!profile) {
      // Return sensible defaults for new users
      return {
        success: true,
        data: {
          tenantId, userId, displayName: null,
          timezone: 'UTC', workStartHour: 9, workEndHour: 18,
          reportingStyle: 'brief', focusAreas: [], preferredModules: [],
          coachingEnabled: true, teamCoachEnabled: false, weeklyReviewDay: 5,
          isNew: true,
        },
      }
    }
    return { success: true, data: profile }
  })

  app.put('/profile', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as {
      displayName?: string; timezone?: string; workStartHour?: number; workEndHour?: number
      reportingStyle?: string; focusAreas?: string[]; preferredModules?: string[]
      coachingEnabled?: boolean; teamCoachEnabled?: boolean; weeklyReviewDay?: number
    }
    const profile = await prisma.apaProfile.upsert({
      where: { tenantId_userId: { tenantId, userId } },
      create: { tenantId, userId, ...body },
      update: { ...body, updatedAt: new Date() },
    })
    await prisma.sysAuditLog.create({
      data: {
        tenantId, userId, action: 'APA_PROFILE_UPDATED', module: 'personal-assistant',
        entityType: 'ApaProfile', entityId: profile.id, newValues: body as never,
      },
    }).catch(() => null)
    return { success: true, data: profile }
  })

  // ── Daily Briefing ─────────────────────────────────────────────────────────

  app.get('/briefing/today', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const today = new Date().toISOString().slice(0, 10)

    // Return cached briefing if already generated today
    const existing = await prisma.apaDailyBriefing.findFirst({ where: { tenantId, userId, date: today } })
    if (existing) {
      if (!existing.viewed) {
        await prisma.apaDailyBriefing.update({ where: { id: existing.id }, data: { viewed: true } })
      }
      return { success: true, data: existing, cached: true }
    }

    // Generate new briefing
    const profile = await prisma.apaProfile.findFirst({ where: { tenantId, userId } })
    const profileData = {
      displayName: profile?.displayName ?? null,
      reportingStyle: profile?.reportingStyle ?? 'brief',
      workStartHour: profile?.workStartHour ?? 9,
      workEndHour: profile?.workEndHour ?? 18,
      focusAreas: profile?.focusAreas ?? [],
    }

    const { summary, aiPlan, focusItem, greeting, date } = await generateBriefing(tenantId, userId, profileData)

    const briefing = await prisma.apaDailyBriefing.create({
      data: {
        tenantId, userId, date, greeting,
        focusItem: focusItem ?? null,
        summary: summary as never,
        aiPlan: aiPlan as never,
        viewed: true,
      },
    })

    await prisma.sysAuditLog.create({
      data: {
        tenantId, userId, action: 'APA_BRIEFING_GENERATED', module: 'personal-assistant',
        entityType: 'ApaDailyBriefing', entityId: briefing.id,
        newValues: { date, alerts: summary.alerts.length } as never,
      },
    }).catch(() => null)

    return { success: true, data: briefing, cached: false }
  })

  // Force regenerate today's briefing
  app.post('/briefing/generate', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const today = new Date().toISOString().slice(0, 10)

    // Delete existing to force re-gen
    await prisma.apaDailyBriefing.deleteMany({ where: { tenantId, userId, date: today } })

    const profile = await prisma.apaProfile.findFirst({ where: { tenantId, userId } })
    const profileData = {
      displayName: profile?.displayName ?? null,
      reportingStyle: profile?.reportingStyle ?? 'brief',
      workStartHour: profile?.workStartHour ?? 9,
      workEndHour: profile?.workEndHour ?? 18,
      focusAreas: profile?.focusAreas ?? [],
    }

    const { summary, aiPlan, focusItem, greeting, date } = await generateBriefing(tenantId, userId, profileData)

    const briefing = await prisma.apaDailyBriefing.create({
      data: {
        tenantId, userId, date, greeting,
        focusItem: focusItem ?? null,
        summary: summary as never,
        aiPlan: aiPlan as never,
        viewed: true,
      },
    })
    return { success: true, data: briefing }
  })

  // Past briefings
  app.get('/briefings', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const briefings = await prisma.apaDailyBriefing.findMany({
      where: { tenantId, userId },
      orderBy: { date: 'desc' },
      take: 30,
    })
    return { success: true, data: briefings }
  })

  // ── Memory ─────────────────────────────────────────────────────────────────

  app.get('/memory', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const q = req.query as Record<string, string>
    const memories = await prisma.apaMemory.findMany({
      where: {
        tenantId, userId,
        ...(q.category ? { category: q.category } : {}),
      },
      orderBy: [{ category: 'asc' }, { learnedAt: 'desc' }],
    })
    return { success: true, data: memories }
  })

  app.post('/memory', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { category: string; key: string; value: unknown; confidence?: number }
    const memory = await prisma.apaMemory.upsert({
      where: { tenantId_userId_category_key: { tenantId, userId, category: body.category, key: body.key } },
      create: {
        tenantId, userId,
        category: body.category, key: body.key,
        value: body.value as never,
        confidence: body.confidence ?? 1.0,
      },
      update: { value: body.value as never, confidence: body.confidence ?? 1.0, updatedAt: new Date() },
    })
    return { success: true, data: memory }
  })

  app.delete('/memory/:id', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const mem = await prisma.apaMemory.findFirst({ where: { id, tenantId } })
    if (!mem) return reply.code(404).send({ success: false, error: 'Memory not found' })
    await prisma.apaMemory.delete({ where: { id } })
    return { success: true, data: { deleted: true } }
  })

  // ── Habits ─────────────────────────────────────────────────────────────────

  app.get('/habits', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const habits = await prisma.apaHabit.findMany({
      where: { tenantId, userId },
      orderBy: { triggerCount: 'desc' },
    })
    return { success: true, data: habits }
  })

  app.post('/habits', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as {
      name: string; description?: string
      trigger: string; triggerValue?: string; module?: string; action: string
    }
    const habit = await prisma.apaHabit.create({
      data: { tenantId, userId, ...body },
    })
    return { success: true, data: habit }
  })

  app.put('/habits/:id', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const body = req.body as Record<string, unknown>
    const habit = await prisma.apaHabit.findFirst({ where: { id, tenantId } })
    if (!habit) return reply.code(404).send({ success: false, error: 'Habit not found' })
    const updated = await prisma.apaHabit.update({ where: { id }, data: body })
    return { success: true, data: updated }
  })

  app.delete('/habits/:id', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const habit = await prisma.apaHabit.findFirst({ where: { id, tenantId } })
    if (!habit) return reply.code(404).send({ success: false, error: 'Habit not found' })
    await prisma.apaHabit.delete({ where: { id } })
    return { success: true, data: { deleted: true } }
  })

  // Trigger a habit (increment counter + return suggested action)
  app.post('/habits/:id/trigger', async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const habit = await prisma.apaHabit.findFirst({ where: { id, tenantId } })
    if (!habit) return reply.code(404).send({ success: false, error: 'Habit not found' })
    const updated = await prisma.apaHabit.update({ where: { id }, data: { triggerCount: { increment: 1 } } })
    return { success: true, data: { habit: updated, suggestion: habit.action } }
  })

  // ── Focus ──────────────────────────────────────────────────────────────────

  app.post('/focus', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { focus: string; module?: string }
    // Store as a memory entry
    const memory = await prisma.apaMemory.upsert({
      where: { tenantId_userId_category_key: { tenantId, userId, category: 'daily', key: 'focus_today' } },
      create: { tenantId, userId, category: 'daily', key: 'focus_today', value: { focus: body.focus, module: body.module, date: new Date().toISOString().slice(0, 10) } as never },
      update: { value: { focus: body.focus, module: body.module, date: new Date().toISOString().slice(0, 10) } as never, updatedAt: new Date() },
    })
    return { success: true, data: memory }
  })

  // ── Weekly Review ──────────────────────────────────────────────────────────

  app.post('/weekly-review/generate', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const review = await generateWeeklyReview(tenantId, userId)

    const saved = await prisma.apaWeeklyReview.upsert({
      where: { tenantId_userId_weekStart: { tenantId, userId, weekStart: review.weekStart } },
      create: { tenantId, userId, ...review },
      update: { ...review },
    })

    await prisma.sysAuditLog.create({
      data: {
        tenantId, userId, action: 'APA_WEEKLY_REVIEW_GENERATED', module: 'personal-assistant',
        entityType: 'ApaWeeklyReview', entityId: saved.id,
        newValues: { weekStart: review.weekStart, score: review.productivityScore } as never,
      },
    }).catch(() => null)

    return { success: true, data: saved }
  })

  app.get('/weekly-reviews', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const reviews = await prisma.apaWeeklyReview.findMany({
      where: { tenantId, userId },
      orderBy: { weekStart: 'desc' },
      take: 12,
    })
    return { success: true, data: reviews }
  })

  // ── Coaching ───────────────────────────────────────────────────────────────

  app.get('/coach', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const profile = await prisma.apaProfile.findFirst({ where: { tenantId, userId } })
    const profileData = {
      workStartHour: profile?.workStartHour ?? 9,
      workEndHour: profile?.workEndHour ?? 18,
      coachingEnabled: profile?.coachingEnabled ?? true,
      teamCoachEnabled: profile?.teamCoachEnabled ?? false,
    }
    const insights = await generateCoachingInsights(tenantId, userId, profileData)
    return { success: true, data: insights }
  })

  // ── Personal Timeline ──────────────────────────────────────────────────────

  app.get('/timeline', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const q = req.query as Record<string, string>
    const since = q.since ? new Date(q.since) : new Date(Date.now() - 7 * 86400000)

    const [auditLogs, completedSteps, briefings] = await Promise.all([
      prisma.sysAuditLog.findMany({
        where: { tenantId, userId, occurredAt: { gte: since } },
        select: { id: true, action: true, module: true, entityType: true, occurredAt: true },
        orderBy: { occurredAt: 'desc' },
        take: 30,
      }).catch(() => []),
      prisma.awsJobStep.findMany({
        where: { tenantId, status: 'completed', executedAt: { gte: since } },
        select: { id: true, title: true, tool: true, executedAt: true },
        orderBy: { executedAt: 'desc' },
        take: 20,
      }).catch(() => []),
      prisma.apaDailyBriefing.findMany({
        where: { tenantId, userId, createdAt: { gte: since } },
        select: { id: true, date: true, focusItem: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 7,
      }).catch(() => []),
    ])

    const events = [
      ...auditLogs.map(e => ({ type: 'action', ts: e.occurredAt, label: `${e.action} on ${e.entityType}`, module: e.module })),
      ...completedSteps.map(s => ({ type: 'step', ts: s.executedAt, label: s.title, tool: s.tool })),
      ...briefings.map(b => ({ type: 'briefing', ts: b.createdAt, label: `Daily briefing — ${b.date}`, focusItem: b.focusItem })),
    ].sort((a, b) => new Date(b.ts ?? 0).getTime() - new Date(a.ts ?? 0).getTime()).slice(0, 60)

    return { success: true, data: events }
  })

  // ── Recommendations ────────────────────────────────────────────────────────

  app.get('/recommendations', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const today = new Date().toISOString().slice(0, 10)

    // Return from today's briefing if available
    const briefing = await prisma.apaDailyBriefing.findFirst({ where: { tenantId, userId, date: today } })
    if (briefing) {
      const summary = briefing.summary as Record<string, unknown>
      return { success: true, data: summary.recommendations ?? [] }
    }
    return { success: true, data: [] }
  })

  // ── Learn (record user interaction patterns) ───────────────────────────────

  app.post('/learn', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { event: string; module: string; metadata?: Record<string, unknown> }

    // Upsert a usage frequency memory
    const key = `usage_${body.module}`
    const existing = await prisma.apaMemory.findFirst({ where: { tenantId, userId, category: 'habit', key } })
    const count = existing ? ((existing.value as Record<string, unknown>).count as number ?? 0) + 1 : 1

    await prisma.apaMemory.upsert({
      where: { tenantId_userId_category_key: { tenantId, userId, category: 'habit', key } },
      create: { tenantId, userId, category: 'habit', key, value: { count, module: body.module, lastEvent: body.event } as never },
      update: { value: { count, module: body.module, lastEvent: body.event, lastSeen: new Date().toISOString() } as never, updatedAt: new Date() },
    })

    return { success: true, data: { learned: true, module: body.module, usageCount: count } }
  })

  // ── Summary ────────────────────────────────────────────────────────────────

  app.get('/summary', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const today = new Date().toISOString().slice(0, 10)

    const [briefingExists, memoryCount, habitCount, weeklyCount] = await Promise.all([
      prisma.apaDailyBriefing.count({ where: { tenantId, userId, date: today } }),
      prisma.apaMemory.count({ where: { tenantId, userId } }),
      prisma.apaHabit.count({ where: { tenantId, userId, active: true } }),
      prisma.apaWeeklyReview.count({ where: { tenantId, userId } }),
    ])

    return {
      success: true,
      data: {
        todayBriefing: briefingExists > 0,
        memories: memoryCount,
        activeHabits: habitCount,
        weeklyReviews: weeklyCount,
      },
    }
  })
}
