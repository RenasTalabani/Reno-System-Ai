import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

export async function hrDashboardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // GET /hr/dashboard — HR KPI summary
  app.get('/', async (request, reply) => {
    const { tenantId } = request as any
    const today = new Date()
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    const [
      totalEmployees,
      activeEmployees,
      onLeaveToday,
      newThisMonth,
      terminatedThisMonth,
      pendingLeaveRequests,
      pendingDocumentVerifications,
      expiringDocuments,
      attendanceToday,
      upcomingHolidays,
      payrollThisMonth,
    ] = await Promise.all([
      // Counts
      prisma.hrEmployee.count({ where: { tenantId, deletedAt: null } }),
      prisma.hrEmployee.count({ where: { tenantId, deletedAt: null, status: 'active' } }),
      prisma.hrLeaveRequest.count({
        where: { tenantId, deletedAt: null, status: 'approved', startDate: { lte: today }, endDate: { gte: today } },
      }),
      prisma.hrEmployee.count({ where: { tenantId, deletedAt: null, hireDate: { gte: monthStart, lte: monthEnd } } }),
      prisma.hrEmployee.count({ where: { tenantId, deletedAt: null, terminationDate: { gte: monthStart, lte: monthEnd } } }),
      prisma.hrLeaveRequest.count({ where: { tenantId, deletedAt: null, status: 'pending' } }),
      prisma.hrEmployeeDocument.count({ where: { tenantId, deletedAt: null, isVerified: false } }),

      // Expiring docs in 30 days
      prisma.hrEmployeeDocument.count({
        where: { tenantId, deletedAt: null, expiryDate: { lte: new Date(today.getTime() + 30 * 86400000), gte: today } },
      }),

      // Today's attendance summary
      prisma.hrAttendance.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null, date: today },
        _count: { status: true },
      }),

      // Upcoming holidays
      prisma.hrHoliday.findMany({
        where: { tenantId, deletedAt: null, date: { gte: today, lte: new Date(today.getTime() + 14 * 86400000) } },
        orderBy: { date: 'asc' },
        take: 5,
      }),

      // Payroll summary this month
      prisma.hrPayslip.aggregate({
        where: { tenantId, deletedAt: null, month: today.getMonth() + 1, year: today.getFullYear() },
        _sum: { netSalary: true, grossSalary: true },
        _count: { id: true },
      }),
    ])

    const attendanceSummary = attendanceToday.reduce((acc: Record<string, number>, r) => {
      acc[r.status] = r._count.status
      return acc
    }, {})

    const employmentTypeBreakdown = await prisma.hrEmployee.groupBy({
      by: ['employmentType'],
      where: { tenantId, deletedAt: null, status: 'active' },
      _count: { employmentType: true },
    })

    const departmentBreakdown = await prisma.hrEmployee.groupBy({
      by: ['departmentId'],
      where: { tenantId, deletedAt: null, status: 'active' },
      _count: { departmentId: true },
    })

    return reply.send(buildSuccessResponse({
      headcount: {
        total: totalEmployees,
        active: activeEmployees,
        onLeaveToday,
        newThisMonth,
        terminatedThisMonth,
        turnoverRate: totalEmployees > 0 ? Number(((terminatedThisMonth / totalEmployees) * 100).toFixed(1)) : 0,
      },
      pending: {
        leaveRequests: pendingLeaveRequests,
        documentVerifications: pendingDocumentVerifications,
        expiringDocuments,
      },
      attendance: {
        date: today.toISOString().split('T')[0],
        summary: attendanceSummary,
      },
      payroll: {
        month: today.getMonth() + 1,
        year: today.getFullYear(),
        count: payrollThisMonth._count.id,
        totalGross: Number(payrollThisMonth._sum.grossSalary ?? 0),
        totalNet: Number(payrollThisMonth._sum.netSalary ?? 0),
      },
      upcomingHolidays,
      breakdown: {
        byEmploymentType: employmentTypeBreakdown.map(r => ({ type: r.employmentType, count: r._count.employmentType })),
        byDepartment: departmentBreakdown.map(r => ({ departmentId: r.departmentId, count: r._count.departmentId })),
      },
    }))
  })

  // GET /hr/dashboard/headcount-trend?months=6
  app.get('/headcount-trend', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const months = Math.min(12, parseInt(q.months ?? '6'))

    const trend = []
    const now = new Date()

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0)

      const [hired, terminated] = await Promise.all([
        prisma.hrEmployee.count({ where: { tenantId, deletedAt: null, hireDate: { lte: endOfMonth } } }),
        prisma.hrEmployee.count({ where: { tenantId, deletedAt: null, terminationDate: { lte: endOfMonth } } }),
      ])

      trend.push({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        active: hired - terminated,
        hired,
        terminated,
      })
    }

    return reply.send(buildSuccessResponse(trend))
  })
}
