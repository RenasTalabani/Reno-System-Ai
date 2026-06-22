import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

export async function pmDashboardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // GET /pm/dashboard — portfolio-level KPIs
  app.get('/', async (request, reply) => {
    const { tenantId, userId } = request as any
    const today = new Date()
    const in7d = new Date(today.getTime() + 7 * 86400000)

    const [
      totalProjects,
      activeProjects,
      completedProjects,
      onHoldProjects,
      totalTasks,
      overdueTasks,
      dueSoonTasks,
      myTasks,
      recentActivity,
      projectsByStatus,
      tasksByPriority,
    ] = await Promise.all([
      prisma.pmProject.count({ where: { tenantId, deletedAt: null } }),
      prisma.pmProject.count({ where: { tenantId, deletedAt: null, status: 'active' } }),
      prisma.pmProject.count({ where: { tenantId, deletedAt: null, status: 'completed' } }),
      prisma.pmProject.count({ where: { tenantId, deletedAt: null, status: 'on_hold' } }),
      prisma.pmTask.count({ where: { tenantId, deletedAt: null, parentId: null } }),
      prisma.pmTask.count({ where: { tenantId, deletedAt: null, parentId: null, dueDate: { lt: today }, status: { not: 'done' } } }),
      prisma.pmTask.count({ where: { tenantId, deletedAt: null, parentId: null, dueDate: { gte: today, lte: in7d }, status: { not: 'done' } } }),
      prisma.pmTask.findMany({
        where: { tenantId, deletedAt: null, assigneeId: userId, status: { notIn: ['done', 'cancelled'] } },
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        take: 5,
        include: { project: { select: { id: true, name: true, color: true } } },
      }),
      prisma.pmActivityLog.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { project: { select: { id: true, name: true } }, task: { select: { id: true, title: true } } },
      }),
      prisma.pmProject.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        _count: { status: true },
      }),
      prisma.pmTask.groupBy({
        by: ['priority'],
        where: { tenantId, deletedAt: null, parentId: null, status: { not: 'done' } },
        _count: { priority: true },
      }),
    ])

    // Time logged this month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const timeThisMonth = await prisma.pmTimeLog.aggregate({
      where: { tenantId, deletedAt: null, startTime: { gte: monthStart } },
      _sum: { durationMinutes: true },
    })

    // Active projects with progress
    const activeProjectDetails = await prisma.pmProject.findMany({
      where: { tenantId, deletedAt: null, status: 'active' },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { id: true, name: true, code: true, color: true, progress: true, targetDate: true, priority: true },
    })

    return reply.send(buildSuccessResponse({
      portfolio: {
        total: totalProjects,
        active: activeProjects,
        completed: completedProjects,
        onHold: onHoldProjects,
        byStatus: projectsByStatus.map(s => ({ status: s.status, count: s._count.status })),
      },
      tasks: {
        total: totalTasks,
        overdue: overdueTasks,
        dueSoon: dueSoonTasks,
        byPriority: tasksByPriority.map(p => ({ priority: p.priority, count: p._count.priority })),
      },
      myTasks,
      timeThisMonth: Number(((timeThisMonth._sum.durationMinutes ?? 0) / 60).toFixed(1)),
      activeProjects: activeProjectDetails,
      recentActivity,
    }))
  })

  // GET /pm/dashboard/project/:id — single project dashboard
  app.get('/project/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const today = new Date()

    const [project, taskStats, overdueCount, milestonesOpen, timeTotal] = await Promise.all([
      prisma.pmProject.findFirst({
        where: { id, tenantId, deletedAt: null },
        include: { members: { where: { deletedAt: null } }, _count: { select: { tasks: { where: { deletedAt: null } } } } },
      }),
      prisma.pmTask.groupBy({
        by: ['status'],
        where: { tenantId, projectId: id, deletedAt: null, parentId: null },
        _count: { status: true },
      }),
      prisma.pmTask.count({ where: { tenantId, projectId: id, deletedAt: null, parentId: null, dueDate: { lt: today }, status: { not: 'done' } } }),
      prisma.pmMilestone.count({ where: { tenantId, projectId: id, deletedAt: null, status: { not: 'completed' } } }),
      prisma.pmTimeLog.aggregate({
        where: { tenantId, projectId: id, deletedAt: null },
        _sum: { durationMinutes: true },
      }),
    ])

    const tasksByStatus = taskStats.reduce((acc: Record<string, number>, s) => {
      acc[s.status] = s._count.status; return acc
    }, {})

    return reply.send(buildSuccessResponse({
      project,
      tasksByStatus,
      overdueCount,
      milestonesOpen,
      totalHoursLogged: Number(((timeTotal._sum.durationMinutes ?? 0) / 60).toFixed(1)),
    }))
  })
}
