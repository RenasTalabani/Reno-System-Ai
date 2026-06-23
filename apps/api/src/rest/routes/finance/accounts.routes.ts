import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function finAccountRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { type, search, parentId } = req.query as any
    const where: any = { tenantId, deletedAt: null }
    if (type) where.type = type
    if (parentId === 'null') where.parentId = null
    else if (parentId) where.parentId = parentId
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
    ]
    const accounts = await prisma.finAccount.findMany({
      where,
      include: { _count: { select: { children: true, journalLines: true } } },
      orderBy: [{ code: 'asc' }],
    })
    return reply.send({ success: true, data: accounts })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any

    // Compute level from parent
    let level = 1
    if (body.parentId) {
      const parent = await prisma.finAccount.findFirst({ where: { id: body.parentId, tenantId }, select: { level: true } })
      level = (parent?.level ?? 0) + 1
    }

    const account = await prisma.finAccount.create({
      data: {
        tenantId, code: body.code, name: body.name,
        type: body.type, category: body.category,
        normalBalance: body.normalBalance ?? (body.type === 'asset' || body.type === 'expense' ? 'debit' : 'credit'),
        parentId: body.parentId, level,
        isDetail: body.isDetail ?? true,
        isBankAccount: body.isBankAccount ?? false,
        isSystem: false,
        currency: body.currency, description: body.description,
        createdBy: userId, updatedBy: userId,
      },
    })
    return reply.code(201).send({ success: true, data: account })
  })

  app.get('/tree', async (req, reply) => {
    const { tenantId } = req as any
    const accounts = await prisma.finAccount.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: [{ code: 'asc' }],
    })
    // Build tree
    const map = new Map(accounts.map(a => [a.id, { ...a, children: [] as any[] }]))
    const roots: any[] = []
    for (const a of map.values()) {
      if (a.parentId && map.has(a.parentId)) {
        map.get(a.parentId)!.children.push(a)
      } else {
        roots.push(a)
      }
    }
    return reply.send({ success: true, data: roots })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const account = await prisma.finAccount.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { children: { where: { deletedAt: null }, orderBy: { code: 'asc' } } },
    })
    if (!account) return reply.code(404).send({ success: false, error: 'Not found' })
    return reply.send({ success: true, data: account })
  })

  app.put('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any
    const allowed = ['name','description','currency','isActive']
    const data: any = { updatedBy: userId }
    for (const k of allowed) if (body[k] !== undefined) data[k] = body[k]
    await prisma.finAccount.updateMany({ where: { id, tenantId, deletedAt: null, isSystem: false }, data })
    return reply.send({ success: true })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    // Never delete system accounts or accounts with journal lines
    const account = await prisma.finAccount.findFirst({ where: { id, tenantId }, select: { isSystem: true, _count: { select: { journalLines: true, children: true } } } })
    if (!account) return reply.code(404).send({ success: false, error: 'Not found' })
    if (account.isSystem) return reply.code(400).send({ success: false, error: 'System accounts cannot be deleted' })
    if (account._count.journalLines > 0) return reply.code(400).send({ success: false, error: 'Account has journal entries and cannot be deleted' })
    if (account._count.children > 0) return reply.code(400).send({ success: false, error: 'Account has child accounts' })
    await prisma.finAccount.updateMany({ where: { id, tenantId }, data: { deletedAt: new Date(), updatedBy: userId } })
    return reply.send({ success: true })
  })
}
