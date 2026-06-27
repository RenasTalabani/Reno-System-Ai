import type { FastifyInstance } from 'fastify'
import { createSchedule, listSchedules, updateSchedule, deleteSchedule } from '../../../brain/work/schedule.service.js'

export async function aiWorkScheduleRoutes(app: FastifyInstance) {
  // GET /v1/ai-work/schedules
  app.get('/', async (req, reply) => {
    const tenantId = (req as any).tenantId
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' })
    const schedules = await listSchedules(tenantId)
    return reply.send({ schedules })
  })

  // POST /v1/ai-work/schedules
  app.post('/', async (req, reply) => {
    const tenantId = (req as any).tenantId
    const userId = (req as any).userId
    if (!tenantId || !userId) return reply.status(401).send({ error: 'Unauthorized' })

    const { title, request, provider, agentSlug, intervalType, intervalValue, dayOfWeek, hourOfDay } = req.body as any
    if (!title || !request || !intervalType) {
      return reply.status(400).send({ error: 'title, request, and intervalType are required' })
    }

    const schedule = await createSchedule({
      tenantId, userId, title, request, provider, agentSlug,
      intervalType, intervalValue, dayOfWeek, hourOfDay,
    })
    return reply.status(201).send({ schedule })
  })

  // PATCH /v1/ai-work/schedules/:id
  app.patch('/:id', async (req, reply) => {
    const tenantId = (req as any).tenantId
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' })
    const { id } = req.params as { id: string }
    const { title, request, isEnabled, intervalType, dayOfWeek, hourOfDay } = req.body as any
    const schedule = await updateSchedule(tenantId, id, { title, request, isEnabled, intervalType, dayOfWeek, hourOfDay })
    if (!schedule) return reply.status(404).send({ error: 'Schedule not found' })
    return reply.send({ schedule })
  })

  // DELETE /v1/ai-work/schedules/:id
  app.delete('/:id', async (req, reply) => {
    const tenantId = (req as any).tenantId
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' })
    const { id } = req.params as { id: string }
    const deleted = await deleteSchedule(tenantId, id)
    if (!deleted) return reply.status(404).send({ error: 'Schedule not found' })
    return reply.send({ success: true })
  })
}
