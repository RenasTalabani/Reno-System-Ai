import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function veterinaryRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const now = new Date()
    const [totalPets, activePets, todayVisits] = await Promise.all([
      prisma.vetPet.count({ where: { tenantId } }),
      prisma.vetPet.count({ where: { tenantId, status: 'active' } }),
      prisma.vetVisit.count({ where: { pet: { tenantId }, visitDate: { gte: new Date(now.toDateString()) } } }),
    ])
    return { success: true, data: { totalPets, activePets, todayVisits } }
  })

  app.get('/pets', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const pets = await prisma.vetPet.findMany({
      where: { tenantId },
      include: { _count: { select: { visits: true } } },
      orderBy: { name: 'asc' },
      take: Number(q.limit ?? 50),
    })
    return { success: true, data: pets }
  })

  app.post('/pets', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const pet = await prisma.vetPet.create({ data: { tenantId, ...data } as never })
    return { success: true, data: pet }
  })

  app.get('/pets/:id', async (req) => {
    const { id } = req.params as { id: string }
    const pet = await prisma.vetPet.findUnique({
      where: { id },
      include: { visits: { orderBy: { visitDate: 'desc' }, take: 20 } },
    })
    return { success: true, data: pet }
  })

  app.post('/pets/:id/visits', async (req) => {
    const { id } = req.params as { id: string }
    const { userId } = req
    const data = req.body as Record<string, unknown>
    const visit = await prisma.vetVisit.create({ data: { petId: id, vetId: userId, visitDate: new Date(), ...data } as never })
    return { success: true, data: visit }
  })
}
