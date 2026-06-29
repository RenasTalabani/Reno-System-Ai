import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function clm2Routes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [totalContracts, active, expiring, templates] = await Promise.all([
      prisma.clmContract.count({ where: { tenantId } }),
      prisma.clmContract.count({ where: { tenantId, status: 'active' } }),
      prisma.clmContract.count({ where: { tenantId, status: 'active', endDate: { lte: new Date(Date.now() + 30*24*60*60*1000) } } }),
      prisma.clm2Template.count({ where: { tenantId, isActive: true } }),
    ])
    return { success: true, data: { totalContracts, activeContracts: active, expiringIn30Days: expiring, templates } }
  })

  app.get('/contracts', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.status) where.status = q.status
    if (q.type) where.type = q.type
    const contracts = await prisma.clmContract.findMany({
      where: where as never,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: contracts }
  })

  app.post('/contracts', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const contract = await prisma.clmContract.create({ data: { tenantId, createdBy: userId, ...data } as never })
    return { success: true, data: contract }
  })

  app.get('/contracts/:id', async (req) => {
    const { id } = req.params as { id: string }
    const contract = await prisma.clmContract.findUnique({
      where: { id },
      include: { clauses: true, approvals: true },
    })
    return { success: true, data: contract }
  })

  app.patch('/contracts/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const contract = await prisma.clmContract.update({ where: { id }, data: data as never })
    return { success: true, data: contract }
  })

  app.get('/templates', async (req) => {
    const { tenantId } = req
    const templates = await prisma.clm2Template.findMany({ where: { tenantId, isActive: true }, orderBy: { name: 'asc' } })
    return { success: true, data: templates }
  })

  app.post('/templates', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const tmpl = await prisma.clm2Template.create({ data: { tenantId, createdBy: userId, ...data } as never })
    return { success: true, data: tmpl }
  })

  app.post('/contracts/:id/obligations', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const obl = await prisma.clm2Obligation.create({ data: { contractId: id, ...data } as never })
    return { success: true, data: obl }
  })
}