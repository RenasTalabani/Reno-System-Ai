import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

export async function sdCategoryRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // GET /helpdesk/categories
  app.get('/', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any

    const categories = await prisma.sdCategory.findMany({
      where: { tenantId, deletedAt: null, parentId: q.parentId ?? null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        children: {
          where: { deletedAt: null, isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
        _count: { select: { tickets: { where: { deletedAt: null } } } },
      },
    })

    return reply.send(buildSuccessResponse(categories))
  })

  // GET /helpdesk/categories/all — flat list
  app.get('/all', async (request, reply) => {
    const { tenantId } = request as any

    const categories = await prisma.sdCategory.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    })

    return reply.send(buildSuccessResponse(categories))
  })

  // POST /helpdesk/categories
  app.post('/', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any

    const category = await prisma.sdCategory.create({
      data: {
        tenantId, name: body.name, description: body.description,
        icon: body.icon, color: body.color ?? '#6366f1',
        parentId: body.parentId, sortOrder: body.sortOrder ?? 0,
        createdBy: userId,
      },
    })

    return reply.status(201).send(buildSuccessResponse(category))
  })

  // PUT /helpdesk/categories/:id
  app.put('/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const body = request.body as any

    const existing = await prisma.sdCategory.findFirst({ where: { id, tenantId, deletedAt: null } })
    if (!existing) throw new RenoError(ErrorCode.NOT_FOUND, 'Category not found', 404)

    const updated = await prisma.sdCategory.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        description: body.description ?? undefined,
        icon: body.icon ?? undefined,
        color: body.color ?? undefined,
        parentId: body.parentId ?? undefined,
        sortOrder: body.sortOrder ?? undefined,
        isActive: body.isActive ?? undefined,
        updatedBy: userId,
      },
    })

    return reply.send(buildSuccessResponse(updated))
  })

  // DELETE /helpdesk/categories/:id
  app.delete('/:id', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any

    await prisma.sdCategory.updateMany({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false, updatedBy: userId },
    })

    return reply.send(buildSuccessResponse({ id }))
  })
}
