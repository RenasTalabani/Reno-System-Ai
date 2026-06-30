import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function insuranceRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [activePolicies, openClaims, totalPolicies] = await Promise.all([
      prisma.insPolicy.count({ where: { tenantId, status: 'active' } }),
      prisma.insClaim.count({ where: { policy: { tenantId }, status: { in: ['submitted', 'under-review'] } } }),
      prisma.insPolicy.count({ where: { tenantId } }),
    ])
    return { success: true, data: { activePolicies, openClaims, totalPolicies } }
  })

  app.get('/policies', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.status) where.status = q.status
    const policies = await prisma.insPolicy.findMany({
      where: where as never,
      include: { _count: { select: { claims: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: policies }
  })

  app.post('/policies', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const policy = await prisma.insPolicy.create({ data: { tenantId, ...data } as never })
    return { success: true, data: policy }
  })

  app.get('/policies/:id/claims', async (req) => {
    const { id } = req.params as { id: string }
    const claims = await prisma.insClaim.findMany({ where: { policyId: id }, orderBy: { createdAt: 'desc' } })
    return { success: true, data: claims }
  })

  app.post('/policies/:id/claims', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const claimNumber = `CLM-${Date.now().toString(36).toUpperCase()}`
    const claim = await prisma.insClaim.create({ data: { policyId: id, claimNumber, ...data } as never })
    return { success: true, data: claim }
  })

  app.patch('/claims/:id/settle', async (req) => {
    const { id } = req.params as { id: string }
    const claim = await prisma.insClaim.update({ where: { id }, data: { status: 'settled', settledAt: new Date() } })
    return { success: true, data: claim }
  })
}
