import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function customerPortalRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // T1: registry
  app.get('/registry', async () => ({
    accountStatuses: ['trial', 'active', 'past-due', 'churned'],
    billingCycles: ['monthly', 'yearly'],
    invoiceStatuses: ['open', 'paid', 'overdue', 'void'],
    priorities: ['low', 'normal', 'high', 'urgent'],
    contactRoles: ['owner', 'admin', 'billing', 'member'],
  }))

  // T2: create account
  app.post('/accounts', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { companyName, slug, industry, metadata } = req.body as any
    const account = await prisma.cpAccount.create({
      data: { tenantId: r.tenantId, companyName, slug, industry, status: 'trial', metadata: metadata as never },
    })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'CREATE', module: 'customer-portal', entityType: 'CpAccount', entityId: account.id, newValues: { companyName } as never } as never }).catch(() => null)
    return account
  })

  // T3: list accounts
  app.get('/accounts', async (req) => {
    const r = req as unknown as { tenantId: string }
    const accounts = await prisma.cpAccount.findMany({ where: { tenantId: r.tenantId }, orderBy: { createdAt: 'desc' }, include: { _count: { select: { contacts: true, subscriptions: true, supportRequests: true } } } })
    return { accounts, total: accounts.length }
  })

  // T4: get account (360 view)
  app.get('/accounts/:aid', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { aid } = req.params as any
    return prisma.cpAccount.findFirstOrThrow({
      where: { id: aid, tenantId: r.tenantId },
      include: { contacts: true, subscriptions: true, invoiceDocs: { orderBy: { createdAt: 'desc' }, take: 10 }, supportRequests: { orderBy: { createdAt: 'desc' }, take: 10 } },
    })
  })

  // T5: update account
  app.patch('/accounts/:aid', async (req) => {
    const { aid } = req.params as any
    const data = req.body as any
    return prisma.cpAccount.update({ where: { id: aid }, data: { ...data, metadata: data.metadata as never } })
  })

  // T6: add contact
  app.post('/accounts/:aid/contacts', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { aid } = req.params as any
    const { name, email, role = 'member', isPrimary = false } = req.body as any
    if (isPrimary) await prisma.cpContact.updateMany({ where: { accountId: aid }, data: { isPrimary: false } })
    return prisma.cpContact.create({ data: { tenantId: r.tenantId, accountId: aid, name, email, role, isPrimary } })
  })

  // T7: list contacts
  app.get('/accounts/:aid/contacts', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { aid } = req.params as any
    const contacts = await prisma.cpContact.findMany({ where: { accountId: aid, tenantId: r.tenantId } })
    return { contacts, total: contacts.length }
  })

  // T8: start subscription (activates account, sets MRR)
  app.post('/accounts/:aid/subscriptions', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { aid } = req.params as any
    const { planRef, billingCycle = 'monthly', amount = 0 } = req.body as any
    const renewsAt = new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 86400000)
    const sub = await prisma.cpSubscription.create({
      data: { tenantId: r.tenantId, accountId: aid, planRef, billingCycle, amount, status: 'active', renewsAt },
    })
    const mrr = billingCycle === 'yearly' ? amount / 12 : amount
    await prisma.cpAccount.update({ where: { id: aid }, data: { status: 'active', mrr: { increment: Number(mrr.toFixed(2)) } } })
    await prisma.sysAuditLog.create({ data: { tenantId: r.tenantId, userId: r.userId, action: 'START_SUBSCRIPTION', module: 'customer-portal', entityType: 'CpSubscription', entityId: sub.id, newValues: { planRef, amount } as never } as never }).catch(() => null)
    return sub
  })

  // T9: cancel subscription (reduces MRR)
  app.post('/subscriptions/:sid/cancel', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { sid } = req.params as any
    const sub = await prisma.cpSubscription.findFirstOrThrow({ where: { id: sid, tenantId: r.tenantId } })
    if (sub.status === 'cancelled') return { error: 'already cancelled' }
    const updated = await prisma.cpSubscription.update({ where: { id: sid }, data: { status: 'cancelled', cancelledAt: new Date() } })
    const mrr = sub.billingCycle === 'yearly' ? sub.amount / 12 : sub.amount
    await prisma.cpAccount.update({ where: { id: sub.accountId }, data: { mrr: { decrement: Number(mrr.toFixed(2)) } } })
    return updated
  })

  // T10: list subscriptions
  app.get('/accounts/:aid/subscriptions', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { aid } = req.params as any
    const subscriptions = await prisma.cpSubscription.findMany({ where: { accountId: aid, tenantId: r.tenantId } })
    return { subscriptions, total: subscriptions.length }
  })

  // T11: generate invoice
  app.post('/accounts/:aid/invoices', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { aid } = req.params as any
    const { amount, currency = 'USD', lineItems = [], dueDays = 30 } = req.body as any
    const count = await prisma.cpInvoiceDoc.count({ where: { tenantId: r.tenantId } })
    const invoiceNo = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}-${Date.now() % 1000}`
    return prisma.cpInvoiceDoc.create({
      data: { tenantId: r.tenantId, accountId: aid, invoiceNo, amount, currency, status: 'open', dueDate: new Date(Date.now() + dueDays * 86400000), lineItems: lineItems as never },
    })
  })

  // T12: mark invoice paid
  app.post('/invoices/:iid/pay', async (req) => {
    const { iid } = req.params as any
    return prisma.cpInvoiceDoc.update({ where: { id: iid }, data: { status: 'paid', paidAt: new Date() } })
  })

  // T13: list invoices
  app.get('/accounts/:aid/invoices', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { aid } = req.params as any
    const invoices = await prisma.cpInvoiceDoc.findMany({ where: { accountId: aid, tenantId: r.tenantId }, orderBy: { createdAt: 'desc' } })
    return { invoices, total: invoices.length }
  })

  // T14: overdue invoices report (also flags accounts past-due)
  app.post('/invoices/mark-overdue', async (req) => {
    const r = req as unknown as { tenantId: string }
    const overdue = await prisma.cpInvoiceDoc.findMany({ where: { tenantId: r.tenantId, status: 'open', dueDate: { lt: new Date() } } })
    for (const inv of overdue) {
      await prisma.cpInvoiceDoc.update({ where: { id: inv.id }, data: { status: 'overdue' } })
      await prisma.cpAccount.update({ where: { id: inv.accountId }, data: { status: 'past-due' } }).catch(() => null)
    }
    return { marked: overdue.length }
  })

  // T15: create announcement
  app.post('/announcements', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { title, body, audience = 'all' } = req.body as any
    return prisma.cpAnnouncement.create({ data: { tenantId: r.tenantId, title, body, audience } })
  })

  // T16: publish announcement
  app.post('/announcements/:anid/publish', async (req) => {
    const { anid } = req.params as any
    return prisma.cpAnnouncement.update({ where: { id: anid }, data: { isPublished: true, publishedAt: new Date() } })
  })

  // T17: list announcements
  app.get('/announcements', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { published } = req.query as any
    const where: any = { tenantId: r.tenantId }
    if (published === 'true') where.isPublished = true
    const announcements = await prisma.cpAnnouncement.findMany({ where, orderBy: { createdAt: 'desc' } })
    return { announcements, total: announcements.length }
  })

  // T18: open support request
  app.post('/accounts/:aid/support', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { aid } = req.params as any
    const { subject, body, priority = 'normal' } = req.body as any
    return prisma.cpSupportRequest.create({
      data: { tenantId: r.tenantId, accountId: aid, subject, body, priority, status: 'open', replies: [] as never },
    })
  })

  // T19: reply to support request
  app.post('/support/:srid/reply', async (req) => {
    const r = req as unknown as { tenantId: string; userId: string }
    const { srid } = req.params as any
    const { message, from = 'support' } = req.body as any
    const sr = await prisma.cpSupportRequest.findFirstOrThrow({ where: { id: srid, tenantId: r.tenantId } })
    const replies = [...((sr.replies as any[]) ?? []), { from, message, at: new Date().toISOString() }]
    return prisma.cpSupportRequest.update({ where: { id: srid }, data: { replies: replies as never, status: 'in-progress' } })
  })

  // T20: resolve support request
  app.post('/support/:srid/resolve', async (req) => {
    const { srid } = req.params as any
    return prisma.cpSupportRequest.update({ where: { id: srid }, data: { status: 'resolved', resolvedAt: new Date() } })
  })

  // T21: list support requests
  app.get('/support', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { status } = req.query as any
    const where: any = { tenantId: r.tenantId }
    if (status) where.status = status
    const requests = await prisma.cpSupportRequest.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100, include: { account: { select: { companyName: true } } } })
    return { requests, total: requests.length }
  })

  // T22: revenue dashboard
  app.get('/dashboard', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [accounts, openInvoices, openSupport] = await Promise.all([
      prisma.cpAccount.findMany({ where: { tenantId: r.tenantId } }),
      prisma.cpInvoiceDoc.aggregate({ where: { tenantId: r.tenantId, status: { in: ['open', 'overdue'] } }, _sum: { amount: true }, _count: { _all: true } }),
      prisma.cpSupportRequest.count({ where: { tenantId: r.tenantId, status: { in: ['open', 'in-progress'] } } }),
    ])
    const totalMrr = Number(accounts.reduce((s, a) => s + a.mrr, 0).toFixed(2))
    return {
      accounts: accounts.length,
      activeAccounts: accounts.filter(a => a.status === 'active').length,
      trialAccounts: accounts.filter(a => a.status === 'trial').length,
      pastDue: accounts.filter(a => a.status === 'past-due').length,
      totalMrr, arr: Number((totalMrr * 12).toFixed(2)),
      outstandingAmount: openInvoices._sum.amount ?? 0, outstandingInvoices: openInvoices._count._all,
      openSupport,
    }
  })

  // T23: stats
  app.get('/stats', async (req) => {
    const r = req as unknown as { tenantId: string }
    const [accounts, contacts, subscriptions, invoices, announcements, support] = await Promise.all([
      prisma.cpAccount.count({ where: { tenantId: r.tenantId } }),
      prisma.cpContact.count({ where: { tenantId: r.tenantId } }),
      prisma.cpSubscription.count({ where: { tenantId: r.tenantId } }),
      prisma.cpInvoiceDoc.count({ where: { tenantId: r.tenantId } }),
      prisma.cpAnnouncement.count({ where: { tenantId: r.tenantId } }),
      prisma.cpSupportRequest.count({ where: { tenantId: r.tenantId } }),
    ])
    return { accounts, contacts, subscriptions, invoices, announcements, supportRequests: support }
  })

  // T24: update health score
  app.post('/accounts/:aid/health', async (req) => {
    const r = req as unknown as { tenantId: string }
    const { aid } = req.params as any
    const [openSupport, overdue, subs] = await Promise.all([
      prisma.cpSupportRequest.count({ where: { accountId: aid, status: { in: ['open', 'in-progress'] } } }),
      prisma.cpInvoiceDoc.count({ where: { accountId: aid, status: 'overdue' } }),
      prisma.cpSubscription.count({ where: { accountId: aid, status: 'active' } }),
    ])
    const score = Math.max(0, Math.min(100, 70 + subs * 15 - openSupport * 10 - overdue * 20))
    const account = await prisma.cpAccount.update({ where: { id: aid }, data: { healthScore: score } })
    return { healthScore: account.healthScore, factors: { activeSubscriptions: subs, openSupport, overdueInvoices: overdue } }
  })

  // T25: delete contact
  app.delete('/contacts/:cid', async (req) => {
    const { cid } = req.params as any
    await prisma.cpContact.delete({ where: { id: cid } })
    return { success: true }
  })

  // T26: delete announcement
  app.delete('/announcements/:anid', async (req) => {
    const { anid } = req.params as any
    await prisma.cpAnnouncement.delete({ where: { id: anid } })
    return { success: true }
  })

  // T27: delete support request
  app.delete('/support/:srid', async (req) => {
    const { srid } = req.params as any
    await prisma.cpSupportRequest.delete({ where: { id: srid } })
    return { success: true }
  })

  // T28: delete account
  app.delete('/accounts/:aid', async (req) => {
    const { aid } = req.params as any
    await prisma.cpAccount.delete({ where: { id: aid } })
    return { success: true }
  })
}
