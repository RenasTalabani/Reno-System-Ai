import type { FastifyInstance } from 'fastify'
import {
  chat,
  listSessions,
  getSession,
  deleteSession,
  listCommands,
  approveCommand,
  rejectCommand,
} from '../../../brain/workspace/workspace-assistant.service.js'
import {
  getMemory,
  setMemory,
  deleteMemory,
} from '../../../brain/workspace/workspace-memory.service.js'
import { searchAll } from '../../../brain/workspace/workspace-search.service.js'

export async function workspaceRoutes(app: FastifyInstance) {
  // POST /chat — main chat endpoint
  app.post<{
    Body: { tenantId: string; userId: string; message: string; sessionId?: string; provider?: string }
  }>('/chat', async (req, reply) => {
    const { tenantId, userId, message, sessionId, provider } = req.body
    if (!tenantId || !userId || !message?.trim()) {
      return reply.status(400).send({ error: 'tenantId, userId, message required' })
    }
    const result = await chat({ tenantId, userId, message, sessionId, provider })
    return reply.send(result)
  })

  // GET /sessions?tenantId=&userId= — list sessions
  app.get<{ Querystring: { tenantId: string; userId: string } }>('/sessions', async (req, reply) => {
    const { tenantId, userId } = req.query
    if (!tenantId || !userId) return reply.status(400).send({ error: 'tenantId and userId required' })
    const sessions = await listSessions(tenantId, userId)
    return reply.send({ sessions })
  })

  // GET /sessions/:id?tenantId= — get session with messages
  app.get<{ Params: { id: string }; Querystring: { tenantId: string } }>('/sessions/:id', async (req, reply) => {
    const session = await getSession(req.params.id, req.query.tenantId)
    if (!session) return reply.status(404).send({ error: 'Session not found' })
    return reply.send({ session })
  })

  // DELETE /sessions/:id — delete session
  app.delete<{ Params: { id: string }; Body: { tenantId: string } }>('/sessions/:id', async (req, reply) => {
    await deleteSession(req.params.id, req.body.tenantId)
    return reply.send({ ok: true })
  })

  // GET /memory?tenantId=&userId= — get workspace memory
  app.get<{ Querystring: { tenantId: string; userId: string } }>('/memory', async (req, reply) => {
    const { tenantId, userId } = req.query
    if (!tenantId || !userId) return reply.status(400).send({ error: 'tenantId and userId required' })
    const memories = await getMemory(tenantId, userId)
    return reply.send({ memories })
  })

  // POST /memory — save memory item
  app.post<{
    Body: { tenantId: string; userId: string; key: string; value: unknown; scope?: string; source?: string; ttlDays?: number }
  }>('/memory', async (req, reply) => {
    const { tenantId, userId, key, value, scope, source, ttlDays } = req.body
    if (!tenantId || !userId || !key || value === undefined) {
      return reply.status(400).send({ error: 'tenantId, userId, key, value required' })
    }
    const mem = await setMemory({ tenantId, userId, key, value, scope, source, ttlDays })
    return reply.send({ memory: mem })
  })

  // DELETE /memory/:key — forget memory item
  app.delete<{ Params: { key: string }; Body: { tenantId: string; userId: string } }>('/memory/:key', async (req, reply) => {
    await deleteMemory(req.body.tenantId, req.body.userId, req.params.key)
    return reply.send({ ok: true })
  })

  // POST /search — universal search
  app.post<{ Body: { tenantId: string; query: string } }>('/search', async (req, reply) => {
    const { tenantId, query } = req.body
    if (!tenantId || !query?.trim()) return reply.status(400).send({ error: 'tenantId and query required' })
    const results = await searchAll(tenantId, query)
    const total = Object.values(results).reduce((sum, arr) => sum + arr.length, 0)
    return reply.send({ results, total })
  })

  // GET /commands?tenantId=&userId=&status= — command history
  app.get<{ Querystring: { tenantId: string; userId?: string; status?: string } }>('/commands', async (req, reply) => {
    const { tenantId, userId, status } = req.query
    if (!tenantId) return reply.status(400).send({ error: 'tenantId required' })
    const commands = await listCommands(tenantId, userId, status)
    return reply.send({ commands })
  })

  // POST /commands/:id/approve — approve command
  app.post<{ Params: { id: string }; Body: { tenantId: string; userId: string } }>('/commands/:id/approve', async (req, reply) => {
    const { tenantId, userId } = req.body
    if (!tenantId || !userId) return reply.status(400).send({ error: 'tenantId and userId required' })
    const command = await approveCommand(req.params.id, tenantId, userId)
    return reply.send({ command })
  })

  // POST /commands/:id/reject — reject command
  app.post<{ Params: { id: string }; Body: { tenantId: string } }>('/commands/:id/reject', async (req, reply) => {
    const command = await rejectCommand(req.params.id, req.body.tenantId)
    return reply.send({ command })
  })
}
