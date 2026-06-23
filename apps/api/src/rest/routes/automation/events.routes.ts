import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { SYSTEM_EVENTS, getEventMeta } from '../../../automation/events.js'
import { fireEvent } from '../../../automation/engine.js'

export async function autoEventRoutes(app: FastifyInstance) {
  // GET /automation/events — list all event types
  app.get('/', async (_req, reply) => {
    const events = Object.entries(SYSTEM_EVENTS).map(([type, meta]) => ({
      type,
      label: meta.label,
      module: meta.module,
      description: meta.description,
    }))
    return reply.send({ success: true, data: events })
  })

  // GET /automation/events/modules — events grouped by module
  app.get('/modules', async (_req, reply) => {
    const grouped: Record<string, any[]> = {}
    for (const [type, meta] of Object.entries(SYSTEM_EVENTS)) {
      if (!grouped[meta.module]) grouped[meta.module] = []
      grouped[meta.module]!.push({ type, label: meta.label, description: meta.description })
    }
    return reply.send({ success: true, data: grouped })
  })

  // POST /automation/events/fire — manually fire a system event (for testing)
  app.post('/fire', async (req, reply) => {
    const { tenantId, userId } = req as any
    const { eventType, payload } = req.body as any

    const meta = getEventMeta(eventType)
    if (!meta) return reply.code(400).send({ success: false, error: `Unknown event type: ${eventType}` })

    await fireEvent(tenantId, eventType, payload ?? {}, userId)

    return reply.send({ success: true, data: { eventType, fired: true } })
  })
}
