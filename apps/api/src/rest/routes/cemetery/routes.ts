import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function cemeteryRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [totalPlots, availablePlots, totalInterments] = await Promise.all([
      prisma.cemPlot.count({ where: { tenantId } }),
      prisma.cemPlot.count({ where: { tenantId, status: 'available' } }),
      prisma.cemInterment.count({ where: { plot: { tenantId } } }),
    ])
    return { success: true, data: { totalPlots, availablePlots, totalInterments } }
  })

  app.get('/plots', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.status) where.status = q.status
    const plots = await prisma.cemPlot.findMany({
      where: where as never,
      include: { _count: { select: { interments: true } } },
      orderBy: { plotNumber: 'asc' },
    })
    return { success: true, data: plots }
  })

  app.post('/plots', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const plot = await prisma.cemPlot.create({ data: { tenantId, ...data } as never })
    return { success: true, data: plot }
  })

  app.post('/plots/:id/interments', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const interment = await prisma.cemInterment.create({ data: { plotId: id, ...data } as never })
    await prisma.cemPlot.update({ where: { id }, data: { status: 'occupied' } })
    return { success: true, data: interment }
  })

  app.get('/plots/:id/interments', async (req) => {
    const { id } = req.params as { id: string }
    const interments = await prisma.cemInterment.findMany({ where: { plotId: id }, orderBy: { intermentDate: 'desc' } })
    return { success: true, data: interments }
  })
}
