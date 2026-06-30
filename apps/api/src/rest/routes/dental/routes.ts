import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function dentalRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const now = new Date()
    const [totalPatients, todayAppointments, pendingAppointments] = await Promise.all([
      prisma.dntPatient.count({ where: { tenantId, status: 'active' } }),
      prisma.dntAppointment.count({ where: { patient: { tenantId }, scheduledAt: { gte: new Date(now.toDateString()) } } }),
      prisma.dntAppointment.count({ where: { patient: { tenantId }, status: 'scheduled' } }),
    ])
    return { success: true, data: { totalPatients, todayAppointments, pendingAppointments } }
  })

  app.get('/patients', async (req) => {
    const { tenantId } = req
    const patients = await prisma.dntPatient.findMany({ where: { tenantId }, orderBy: { name: 'asc' }, take: 100 })
    return { success: true, data: patients }
  })

  app.post('/patients', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const patient = await prisma.dntPatient.create({ data: { tenantId, ...data } as never })
    return { success: true, data: patient }
  })

  app.post('/patients/:id/appointments', async (req) => {
    const { id } = req.params as { id: string }
    const { userId } = req
    const data = req.body as Record<string, unknown>
    const appt = await prisma.dntAppointment.create({ data: { patientId: id, dentistId: userId, ...data } as never })
    return { success: true, data: appt }
  })

  app.patch('/appointments/:id/complete', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const appt = await prisma.dntAppointment.update({ where: { id }, data: { status: 'completed', ...data } as never })
    return { success: true, data: appt }
  })
}
