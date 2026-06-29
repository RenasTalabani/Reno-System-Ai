import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function invoice2Routes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [totalQuotes, pendingValue, acceptedValue, activeLinks] = await Promise.all([
      prisma.inv2Quote.count({ where: { tenantId } }),
      prisma.inv2Quote.aggregate({ where: { tenantId, status: 'sent' }, _sum: { total: true } }),
      prisma.inv2Quote.aggregate({ where: { tenantId, status: 'accepted' }, _sum: { total: true } }),
      prisma.inv2PaymentLink.count({ where: { tenantId, status: 'active' } }),
    ])
    return { success: true, data: { totalQuotes, pendingValue: pendingValue._sum.total ?? 0, acceptedValue: acceptedValue._sum.total ?? 0, activePaymentLinks: activeLinks } }
  })

  app.get('/quotes', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.status) where.status = q.status
    if (q.type) where.type = q.type
    const quotes = await prisma.inv2Quote.findMany({
      where: where as never,
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: quotes }
  })

  app.post('/quotes', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const count = await prisma.inv2Quote.count({ where: { tenantId } })
    const number = 'Q-' + String(count + 1).padStart(4, '0')
    const quote = await prisma.inv2Quote.create({ data: { tenantId, createdBy: userId, number, ...data } as never })
    return { success: true, data: quote }
  })

  app.get('/quotes/:id', async (req) => {
    const { id } = req.params as { id: string }
    const quote = await prisma.inv2Quote.findUnique({ where: { id }, include: { items: { orderBy: { order: 'asc' } }, paymentLinks: true } })
    return { success: true, data: quote }
  })

  app.patch('/quotes/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const quote = await prisma.inv2Quote.update({ where: { id }, data: data as never })
    return { success: true, data: quote }
  })

  app.post('/quotes/:id/items', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const item = await prisma.inv2QuoteItem.create({ data: { quoteId: id, ...data } as never })
    const agg = await prisma.inv2QuoteItem.aggregate({ where: { quoteId: id }, _sum: { total: true } })
    await prisma.inv2Quote.update({ where: { id }, data: { subtotal: agg._sum.total ?? 0, total: agg._sum.total ?? 0 } })
    return { success: true, data: item }
  })

  app.patch('/quotes/:id/send', async (req) => {
    const { id } = req.params as { id: string }
    const quote = await prisma.inv2Quote.update({ where: { id }, data: { status: 'sent', sentAt: new Date() } })
    return { success: true, data: quote }
  })

  app.patch('/quotes/:id/accept', async (req) => {
    const { id } = req.params as { id: string }
    const quote = await prisma.inv2Quote.update({ where: { id }, data: { status: 'accepted', acceptedAt: new Date() } })
    return { success: true, data: quote }
  })

  app.post('/payment-links', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const token = 'pl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8)
    const link = await prisma.inv2PaymentLink.create({ data: { tenantId, token, ...data } as never })
    return { success: true, data: link }
  })

  app.get('/payment-links', async (req) => {
    const { tenantId } = req
    const links = await prisma.inv2PaymentLink.findMany({
      where: { tenantId },
      include: { quote: { select: { number: true, clientName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: links }
  })
}