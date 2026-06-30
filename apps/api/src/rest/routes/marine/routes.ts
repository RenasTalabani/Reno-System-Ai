import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function marineRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [totalVessels, activeVoyages, totalVoyages] = await Promise.all([
      prisma.marVessel.count({ where: { tenantId, status: 'active' } }),
      prisma.marVoyage.count({ where: { vessel: { tenantId }, status: 'underway' } }),
      prisma.marVoyage.count({ where: { vessel: { tenantId } } }),
    ])
    return { success: true, data: { totalVessels, activeVoyages, totalVoyages } }
  })

  app.get('/vessels', async (req) => {
    const { tenantId } = req
    const vessels = await prisma.marVessel.findMany({
      where: { tenantId },
      include: { _count: { select: { voyages: true } } },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: vessels }
  })

  app.post('/vessels', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const vessel = await prisma.marVessel.create({ data: { tenantId, ...data } as never })
    return { success: true, data: vessel }
  })

  app.get('/vessels/:id/voyages', async (req) => {
    const { id } = req.params as { id: string }
    const voyages = await prisma.marVoyage.findMany({
      where: { vesselId: id },
      include: { _count: { select: { cargoManifests: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: voyages }
  })

  app.post('/vessels/:id/voyages', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const count = await prisma.marVoyage.count({ where: { vesselId: id } })
    const voyageNumber = `VOY-${String(count + 1).padStart(4, '0')}`
    const voyage = await prisma.marVoyage.create({ data: { vesselId: id, voyageNumber, ...data } as never })
    return { success: true, data: voyage }
  })

  app.post('/voyages/:id/cargo', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const cargo = await prisma.marCargoManifest.create({ data: { voyageId: id, ...data } as never })
    return { success: true, data: cargo }
  })

  app.patch('/voyages/:id/depart', async (req) => {
    const { id } = req.params as { id: string }
    const voyage = await prisma.marVoyage.update({ where: { id }, data: { status: 'underway', departedAt: new Date() } })
    return { success: true, data: voyage }
  })

  app.patch('/voyages/:id/arrive', async (req) => {
    const { id } = req.params as { id: string }
    const voyage = await prisma.marVoyage.update({ where: { id }, data: { status: 'arrived', arrivedAt: new Date() } })
    return { success: true, data: voyage }
  })
}
