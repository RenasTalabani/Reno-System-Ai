import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function propertyRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [totalProperties, vacantUnits, occupiedUnits, activeLeases] = await Promise.all([
      prisma.propProperty.count({ where: { tenantId } }),
      prisma.propUnit.count({ where: { property: { tenantId }, status: 'vacant' } }),
      prisma.propUnit.count({ where: { property: { tenantId }, status: 'occupied' } }),
      prisma.propLease.count({ where: { unit: { property: { tenantId } }, status: 'active' } }),
    ])
    return { success: true, data: { totalProperties, vacantUnits, occupiedUnits, activeLeases } }
  })

  app.get('/properties', async (req) => {
    const { tenantId } = req
    const props = await prisma.propProperty.findMany({
      where: { tenantId },
      include: { _count: { select: { units: true } } },
      orderBy: { name: 'asc' },
      take: 50,
    })
    return { success: true, data: props }
  })

  app.post('/properties', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const prop = await prisma.propProperty.create({ data: { tenantId, ...data } as never })
    return { success: true, data: prop }
  })

  app.get('/properties/:id', async (req) => {
    const { id } = req.params as { id: string }
    const prop = await prisma.propProperty.findUnique({
      where: { id },
      include: { units: { include: { leases: { where: { status: 'active' }, take: 1 } } } },
    })
    return { success: true, data: prop }
  })

  app.post('/properties/:id/units', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const unit = await prisma.propUnit.create({ data: { propertyId: id, ...data } as never })
    return { success: true, data: unit }
  })

  app.post('/units/:id/leases', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const lease = await prisma.propLease.create({ data: { unitId: id, ...data } as never })
    await prisma.propUnit.update({ where: { id }, data: { status: 'occupied' } })
    return { success: true, data: lease }
  })

  app.get('/leases', async (req) => {
    const { tenantId } = req
    const leases = await prisma.propLease.findMany({
      where: { unit: { property: { tenantId } } },
      include: { unit: { include: { property: { select: { name: true } } } } },
      orderBy: { startDate: 'desc' },
      take: 100,
    })
    return { success: true, data: leases }
  })
}
