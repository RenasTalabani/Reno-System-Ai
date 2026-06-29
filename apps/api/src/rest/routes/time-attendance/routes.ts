import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function timeAttendanceRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const [totalShifts, activeTimesheets, pendingApproval] = await Promise.all([
      prisma.attShift.count({ where: { tenantId, isActive: true } }),
      prisma.attTimesheet.count({ where: { tenantId, status: { in: ['draft', 'submitted'] } } }),
      prisma.attTimesheet.count({ where: { tenantId, status: 'submitted' } }),
    ])
    return { success: true, data: { totalShifts, activeTimesheets, pendingApproval } }
  })

  app.get('/shifts', async (req) => {
    const { tenantId } = req
    const shifts = await prisma.attShift.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: shifts }
  })

  app.post('/shifts', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const shift = await prisma.attShift.create({ data: { tenantId, ...data } as never })
    return { success: true, data: shift }
  })

  app.get('/timesheets', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.employeeId) where.employeeId = q.employeeId
    if (q.status) where.status = q.status
    const timesheets = await prisma.attTimesheet.findMany({
      where: where as never,
      include: { shift: { select: { name: true } }, _count: { select: { clockEntries: true } } },
      orderBy: { periodStart: 'desc' },
      take: 50,
    })
    return { success: true, data: timesheets }
  })

  app.post('/timesheets', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const ts = await prisma.attTimesheet.create({ data: { tenantId, employeeId: userId, ...data } as never })
    return { success: true, data: ts }
  })

  app.post('/timesheets/:id/clock-in', async (req) => {
    const { id } = req.params as { id: string }
    const entry = await prisma.attClockEntry.create({ data: { timesheetId: id, clockIn: new Date() } })
    return { success: true, data: entry }
  })

  app.patch('/timesheets/:id/clock-out', async (req) => {
    const { id } = req.params as { id: string }
    const open = await prisma.attClockEntry.findFirst({
      where: { timesheetId: id, clockOut: null },
      orderBy: { clockIn: 'desc' },
    })
    if (!open) return { success: false, error: 'No open clock-in found' }
    const entry = await prisma.attClockEntry.update({ where: { id: open.id }, data: { clockOut: new Date() } })
    return { success: true, data: entry }
  })

  app.patch('/timesheets/:id/submit', async (req) => {
    const { id } = req.params as { id: string }
    const ts = await prisma.attTimesheet.update({ where: { id }, data: { status: 'submitted' } })
    return { success: true, data: ts }
  })

  app.patch('/timesheets/:id/approve', async (req) => {
    const { userId } = req
    const { id } = req.params as { id: string }
    const ts = await prisma.attTimesheet.update({ where: { id }, data: { status: 'approved', approvedBy: userId, approvedAt: new Date() } })
    return { success: true, data: ts }
  })
}