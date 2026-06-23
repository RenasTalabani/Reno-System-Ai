import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function invCategoryRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any
    const { parentId, search } = req.query as any
    const where: any = { tenantId, deletedAt: null }
    if (parentId === 'null') where.parentId = null
    else if (parentId) where.parentId = parentId
    if (search) where.name = { contains: search, mode: 'insensitive' }
    const items = await prisma.invCategory.findMany({
      where,
      include: { _count: { select: { children: true, products: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
    return reply.send({ success: true, data: items })
  })

  app.get('/tree', async (req, reply) => {
    const { tenantId } = req as any
    const all = await prisma.invCategory.findMany({
      where: { tenantId, deletedAt: null },
      include: { _count: { select: { products: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
    const map = new Map(all.map(c => [c.id, { ...c, children: [] as any[] }]))
    const roots: any[] = []
    map.forEach(c => {
      if (c.parentId) map.get(c.parentId)?.children.push(c)
      else roots.push(c)
    })
    return reply.send({ success: true, data: roots })
  })

  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { name, code, description, parentId, sortOrder } = req.body as any
    const item = await prisma.invCategory.create({
      data: { tenantId, name, code, description, parentId, sortOrder: sortOrder ?? 0, createdBy: userId, updatedBy: userId },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'inventory', entityType: 'InvCategory', entityId: item.id, newValues: { name } } })
    return reply.code(201).send({ success: true, data: item })
  })

  app.get('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const item = await prisma.invCategory.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { children: { where: { deletedAt: null } }, _count: { select: { products: true } } },
    })
    if (!item) return reply.code(404).send({ success: false, error: 'Category not found' })
    return reply.send({ success: true, data: item })
  })

  app.patch('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const body = req.body as any
    const allowed = ['name', 'code', 'description', 'parentId', 'sortOrder', 'isActive']
    const data: any = { updatedBy: userId }
    allowed.forEach(k => { if (k in body) data[k] = body[k] })
    const item = await prisma.invCategory.update({ where: { id }, data })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE', module: 'inventory', entityType: 'InvCategory', entityId: id, newValues: data } })
    return reply.send({ success: true, data: item })
  })

  app.delete('/:id', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { id } = req.params as any
    const children = await prisma.invCategory.count({ where: { parentId: id, deletedAt: null } })
    if (children > 0) return reply.code(400).send({ success: false, error: 'Category has subcategories' })
    await prisma.invCategory.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedBy: userId } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'DELETE', module: 'inventory', entityType: 'InvCategory', entityId: id, newValues: {} } })
    return reply.send({ success: true })
  })
}
