import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../lib/prisma.js'

export async function reportingRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] }

  app.get('/reports', auth, async (req) => {
    const { tenantId } = req.user as { tenantId: string }
    const reports = await prisma.rptReport.findMany({ where: { tenantId }, orderBy: { updatedAt: 'desc' } })
    return { success: true, data: reports }
  })

  app.post('/reports', auth, async (req) => {
    const { tenantId, id: createdBy } = req.user as { tenantId: string; id: string }
    const data = req.body as Record<string, unknown>
    const report = await prisma.rptReport.create({ data: { tenantId, createdBy, ...data } as never })
    return { success: true, data: report }
  })

  app.get('/reports/:id', auth, async (req) => {
    const { tenantId } = req.user as { tenantId: string }
    const { id } = req.params as { id: string }
    const report = await prisma.rptReport.findFirst({ where: { id, tenantId }, include: { schedules: true, exports: { take: 10, orderBy: { createdAt: 'desc' } } } })
    return { success: true, data: report }
  })

  app.put('/reports/:id', auth, async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const report = await prisma.rptReport.update({ where: { id }, data: data as never })
    return { success: true, data: report }
  })

  app.delete('/reports/:id', auth, async (req) => {
    const { id } = req.params as { id: string }
    await prisma.rptReport.delete({ where: { id } })
    return { success: true }
  })

  app.post('/reports/:id/export', auth, async (req) => {
    const { id } = req.params as { id: string }
    const { format } = req.body as { format: string }
    const exp = await prisma.rptExport.create({ data: { reportId: id, format, status: 'pending' } })
    await prisma.rptReport.update({ where: { id }, data: { lastRunAt: new Date() } })
    return { success: true, data: exp }
  })

  app.get('/schedules', auth, async (req) => {
    const { tenantId } = req.user as { tenantId: string }
    const schedules = await prisma.rptSchedule.findMany({ where: { tenantId }, include: { report: true } })
    return { success: true, data: schedules }
  })

  app.post('/schedules', auth, async (req) => {
    const { tenantId } = req.user as { tenantId: string }
    const data = req.body as Record<string, unknown>
    const schedule = await prisma.rptSchedule.create({ data: { tenantId, ...data } as never })
    return { success: true, data: schedule }
  })
}
