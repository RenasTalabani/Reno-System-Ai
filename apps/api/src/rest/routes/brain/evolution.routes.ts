import type { FastifyInstance } from 'fastify'
import { businessMemoryService, type MemoryType } from '../../../brain/business-memory.service.js'
import { learningService, type FeedbackOutcome, type FeedbackSourceType } from '../../../brain/learning.service.js'
import { briefingService } from '../../../brain/briefing.service.js'
import { boardSimulationService } from '../../../brain/board-simulation.service.js'
import { semanticSearchService } from '../../../brain/semantic-search.service.js'
import { requireAuth } from '../../middleware/auth.js'

export async function brainEvolutionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Business Memory ────────────────────────────────────────────────────────

  app.get('/memory/business', {
    schema: { tags: ['Brain — Memory'], summary: 'List business memories' },
  }, async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { type, entityId, limit, offset } = req.query as {
      type?: MemoryType; entityId?: string; limit?: number; offset?: number
    }
    const memories = await businessMemoryService.list(tenantId, type, entityId, limit ?? 50, offset ?? 0)
    return reply.send({ memories, total: memories.length })
  })

  app.post('/memory/business', {
    schema: { tags: ['Brain — Memory'], summary: 'Create business memory' },
  }, async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const body = req.body as Parameters<typeof businessMemoryService.create>[1]
    const memory = await businessMemoryService.create(tenantId, body)
    return reply.code(201).send(memory)
  })

  app.get('/memory/business/context', {
    schema: { tags: ['Brain — Memory'], summary: 'Get context memories for entity' },
  }, async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { entityType, entityId } = req.query as { entityType?: string; entityId?: string }
    const context = await businessMemoryService.getContext(tenantId, entityType, entityId)
    return reply.send({ context })
  })

  app.get('/memory/business/:id', {
    schema: { tags: ['Brain — Memory'], summary: 'Get business memory by ID' },
  }, async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const memories = await businessMemoryService.findByEntity(tenantId, '', id)
    return reply.send(memories[0] ?? null)
  })

  app.put('/memory/business/:id', {
    schema: { tags: ['Brain — Memory'], summary: 'Update business memory' },
  }, async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const body = req.body as Parameters<typeof businessMemoryService.update>[2]
    const updated = await businessMemoryService.update(id, tenantId, body)
    return reply.send(updated)
  })

  app.delete('/memory/business/:id', {
    schema: { tags: ['Brain — Memory'], summary: 'Delete business memory' },
  }, async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    await businessMemoryService.softDelete(id, tenantId)
    return reply.code(204).send()
  })

  // ── AI Feedback & Learning ─────────────────────────────────────────────────

  app.post('/feedback', {
    schema: { tags: ['Brain — Learning'], summary: 'Submit feedback on an AI output' },
  }, async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as {
      sourceType: FeedbackSourceType
      sourceId: string
      rating: number
      outcome: FeedbackOutcome
      feedbackText?: string
      rejectionReason?: string
      implementedResult?: string
      confidenceAtTime: number
      actualAccurate?: boolean
    }
    const feedback = await learningService.submitFeedback(tenantId, { ...body, submittedBy: userId })
    return reply.code(201).send(feedback)
  })

  app.get('/accuracy', {
    schema: { tags: ['Brain — Learning'], summary: 'Get AI accuracy summary' },
  }, async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const summary = await learningService.getAccuracySummary(tenantId)
    return reply.send(summary)
  })

  app.get('/accuracy/trend', {
    schema: { tags: ['Brain — Learning'], summary: 'Get AI accuracy trend over time' },
  }, async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { period, limit } = req.query as { period?: string; limit?: number }
    const trend = await learningService.getAccuracyTrend(tenantId, period ?? 'daily', limit ?? 30)
    return reply.send({ trend })
  })

  // ── Daily Briefing ─────────────────────────────────────────────────────────

  app.get('/briefing/today', {
    schema: { tags: ['Brain — Briefing'], summary: 'Get today\'s AI briefing (generate if missing)' },
  }, async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    let briefing = await briefingService.getTodayBriefing(tenantId)
    if (!briefing) {
      briefing = await briefingService.generateDailyBriefing(tenantId)
    }
    return reply.send(briefing)
  })

  app.post('/briefing/generate', {
    schema: { tags: ['Brain — Briefing'], summary: 'Force-generate today\'s briefing' },
  }, async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const briefing = await briefingService.generateDailyBriefing(tenantId)
    return reply.code(201).send(briefing)
  })

  app.get('/briefing', {
    schema: { tags: ['Brain — Briefing'], summary: 'List historical briefings' },
  }, async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { limit } = req.query as { limit?: number }
    const briefings = await briefingService.listBriefings(tenantId, limit ?? 30)
    return reply.send({ briefings })
  })

  app.post('/briefing/:id/viewed', {
    schema: { tags: ['Brain — Briefing'], summary: 'Mark briefing as viewed' },
  }, async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const updated = await briefingService.markViewed(id, userId)
    return reply.send(updated)
  })

  // ── Board Meeting Simulator ────────────────────────────────────────────────

  app.get('/board', {
    schema: { tags: ['Brain — Board'], summary: 'List board simulations' },
  }, async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { limit } = req.query as { limit?: number }
    const sessions = await boardSimulationService.list(tenantId, limit ?? 20)
    return reply.send({ sessions })
  })

  app.post('/board', {
    schema: { tags: ['Brain — Board'], summary: 'Create board simulation session' },
  }, async (req, reply) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { sessionName, agenda } = req.body as { sessionName: string; agenda: string[] }
    const session = await boardSimulationService.create(tenantId, userId, sessionName, agenda)
    return reply.code(201).send(session)
  })

  app.get('/board/:id', {
    schema: { tags: ['Brain — Board'], summary: 'Get board simulation' },
  }, async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const session = await boardSimulationService.get(id, tenantId)
    if (!session) return reply.code(404).send({ error: 'Session not found' })
    return reply.send(session)
  })

  app.post('/board/:id/simulate', {
    schema: { tags: ['Brain — Board'], summary: 'Run AI board meeting simulation' },
  }, async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const result = await boardSimulationService.simulate(id, tenantId)
    return reply.send(result)
  })

  // ── Semantic Search ────────────────────────────────────────────────────────

  app.get('/search/semantic', {
    schema: { tags: ['Brain — Search'], summary: 'Keyword + semantic search across all modules' },
  }, async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { q, type, limit } = req.query as { q: string; type?: string; limit?: number }
    if (!q || q.length < 2) {
      return reply.code(400).send({ error: 'Query must be at least 2 characters' })
    }
    // Use keyword search (semantic requires external embedding API)
    const results = await semanticSearchService.keywordSearch(tenantId, q, limit ?? 10)
    return reply.send({ query: q, results })
  })

  app.post('/embeddings', {
    schema: { tags: ['Brain — Search'], summary: 'Index entity for semantic search' },
  }, async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { entityType, entityId, content, embedding, chunkIndex } = req.body as {
      entityType: string; entityId: string; content: string
      embedding: number[]; chunkIndex?: number
    }
    const result = await semanticSearchService.index(tenantId, { entityType, entityId, content, chunkIndex }, embedding)
    return reply.code(201).send(result)
  })

  app.delete('/embeddings/:entityType/:entityId', {
    schema: { tags: ['Brain — Search'], summary: 'Remove entity from semantic index' },
  }, async (req, reply) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { entityType, entityId } = req.params as { entityType: string; entityId: string }
    await semanticSearchService.deleteEntityEmbeddings(tenantId, entityType, entityId)
    return reply.code(204).send()
  })
}
