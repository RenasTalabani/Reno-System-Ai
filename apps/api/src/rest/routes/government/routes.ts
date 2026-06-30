import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function governmentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const now = new Date()
    const [totalRegulations, activePermits, pendingFilings] = await Promise.all([
      prisma.govRegulation.count({ where: { tenantId, status: 'active' } }),
      prisma.govPermit.count({ where: { tenantId, status: 'active', expiryDate: { gte: now } } }),
      prisma.govFiling.count({ where: { tenantId, status: 'pending' } }),
    ])
    return { success: true, data: { totalRegulations, activePermits, pendingFilings } }
  })

  app.get('/regulations', async (req) => {
    const { tenantId } = req
    const regulations = await prisma.govRegulation.findMany({
      where: { tenantId },
      include: { _count: { select: { permits: true, filings: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: regulations }
  })

  app.post('/regulations', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const reg = await prisma.govRegulation.create({ data: { tenantId, ...data } as never })
    return { success: true, data: reg }
  })

  app.get('/permits', async (req) => {
    const { tenantId } = req
    const permits = await prisma.govPermit.findMany({
      where: { tenantId },
      orderBy: { expiryDate: 'asc' },
      take: 50,
    })
    return { success: true, data: permits }
  })

  app.post('/permits', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const permit = await prisma.govPermit.create({ data: { tenantId, ...data } as never })
    return { success: true, data: permit }
  })

  app.get('/filings', async (req) => {
    const { tenantId } = req
    const filings = await prisma.govFiling.findMany({
      where: { tenantId },
      orderBy: { dueDate: 'asc' },
      take: 50,
    })
    return { success: true, data: filings }
  })

  app.post('/filings', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const filing = await prisma.govFiling.create({ data: { tenantId, filedBy: userId, ...data } as never })
    return { success: true, data: filing }
  })

  app.patch('/filings/:id/submit', async (req) => {
    const { id } = req.params as { id: string }
    const filing = await prisma.govFiling.update({ where: { id }, data: { status: 'submitted', submittedAt: new Date() } })
    return { success: true, data: filing }
  })
}
