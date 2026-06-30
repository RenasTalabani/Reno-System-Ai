import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function solarRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [totalInstallations, activeInstallations, totalReadings] = await Promise.all([
      prisma.slrInstallation.count({ where: { tenantId } }),
      prisma.slrInstallation.count({ where: { tenantId, status: 'active' } }),
      prisma.slrReading.count({ where: { installation: { tenantId } } }),
    ])
    return { success: true, data: { totalInstallations, activeInstallations, totalReadings } }
  })

  app.get('/installations', async (req) => {
    const { tenantId } = req
    const installations = await prisma.slrInstallation.findMany({
      where: { tenantId },
      include: { _count: { select: { readings: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: installations }
  })

  app.post('/installations', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const inst = await prisma.slrInstallation.create({ data: { tenantId, ...data } as never })
    return { success: true, data: inst }
  })

  app.patch('/installations/:id/activate', async (req) => {
    const { id } = req.params as { id: string }
    const inst = await prisma.slrInstallation.update({ where: { id }, data: { status: 'active', installedAt: new Date() } })
    return { success: true, data: inst }
  })

  app.post('/installations/:id/readings', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const reading = await prisma.slrReading.create({ data: { installationId: id, readingAt: new Date(), ...data } as never })
    return { success: true, data: reading }
  })
}
