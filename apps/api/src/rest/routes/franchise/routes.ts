import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function franchiseRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [total, active, pendingRoyalties] = await Promise.all([
      prisma.franchisee.count({ where: { tenantId } }),
      prisma.franchisee.count({ where: { tenantId, status: 'active' } }),
      prisma.franchiseRoyalty.count({ where: { franchisee: { tenantId }, status: 'pending' } }),
    ])
    return { success: true, data: { totalFranchisees: total, activeFranchisees: active, pendingRoyalties } }
  })

  app.get('/franchisees', async (req) => {
    const { tenantId } = req
    const list = await prisma.franchisee.findMany({
      where: { tenantId },
      include: { _count: { select: { royalties: true, inspections: true } } },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: list }
  })

  app.post('/franchisees', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const franchisee = await prisma.franchisee.create({ data: { tenantId, ownerId: userId, ...data } as never })
    return { success: true, data: franchisee }
  })

  app.post('/franchisees/:id/royalties', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const royalty = await prisma.franchiseRoyalty.create({ data: { franchiseeId: id, ...data } as never })
    return { success: true, data: royalty }
  })

  app.post('/franchisees/:id/inspections', async (req) => {
    const { id } = req.params as { id: string }
    const { userId } = req
    const data = req.body as Record<string, unknown>
    const inspection = await prisma.franchiseInspection.create({ data: { franchiseeId: id, inspectorId: userId, ...data } as never })
    return { success: true, data: inspection }
  })
}
