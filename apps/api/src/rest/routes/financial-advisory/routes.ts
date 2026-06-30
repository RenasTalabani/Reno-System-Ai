import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function financialAdvisoryRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [totalClients, activeClients, activePlans] = await Promise.all([
      prisma.fpaClient.count({ where: { tenantId } }),
      prisma.fpaClient.count({ where: { tenantId, status: 'active' } }),
      prisma.fpaPlan.count({ where: { client: { tenantId }, status: 'active' } }),
    ])
    return { success: true, data: { totalClients, activeClients, activePlans } }
  })

  app.get('/clients', async (req) => {
    const { tenantId } = req
    const clients = await prisma.fpaClient.findMany({
      where: { tenantId },
      include: { _count: { select: { plans: true } } },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: clients }
  })

  app.post('/clients', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const client = await prisma.fpaClient.create({ data: { tenantId, advisorId: userId, ...data } as never })
    return { success: true, data: client }
  })

  app.get('/clients/:id/plans', async (req) => {
    const { id } = req.params as { id: string }
    const plans = await prisma.fpaPlan.findMany({ where: { clientId: id }, orderBy: { createdAt: 'desc' } })
    return { success: true, data: plans }
  })

  app.post('/clients/:id/plans', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const plan = await prisma.fpaPlan.create({ data: { clientId: id, ...data } as never })
    return { success: true, data: plan }
  })

  app.patch('/clients/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const client = await prisma.fpaClient.update({ where: { id }, data: data as never })
    return { success: true, data: client }
  })
}
