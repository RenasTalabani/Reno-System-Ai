import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function treasuryRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const accounts = await prisma.trsAccount.findMany({ where: { tenantId, isActive: true } })
    const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0)
    const currencies = [...new Set(accounts.map(a => a.currency))]
    return { success: true, data: { totalAccounts: accounts.length, totalBalance, currencies } }
  })

  app.get('/accounts', async (req) => {
    const { tenantId } = req
    const accounts = await prisma.trsAccount.findMany({
      where: { tenantId },
      include: { _count: { select: { transactions: true } } },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: accounts }
  })

  app.post('/accounts', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const account = await prisma.trsAccount.create({ data: { tenantId, ...data } as never })
    return { success: true, data: account }
  })

  app.get('/accounts/:id/transactions', async (req) => {
    const { id } = req.params as { id: string }
    const txns = await prisma.trsTx.findMany({
      where: { accountId: id },
      orderBy: { valueDate: 'desc' },
      take: 100,
    })
    return { success: true, data: txns }
  })

  app.post('/accounts/:id/transactions', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const tx = await prisma.trsTx.create({ data: { accountId: id, ...data } as never })
    const multiplier = (data.type === 'debit' || data.type === 'withdrawal') ? -1 : 1
    await prisma.trsAccount.update({ where: { id }, data: { balance: { increment: Number(data.amount) * multiplier } } })
    return { success: true, data: tx }
  })

  app.get('/fx-rates', async (req) => {
    const { tenantId } = req
    const rates = await prisma.trsFxRate.findMany({
      where: { tenantId },
      orderBy: { rateDate: 'desc' },
      take: 50,
    })
    return { success: true, data: rates }
  })

  app.post('/fx-rates', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const rate = await prisma.trsFxRate.create({ data: { tenantId, ...data } as never })
    return { success: true, data: rate }
  })
}