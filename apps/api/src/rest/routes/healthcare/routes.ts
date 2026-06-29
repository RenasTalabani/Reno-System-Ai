import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function healthcareRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const [totalPatients, todayAppointments, upcomingAppointments] = await Promise.all([
      prisma.hcPatient.count({ where: { tenantId } }),
      prisma.hcAppointment.count({ where: { patient: { tenantId }, scheduledAt: { gte: today } } }),
      prisma.hcAppointment.count({ where: { patient: { tenantId }, status: 'scheduled', scheduledAt: { gte: new Date() } } }),
    ])
    return { success: true, data: { totalPatients, todayAppointments, upcomingAppointments } }
  })

  app.get('/patients', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.search) where.OR = [
      { firstName: { contains: q.search, mode: 'insensitive' } },
      { lastName: { contains: q.search, mode: 'insensitive' } },
    ]
    const patients = await prisma.hcPatient.findMany({
      where: where as never,
      include: { _count: { select: { appointments: true } } },
      orderBy: { lastName: 'asc' },
      take: 100,
    })
    return { success: true, data: patients }
  })

  app.post('/patients', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const patient = await prisma.hcPatient.create({ data: { tenantId, ...data } as never })
    return { success: true, data: patient }
  })

  app.get('/patients/:id', async (req) => {
    const { id } = req.params as { id: string }
    const patient = await prisma.hcPatient.findUnique({
      where: { id },
      include: { appointments: { orderBy: { scheduledAt: 'desc' }, take: 10 } },
    })
    return { success: true, data: patient }
  })

  app.post('/appointments', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const appt = await prisma.hcAppointment.create({ data: data as never })
    return { success: true, data: appt }
  })

  app.get('/appointments', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { patient: { tenantId } }
    if (q.status) where.status = q.status
    if (q.providerId) where.providerId = q.providerId
    const appts = await prisma.hcAppointment.findMany({
      where: where as never,
      include: { patient: { select: { firstName: true, lastName: true } } },
      orderBy: { scheduledAt: 'asc' },
      take: 100,
    })
    return { success: true, data: appts }
  })

  app.patch('/appointments/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const appt = await prisma.hcAppointment.update({ where: { id }, data: data as never })
    return { success: true, data: appt }
  })
}
