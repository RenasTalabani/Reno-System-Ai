import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function grantsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [total, awarded, totalValue] = await Promise.all([
      prisma.grantGrant.count({ where: { tenantId } }),
      prisma.grantGrant.count({ where: { tenantId, status: 'awarded' } }),
      prisma.grantGrant.aggregate({ where: { tenantId, status: 'awarded' }, _sum: { amount: true } }),
    ])
    return { success: true, data: { totalGrants: total, awardedGrants: awarded, totalAwardedValue: totalValue._sum.amount ?? 0 } }
  })

  app.get('/', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.status) where.status = q.status
    const grants = await prisma.grantGrant.findMany({
      where: where as never,
      include: { _count: { select: { milestones: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: grants }
  })

  app.post('/', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const grant = await prisma.grantGrant.create({ data: { tenantId, ownerId: userId, ...data } as never })
    return { success: true, data: grant }
  })

  app.get('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const grant = await prisma.grantGrant.findUnique({ where: { id }, include: { milestones: { orderBy: { dueDate: 'asc' } } } })
    return { success: true, data: grant }
  })

  app.patch('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const grant = await prisma.grantGrant.update({ where: { id }, data: data as never })
    return { success: true, data: grant }
  })

  app.post('/:id/milestones', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const milestone = await prisma.grantMilestone.create({ data: { grantId: id, ...data } as never })
    return { success: true, data: milestone }
  })

  app.patch('/milestones/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const milestone = await prisma.grantMilestone.update({ where: { id }, data: data as never })
    return { success: true, data: milestone }
  })
}
