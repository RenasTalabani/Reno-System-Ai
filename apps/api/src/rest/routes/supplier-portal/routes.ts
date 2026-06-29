import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function supplierPortalRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [total, active, highRisk, pending] = await Promise.all([
      prisma.suplProfile.count({ where: { tenantId } }),
      prisma.suplProfile.count({ where: { tenantId, status: 'active' } }),
      prisma.suplProfile.count({ where: { tenantId, riskLevel: 'high' } }),
      prisma.suplProfile.count({ where: { tenantId, status: 'pending' } }),
    ])
    return { success: true, data: { totalSuppliers: total, activeSuppliers: active, highRisk, pendingOnboarding: pending } }
  })

  app.get('/suppliers', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.status) where.status = q.status
    if (q.category) where.category = q.category
    if (q.riskLevel) where.riskLevel = q.riskLevel
    if (q.search) where.name = { contains: q.search, mode: 'insensitive' }
    const suppliers = await prisma.suplProfile.findMany({
      where: where as never,
      include: { _count: { select: { scorecards: true, documents: true } } },
      orderBy: { name: 'asc' },
      take: 100,
    })
    return { success: true, data: suppliers }
  })

  app.post('/suppliers', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const supplier = await prisma.suplProfile.create({ data: { tenantId, ...data } as never })
    return { success: true, data: supplier }
  })

  app.get('/suppliers/:id', async (req) => {
    const { id } = req.params as { id: string }
    const supplier = await prisma.suplProfile.findUnique({
      where: { id },
      include: { scorecards: { orderBy: { createdAt: 'desc' }, take: 5 }, documents: true },
    })
    return { success: true, data: supplier }
  })

  app.patch('/suppliers/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const supplier = await prisma.suplProfile.update({ where: { id }, data: data as never })
    return { success: true, data: supplier }
  })

  app.post('/suppliers/:id/scorecards', async (req) => {
    const { userId } = req
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const { quality = 0, delivery = 0, price = 0, compliance: comp = 0 } = data as Record<string, number>
    const overall = (Number(quality) + Number(delivery) + Number(price) + Number(comp)) / 4
    const sc = await prisma.suplScorecard.create({ data: { supplierId: id, createdBy: userId, overall, ...data } as never })
    return { success: true, data: sc }
  })

  app.post('/suppliers/:id/documents', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const doc = await prisma.suplDocument.create({ data: { supplierId: id, ...data } as never })
    return { success: true, data: doc }
  })
}