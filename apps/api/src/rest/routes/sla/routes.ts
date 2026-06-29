import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function slaRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/definitions', async (req) => {
    const { tenantId } = req
    const defs = await prisma.slaDefinition.findMany({
      where: { tenantId },
      include: { _count: { select: { breaches: true } } },
    })
    return { success: true, data: defs }
  })

  app.post('/definitions', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const def = await prisma.slaDefinition.create({ data: { tenantId, ...data } as never })
    return { success: true, data: def }
  })

  app.get('/breaches', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const breaches = await prisma.slaBreach.findMany({
      where: {
        tenantId,
        ...(q.slaId ? { slaId: q.slaId } : {}),
        ...(q.refType ? { refType: q.refType } : {}),
      },
      include: { sla: { select: { name: true, module: true } } },
      orderBy: { dueAt: 'desc' },
      take: 100,
    })
    return { success: true, data: breaches }
  })

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [definitions, totalBreaches, openBreaches] = await Promise.all([
      prisma.slaDefinition.count({ where: { tenantId, isActive: true } }),
      prisma.slaBreach.count({ where: { tenantId } }),
      prisma.slaBreach.count({ where: { tenantId, resolvedAt: null } }),
    ])
    return { success: true, data: { activeDefinitions: definitions, totalBreaches, openBreaches } }
  })
}
