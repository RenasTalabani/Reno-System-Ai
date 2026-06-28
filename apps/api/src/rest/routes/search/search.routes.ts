import type { FastifyInstance } from 'fastify'
import { buildSuccessResponse } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'
import { semanticSearch } from '../../../search/semantic.service.js'

export async function searchRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // GET /v1/search?q=...&limit=20&types=knowledge_article,crm_contact
  app.get('/', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    if (!q.q || String(q.q).trim().length < 2) {
      return reply.send(buildSuccessResponse([]))
    }
    const limit = Math.min(50, parseInt(q.limit ?? '20'))
    const entityTypes = q.types ? String(q.types).split(',') : undefined

    const results = await semanticSearch(tenantId, String(q.q), { limit, entityTypes: entityTypes as any })
    return reply.send(buildSuccessResponse(results, { query: q.q, total: results.length }))
  })

  // POST /v1/search/index — index a new entity for search (internal use)
  app.post('/index', async (request, reply) => {
    const { tenantId } = request as any
    const body = request.body as any
    const { indexEntity } = await import('../../../search/semantic.service.js')
    await indexEntity(tenantId, body.entityType, body.entityId, body.content, body.metadata ?? {}, body.embedding)
    return reply.status(202).send(buildSuccessResponse({ queued: true }))
  })
}
