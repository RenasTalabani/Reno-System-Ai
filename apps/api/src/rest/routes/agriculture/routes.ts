import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function agricultureRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [totalFarms, activeCrops, totalHarvests] = await Promise.all([
      prisma.agrFarm.count({ where: { tenantId, isActive: true } }),
      prisma.agrCrop.count({ where: { farm: { tenantId }, status: 'growing' } }),
      prisma.agrHarvest.count({ where: { crop: { farm: { tenantId } } } }),
    ])
    return { success: true, data: { totalFarms, activeCrops, totalHarvests } }
  })

  app.get('/farms', async (req) => {
    const { tenantId } = req
    const farms = await prisma.agrFarm.findMany({
      where: { tenantId },
      include: { _count: { select: { crops: true } } },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: farms }
  })

  app.post('/farms', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const farm = await prisma.agrFarm.create({ data: { tenantId, ...data } as never })
    return { success: true, data: farm }
  })

  app.get('/farms/:id/crops', async (req) => {
    const { id } = req.params as { id: string }
    const crops = await prisma.agrCrop.findMany({
      where: { farmId: id },
      include: { _count: { select: { harvests: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: crops }
  })

  app.post('/farms/:id/crops', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const crop = await prisma.agrCrop.create({ data: { farmId: id, ...data } as never })
    return { success: true, data: crop }
  })

  app.post('/crops/:id/harvests', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const harvest = await prisma.agrHarvest.create({ data: { cropId: id, ...data } as never })
    await prisma.agrCrop.update({ where: { id }, data: { status: 'harvested' } })
    return { success: true, data: harvest }
  })
}
