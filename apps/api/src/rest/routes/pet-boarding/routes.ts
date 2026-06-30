import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function petBoardingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [totalPets, currentGuests, todayCheckouts] = await Promise.all([
      prisma.pbdPet.count({ where: { tenantId } }),
      prisma.pbdStay.count({ where: { pet: { tenantId }, status: 'checked-in', checkOut: null } }),
      prisma.pbdStay.count({ where: { pet: { tenantId }, checkOut: { gte: new Date(new Date().toDateString()) } } }),
    ])
    return { success: true, data: { totalPets, currentGuests, todayCheckouts } }
  })

  app.get('/pets', async (req) => {
    const { tenantId } = req
    const pets = await prisma.pbdPet.findMany({
      where: { tenantId },
      include: { _count: { select: { stays: true } } },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: pets }
  })

  app.post('/pets', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const pet = await prisma.pbdPet.create({ data: { tenantId, ...data } as never })
    return { success: true, data: pet }
  })

  app.post('/pets/:id/checkin', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const stay = await prisma.pbdStay.create({ data: { petId: id, checkIn: new Date(), status: 'checked-in', ...data } as never })
    return { success: true, data: stay }
  })

  app.patch('/stays/:id/checkout', async (req) => {
    const { id } = req.params as { id: string }
    const stay = await prisma.pbdStay.update({ where: { id }, data: { checkOut: new Date(), status: 'checked-out' } })
    return { success: true, data: stay }
  })
}
