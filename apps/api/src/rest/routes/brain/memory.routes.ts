import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'

export async function brainMemoryRoutes(app: FastifyInstance) {
  // GET /brain/memory
  app.get('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { scope, type, page = '1', limit = '20' } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = { tenantId, isActive: true }
    if (scope) where.scope = scope
    else where.scope = { in: ['global', 'user'] }
    if (type) where.type = type
    if (where.scope === 'user' || scope === 'user') where.userId = userId

    const [items, total] = await Promise.all([
      prisma.brainMemory.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.brainMemory.count({ where }),
    ])

    return reply.send({ success: true, data: items, meta: { pagination: { total, page: Number(page), limit: Number(limit) } } })
  })

  // POST /brain/memory — store a memory
  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any

    const memory = await prisma.brainMemory.upsert({
      where: {
        // Use a derived unique constraint approach
        id: (await prisma.brainMemory.findFirst({
          where: { tenantId, scope: body.scope ?? 'user', key: body.key, userId: body.scope === 'user' ? userId : null },
        }))?.id ?? '00000000-0000-0000-0000-000000000000',
      },
      create: {
        tenantId,
        userId: body.scope === 'user' ? userId : undefined,
        conversationId: body.conversationId,
        type: body.type ?? 'fact',
        scope: body.scope ?? 'user',
        key: body.key,
        value: body.value,
        confidence: body.confidence,
        source: body.source ?? 'user',
        expiresAt: body.ttlDays ? new Date(Date.now() + body.ttlDays * 86400000) : undefined,
      },
      update: {
        value: body.value,
        confidence: body.confidence,
        expiresAt: body.ttlDays ? new Date(Date.now() + body.ttlDays * 86400000) : undefined,
        isActive: true,
      },
    })

    return reply.code(201).send({ success: true, data: memory })
  })

  // DELETE /brain/memory/:id
  app.delete('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any

    await prisma.brainMemory.updateMany({ where: { id, tenantId }, data: { isActive: false } })
    return reply.send({ success: true })
  })
}
