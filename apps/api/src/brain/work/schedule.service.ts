import { prisma } from '@reno/database'
import { createTask, logWorkAudit } from './task.service.js'
import { spawnTaskExecution } from './executor.service.js'

export interface CreateScheduleInput {
  tenantId: string
  userId: string
  title: string
  request: string
  provider?: string
  agentSlug?: string
  intervalType: 'daily' | 'weekly' | 'monthly'
  intervalValue?: number
  dayOfWeek?: number
  hourOfDay?: number
}

export async function createSchedule(input: CreateScheduleInput) {
  const nextRunAt = computeNextRun(input.intervalType, input.dayOfWeek ?? 1, input.hourOfDay ?? 9)
  const schedule = await prisma.aiWorkSchedule.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      title: input.title,
      request: input.request,
      provider: input.provider ?? 'mock',
      agentSlug: input.agentSlug,
      intervalType: input.intervalType,
      intervalValue: input.intervalValue ?? 1,
      dayOfWeek: input.dayOfWeek,
      hourOfDay: input.hourOfDay ?? 9,
      nextRunAt,
    },
  })
  await logWorkAudit({
    tenantId: input.tenantId,
    userId: input.userId,
    action: 'schedule_created',
    details: { title: input.title, intervalType: input.intervalType, nextRunAt },
  })
  return schedule
}

export async function listSchedules(tenantId: string) {
  return prisma.aiWorkSchedule.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function updateSchedule(tenantId: string, scheduleId: string, data: {
  title?: string
  request?: string
  isEnabled?: boolean
  intervalType?: string
  dayOfWeek?: number
  hourOfDay?: number
}) {
  const existing = await prisma.aiWorkSchedule.findFirst({ where: { id: scheduleId, tenantId } })
  if (!existing) return null

  const nextRunAt = data.intervalType
    ? computeNextRun(
        data.intervalType as any,
        data.dayOfWeek ?? existing.dayOfWeek ?? 1,
        data.hourOfDay ?? existing.hourOfDay ?? 9,
      )
    : undefined

  return prisma.aiWorkSchedule.update({
    where: { id: scheduleId },
    data: { ...data, ...(nextRunAt ? { nextRunAt } : {}) },
  })
}

export async function deleteSchedule(tenantId: string, scheduleId: string) {
  const existing = await prisma.aiWorkSchedule.findFirst({ where: { id: scheduleId, tenantId } })
  if (!existing) return null
  return prisma.aiWorkSchedule.delete({ where: { id: scheduleId } })
}

// Called by a background job runner (cron or webhook) to trigger due schedules
export async function processDueSchedules(): Promise<void> {
  const now = new Date()
  const due = await prisma.aiWorkSchedule.findMany({
    where: { isEnabled: true, nextRunAt: { lte: now } },
  })

  for (const schedule of due) {
    try {
      const task = await createTask({
        tenantId: schedule.tenantId,
        userId: schedule.userId,
        title: `[Scheduled] ${schedule.title}`,
        request: schedule.request,
        provider: schedule.provider,
        agentSlug: schedule.agentSlug ?? undefined,
        scheduleId: schedule.id,
      })

      const nextRunAt = computeNextRun(
        schedule.intervalType as any ?? 'weekly',
        schedule.dayOfWeek ?? 1,
        schedule.hourOfDay ?? 9,
      )

      await prisma.aiWorkSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: now,
          nextRunAt,
          runCount: { increment: 1 },
          lastTaskId: task.id,
        },
      })

      spawnTaskExecution({
        taskId: task.id,
        tenantId: schedule.tenantId,
        userId: schedule.userId,
        request: schedule.request,
        provider: schedule.provider,
        agentSlug: schedule.agentSlug ?? undefined,
      })
    } catch (err: any) {
      console.error(`[AI Work] Schedule ${schedule.id} failed to trigger:`, err.message)
    }
  }
}

function computeNextRun(
  intervalType: 'daily' | 'weekly' | 'monthly',
  dayOfWeek: number,
  hourOfDay: number,
): Date {
  const now = new Date()
  const next = new Date(now)
  next.setMinutes(0, 0, 0)
  next.setHours(hourOfDay)

  if (intervalType === 'daily') {
    if (next <= now) next.setDate(next.getDate() + 1)
    return next
  }

  if (intervalType === 'weekly') {
    const currentDay = next.getDay()
    let daysUntil = (dayOfWeek - currentDay + 7) % 7
    if (daysUntil === 0 && next <= now) daysUntil = 7
    next.setDate(next.getDate() + daysUntil)
    return next
  }

  // monthly: first occurrence of dayOfWeek in the next month
  next.setDate(1)
  next.setMonth(next.getMonth() + 1)
  while (next.getDay() !== dayOfWeek) next.setDate(next.getDate() + 1)
  return next
}
