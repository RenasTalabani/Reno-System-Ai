import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function nonprofitRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [totalDonors, totalDonations, totalRaised] = await Promise.all([
      prisma.npDonor.count({ where: { tenantId, status: 'active' } }),
      prisma.npDonation.count({ where: { donor: { tenantId } } }),
      prisma.npDonation.aggregate({ where: { donor: { tenantId } }, _sum: { amount: true } }),
    ])
    return { success: true, data: { totalDonors, totalDonations, totalRaised: totalRaised._sum.amount ?? 0 } }
  })

  app.get('/donors', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.status) where.status = q.status
    if (q.search) where.OR = [
      { firstName: { contains: q.search, mode: 'insensitive' } },
      { lastName: { contains: q.search, mode: 'insensitive' } },
    ]
    const donors = await prisma.npDonor.findMany({
      where: where as never,
      include: { _count: { select: { donations: true } } },
      orderBy: [{ totalGiven: 'desc' }],
      take: 100,
    })
    return { success: true, data: donors }
  })

  app.post('/donors', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const donor = await prisma.npDonor.create({ data: { tenantId, ...data } as never })
    return { success: true, data: donor }
  })

  app.post('/donors/:id/donations', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const donation = await prisma.npDonation.create({ data: { donorId: id, ...data } as never })
    await prisma.npDonor.update({ where: { id }, data: { totalGiven: { increment: Number(data.amount) }, lastGiftAt: new Date() } })
    return { success: true, data: donation }
  })

  app.get('/donations', async (req) => {
    const { tenantId } = req
    const donations = await prisma.npDonation.findMany({
      where: { donor: { tenantId } },
      include: { donor: { select: { firstName: true, lastName: true } } },
      orderBy: { receivedAt: 'desc' },
      take: 100,
    })
    return { success: true, data: donations }
  })
}
