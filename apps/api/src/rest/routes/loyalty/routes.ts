import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function loyaltyRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/programs', async (req) => {
    const { tenantId } = req
    const programs = await prisma.loyaltyProgram.findMany({
      where: { tenantId },
      include: { _count: { select: { members: true } } },
    })
    return { success: true, data: programs }
  })

  app.post('/programs', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const program = await prisma.loyaltyProgram.create({ data: { tenantId, ...data } as never })
    return { success: true, data: program }
  })

  app.get('/members', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const members = await prisma.loyaltyMember.findMany({
      where: { tenantId, ...(q.programId ? { programId: q.programId } : {}) },
      include: { program: { select: { name: true } }, _count: { select: { transactions: true } } },
      orderBy: { points: 'desc' },
      take: 100,
    })
    return { success: true, data: members }
  })

  app.post('/members/:id/points', async (req) => {
    const { id } = req.params as { id: string }
    const { points, type, description } = req.body as { points: number; type: string; description?: string }
    const [member] = await prisma.$transaction([
      prisma.loyaltyMember.update({
        where: { id },
        data: { points: { increment: points }, ...(points > 0 ? { lifetime: { increment: points } } : {}) },
      }),
      prisma.loyaltyTransaction.create({ data: { memberId: id, type, points, description } }),
    ])
    return { success: true, data: member }
  })

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [programs, members, totalPoints] = await Promise.all([
      prisma.loyaltyProgram.count({ where: { tenantId } }),
      prisma.loyaltyMember.count({ where: { tenantId } }),
      prisma.loyaltyMember.aggregate({ where: { tenantId }, _sum: { points: true } }),
    ])
    return { success: true, data: { programs, members, totalActivePoints: totalPoints._sum.points ?? 0 } }
  })
}
