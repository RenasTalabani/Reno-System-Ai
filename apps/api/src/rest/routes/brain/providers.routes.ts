import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'

export async function brainProviderRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // GET /brain/providers
  app.get('/', async (req, reply) => {
    const { tenantId } = req as any

    const providers = await prisma.brainProviderConfig.findMany({
      where: { tenantId },
      select: {
        id: true, provider: true, name: true, model: true, baseUrl: true,
        isDefault: true, isActive: true, createdAt: true,
        // Never expose apiKey in list
        apiKey: false,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    })

    return reply.send({ success: true, data: providers })
  })

  // POST /brain/providers
  app.post('/', async (req, reply) => {
    const { tenantId, userId } = req as any
    const body = req.body as any

    // If isDefault, unset others
    if (body.isDefault) {
      await prisma.brainProviderConfig.updateMany({ where: { tenantId }, data: { isDefault: false } })
    }

    const config = await prisma.brainProviderConfig.create({
      data: {
        tenantId,
        provider: body.provider,
        name: body.name,
        apiKey: body.apiKey,
        baseUrl: body.baseUrl,
        model: body.model,
        isDefault: body.isDefault ?? false,
        config: body.config,
        createdBy: userId,
      },
    })

    return reply.code(201).send({
      success: true,
      data: { ...config, apiKey: config.apiKey ? '***configured***' : null },
    })
  })

  // PATCH /brain/providers/:id
  app.patch('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any
    const body = req.body as any

    const existing = await prisma.brainProviderConfig.findFirst({ where: { id, tenantId } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Provider not found' })

    if (body.isDefault) {
      await prisma.brainProviderConfig.updateMany({ where: { tenantId, id: { not: id } }, data: { isDefault: false } })
    }

    const updated = await prisma.brainProviderConfig.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        apiKey: body.apiKey ?? existing.apiKey,
        baseUrl: body.baseUrl !== undefined ? body.baseUrl : existing.baseUrl,
        model: body.model ?? existing.model,
        isDefault: body.isDefault !== undefined ? body.isDefault : existing.isDefault,
        isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
        config: body.config !== undefined ? body.config : existing.config,
      },
    })

    return reply.send({
      success: true,
      data: { ...updated, apiKey: updated.apiKey ? '***configured***' : null },
    })
  })

  // DELETE /brain/providers/:id
  app.delete('/:id', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any

    await prisma.brainProviderConfig.deleteMany({ where: { id, tenantId } })
    return reply.send({ success: true })
  })

  // POST /brain/providers/:id/test — test provider connection
  app.post('/:id/test', async (req, reply) => {
    const { tenantId } = req as any
    const { id } = req.params as any

    const config = await prisma.brainProviderConfig.findFirst({ where: { id, tenantId } })
    if (!config) return reply.code(404).send({ success: false, error: 'Provider not found' })

    if (!config.apiKey) {
      return reply.send({ success: false, data: { status: 'no_api_key', message: 'No API key configured' } })
    }

    try {
      const { callAI } = await import('../../../brain/provider.js')
      const response = await callAI(
        [{ role: 'user', content: 'Say "OK" and nothing else.' }],
        { maxTokens: 10 },
        { provider: config.provider as any, apiKey: config.apiKey ?? undefined, baseUrl: config.baseUrl ?? undefined, model: config.model }
      )
      return reply.send({ success: true, data: { status: 'connected', model: response.model, latencyMs: response.latencyMs } })
    } catch (err: any) {
      return reply.send({ success: false, data: { status: 'error', message: err.message } })
    }
  })
}
