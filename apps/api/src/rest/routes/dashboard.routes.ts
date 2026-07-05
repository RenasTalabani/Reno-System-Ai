import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse } from '@reno/core'
import { requireAuth } from '../middleware/auth.js'

// Mobile-app home dashboard summary: open tickets, unread notifications,
// remaining leave balance, and a recent-activity feed — all scoped to the
// signed-in user so it works the same for any employee.
export async function dashboardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (request, reply) => {
    const { tenantId, userId } = request as any

    const [openTickets, unreadMessages, portalUser, recentNotifications] = await Promise.all([
      prisma.sdTicket.count({
        where: { tenantId, requesterId: userId, status: { in: ['open', 'in_progress'] }, deletedAt: null },
      }),
      prisma.sysNotification.count({
        where: { tenantId, userId, readAt: null, deletedAt: null },
      }),
      prisma.portalUser.findFirst({
        where: { tenantId, userId, portalType: 'employee', entityType: 'hr_employee', isActive: true },
      }),
      prisma.sysNotification.findMany({
        where: { tenantId, userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

    let leaveDaysLeft = 0
    if (portalUser?.entityId) {
      const balances = await prisma.hrLeaveBalance.findMany({
        where: { tenantId, employeeId: portalUser.entityId, year: new Date().getFullYear() },
      })
      leaveDaysLeft = balances.reduce(
        (sum, b) => sum + (Number(b.totalDays) - Number(b.usedDays) - Number(b.pendingDays)),
        0,
      )
    }

    return reply.send(
      buildSuccessResponse({
        openTickets,
        unreadMessages,
        leaveDaysLeft,
        recentActivity: recentNotifications.map((n) => ({
          description: n.title,
          createdAt: n.createdAt,
        })),
      }),
    )
  })
}
