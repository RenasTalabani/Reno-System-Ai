import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function securityServicesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [activeContracts, totalPatrols, incidents] = await Promise.all([
      prisma.secContract.count({ where: { tenantId, status: 'active' } }),
      prisma.secPatrol.count({ where: { contract: { tenantId } } }),
      prisma.secPatrol.count({ where: { contract: { tenantId }, incident: true } }),
    ])
    return { success: true, data: { activeContracts, totalPatrols, incidents } }
  })

  app.get('/contracts', async (req) => {
    const { tenantId } = req
    const contracts = await prisma.secContract.findMany({
      where: { tenantId },
      include: { _count: { select: { patrols: true } } },
      orderBy: { startDate: 'desc' },
    })
    return { success: true, data: contracts }
  })

  app.post('/contracts', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const contract = await prisma.secContract.create({ data: { tenantId, ...data } as never })
    return { success: true, data: contract }
  })

  app.post('/contracts/:id/patrols', async (req) => {
    const { id } = req.params as { id: string }
    const { userId } = req
    const data = req.body as Record<string, unknown>
    const patrol = await prisma.secPatrol.create({ data: { contractId: id, officerId: userId, startedAt: new Date(), ...data } as never })
    return { success: true, data: patrol }
  })

  app.patch('/patrols/:id/end', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const patrol = await prisma.secPatrol.update({ where: { id }, data: { endedAt: new Date(), ...data } as never })
    return { success: true, data: patrol }
  })
}
