import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function loyalty2Routes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [programs, members, rewards, redemptions] = await Promise.all([
      prisma.loyaltyProgram.count({ where: { tenantId } }),
      prisma.loyaltyMember.count({ where: { tenantId } }),
      prisma.lty2Reward.count({ where: { tenantId, isActive: true } }),
      prisma.lty2Redemption.count({ where: { reward: { tenantId } } }),
    ])
    return { success: true, data: { programs, members, activeRewards: rewards, totalRedemptions: redemptions } }
  })

  app.get('/programs', async (req) => {
    const { tenantId } = req
    const programs = await prisma.loyaltyProgram.findMany({
      where: { tenantId },
      include: { _count: { select: { members: true, transactions: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: programs }
  })

  app.get('/members', async (req) => {
    const { tenantId } = req
    const members = await prisma.loyaltyMember.findMany({
      where: { tenantId },
      include: { program: { select: { name: true } } },
      orderBy: { points: 'desc' },
      take: 100,
    })
    return { success: true, data: members }
  })

  app.get('/rewards', async (req) => {
    const { tenantId } = req
    const rewards = await prisma.lty2Reward.findMany({
      where: { tenantId, isActive: true },
      include: { _count: { select: { redemptions: true } } },
      orderBy: { pointsCost: 'asc' },
    })
    return { success: true, data: rewards }
  })

  app.post('/rewards', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const reward = await prisma.lty2Reward.create({ data: { tenantId, ...data } as never })
    return { success: true, data: reward }
  })

  app.post('/rewards/:id/redeem', async (req) => {
    const { id } = req.params as { id: string }
    const { memberId } = req.body as { memberId: string }
    const reward = await prisma.lty2Reward.findUnique({ where: { id } })
    if (!reward) return { success: false, error: 'Reward not found' }
    const redemption = await prisma.lty2Redemption.create({ data: { rewardId: id, memberId, pointsUsed: reward.pointsCost } })
    await prisma.loyaltyMember.update({ where: { id: memberId }, data: { points: { decrement: reward.pointsCost } } })
    return { success: true, data: redemption }
  })

  app.get('/tiers', async (req) => {
    const q = req.query as Record<string, string>
    if (!q.programId) return { success: true, data: [] }
    const tiers = await prisma.lty2Tier.findMany({ where: { programId: q.programId }, orderBy: { minPoints: 'asc' } })
    return { success: true, data: tiers }
  })

  app.post('/tiers', async (req) => {
    const data = req.body as Record<string, unknown>
    const tier = await prisma.lty2Tier.create({ data: data as never })
    return { success: true, data: tier }
  })
}