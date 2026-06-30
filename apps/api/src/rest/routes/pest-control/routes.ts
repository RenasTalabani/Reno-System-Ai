import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function pestControlRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [activeContracts, totalVisits, expiringSoon] = await Promise.all([
      prisma.pctContract.count({ where: { tenantId, status: 'active' } }),
      prisma.pctVisit.count({ where: { contract: { tenantId } } }),
      prisma.pctContract.count({ where: { tenantId, status: 'active', endDate: { lte: new Date(Date.now() + 30 * 86400000) } } }),
    ])
    return { success: true, data: { activeContracts, totalVisits, expiringSoon } }
  })

  app.get('/contracts', async (req) => {
    const { tenantId } = req
    const contracts = await prisma.pctContract.findMany({
      where: { tenantId },
      include: { _count: { select: { visits: true } } },
      orderBy: { startDate: 'desc' },
      take: 50,
    })
    return { success: true, data: contracts }
  })

  app.post('/contracts', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const contract = await prisma.pctContract.create({ data: { tenantId, ...data } as never })
    return { success: true, data: contract }
  })

  app.post('/contracts/:id/visits', async (req) => {
    const { id } = req.params as { id: string }
    const { userId } = req
    const data = req.body as Record<string, unknown>
    const visit = await prisma.pctVisit.create({ data: { contractId: id, technicianId: userId, visitDate: new Date(), ...data } as never })
    return { success: true, data: visit }
  })
}
