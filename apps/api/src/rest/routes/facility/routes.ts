import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function facilityRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/properties', async (req) => {
    const { tenantId } = req
    const props = await prisma.facilityProperty.findMany({
      where: { tenantId },
      include: { _count: { select: { leases: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: props }
  })

  app.post('/properties', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const p = await prisma.facilityProperty.create({ data: { tenantId, ...data } as never })
    return { success: true, data: p }
  })

  app.get('/leases', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const leases = await prisma.facilityLease.findMany({
      where: { tenantId, ...(q.propertyId ? { propertyId: q.propertyId } : {}), ...(q.status ? { status: q.status } : {}) },
      include: { property: { select: { name: true, address: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: leases }
  })

  app.post('/leases', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const lease = await prisma.facilityLease.create({ data: { tenantId, ...data } as never })
    return { success: true, data: lease }
  })

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [properties, activeLeases, revenue] = await Promise.all([
      prisma.facilityProperty.count({ where: { tenantId } }),
      prisma.facilityLease.count({ where: { tenantId, status: 'active' } }),
      prisma.facilityLease.aggregate({ where: { tenantId, status: 'active' }, _sum: { rentAmount: true } }),
    ])
    return { success: true, data: { properties, activeLeases, monthlyRevenue: revenue._sum.rentAmount ?? 0 } }
  })
}
