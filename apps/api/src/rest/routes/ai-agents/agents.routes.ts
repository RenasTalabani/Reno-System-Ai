import type { FastifyInstance } from 'fastify'
import { listAgents, getAgentBySlug, DEFAULT_AGENTS } from '../../../brain/collab/agents.service.js'
import { runMultiAgentTask, getCollabDashboard } from '../../../brain/collab/orchestrator.service.js'
import { listWorkspaces } from '../../../brain/collab/workspace.service.js'
import { listDelegations } from '../../../brain/collab/delegation.service.js'
import { listMeetings, getMeeting, createMeeting } from '../../../brain/collab/meeting.service.js'
import { prisma } from '@reno/database'

export async function aiAgentRoutes(app: FastifyInstance) {
  // GET /v1/ai-agents — list all agents
  app.get('/', async (req, reply) => {
    const tenantId = (req as any).tenantId
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' })
    const agents = await listAgents(tenantId)
    return reply.send({ agents, total: agents.length })
  })

  // POST /v1/ai-agents — create custom agent (delegates to brain_agents)
  app.post('/', async (req, reply) => {
    const tenantId = (req as any).tenantId
    const userId = (req as any).userId
    if (!tenantId || !userId) return reply.status(401).send({ error: 'Unauthorized' })
    const { slug, name, title, description, systemPrompt, modules, color, iconName } = req.body as any
    if (!slug || !name) return reply.status(400).send({ error: 'slug and name are required' })
    const agent = await prisma.brainAgent.create({
      data: { tenantId, slug, name, title: title ?? name, description, systemPrompt, modules, color, iconName, createdBy: userId },
    })
    return reply.status(201).send({ agent })
  })

  // GET /v1/ai-agents/:id
  app.get('/:slug', async (req, reply) => {
    const tenantId = (req as any).tenantId
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' })
    const { slug } = req.params as { slug: string }
    const agent = await getAgentBySlug(slug, tenantId)
    if (!agent) return reply.status(404).send({ error: 'Agent not found' })
    return reply.send({ agent })
  })

  // GET /v1/ai-agents/teams
  app.get('/teams/list', async (req, reply) => {
    const tenantId = (req as any).tenantId
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' })
    const teams = await prisma.aiAgentTeam.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return reply.send({ teams })
  })

  // POST /v1/ai-agents/teams
  app.post('/teams/create', async (req, reply) => {
    const tenantId = (req as any).tenantId
    const userId = (req as any).userId
    if (!tenantId || !userId) return reply.status(401).send({ error: 'Unauthorized' })
    const { name, purpose, supervisorSlug, agentSlugs, taskId } = req.body as any
    if (!name || !purpose) return reply.status(400).send({ error: 'name and purpose are required' })
    const team = await prisma.aiAgentTeam.create({
      data: {
        tenantId, name, purpose,
        supervisorSlug: supervisorSlug ?? 'ceo',
        agentSlugs: (agentSlugs ?? ['ceo']) as any,
        taskId, createdBy: userId,
      },
    })
    return reply.status(201).send({ team })
  })

  // GET /v1/ai-agents/conversations — list conversations
  app.get('/conversations/list', async (req, reply) => {
    const tenantId = (req as any).tenantId
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' })
    const { limit } = req.query as { limit?: string }
    const conversations = await prisma.aiAgentConversation.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit, 10) : 50,
    })
    return reply.send({ conversations })
  })

  // GET /v1/ai-agents/conversations/:id/messages
  app.get('/conversations/:id/messages', async (req, reply) => {
    const tenantId = (req as any).tenantId
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' })
    const { id } = req.params as { id: string }
    const conv = await prisma.aiAgentConversation.findFirst({ where: { id, tenantId } })
    if (!conv) return reply.status(404).send({ error: 'Conversation not found' })
    const messages = await prisma.aiAgentMessage.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
    })
    return reply.send({ conversation: conv, messages })
  })

  // POST /v1/ai-agents/messages — post a message to a conversation
  app.post('/messages', async (req, reply) => {
    const tenantId = (req as any).tenantId
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' })
    const { conversationId, fromAgentSlug, toAgentSlug, messageType, content } = req.body as any
    if (!conversationId || !fromAgentSlug || !content) return reply.status(400).send({ error: 'conversationId, fromAgentSlug, content required' })
    const msg = await prisma.aiAgentMessage.create({
      data: { tenantId, conversationId, fromAgentSlug, toAgentSlug, messageType: messageType ?? 'message', content },
    })
    return reply.status(201).send({ message: msg })
  })

  // POST /v1/ai-agents/delegate — run multi-agent task
  app.post('/delegate', async (req, reply) => {
    const tenantId = (req as any).tenantId
    const userId = (req as any).userId
    if (!tenantId || !userId) return reply.status(401).send({ error: 'Unauthorized' })
    const { request, title, provider, taskId } = req.body as any
    if (!request || !title) return reply.status(400).send({ error: 'request and title are required' })

    // Fire async, return immediately with a preview
    const resultPromise = runMultiAgentTask({
      tenantId, userId, request, title,
      provider: provider ?? 'mock',
      taskId,
    })

    // Return immediately with pending status — client polls conversations
    const [result] = await Promise.all([resultPromise])
    return reply.send({ result })
  })

  // GET /v1/ai-agents/workspace — list workspaces
  app.get('/workspace/list', async (req, reply) => {
    const tenantId = (req as any).tenantId
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' })
    const { taskId } = req.query as { taskId?: string }
    const workspaces = await listWorkspaces(tenantId, taskId)
    return reply.send({ workspaces })
  })

  // GET /v1/ai-agents/meetings — list meetings
  app.get('/meetings/list', async (req, reply) => {
    const tenantId = (req as any).tenantId
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' })
    const meetings = await listMeetings(tenantId)
    return reply.send({ meetings })
  })

  // POST /v1/ai-agents/meetings — create meeting
  app.post('/meetings/create', async (req, reply) => {
    const tenantId = (req as any).tenantId
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' })
    const { title, agenda, agentSlugs, taskId } = req.body as any
    if (!title || !agenda) return reply.status(400).send({ error: 'title and agenda are required' })
    const meeting = await createMeeting({ tenantId, title, agenda, agentSlugs: agentSlugs ?? [], taskId })
    return reply.status(201).send({ meeting })
  })

  // GET /v1/ai-agents/votes — list votes for a decision
  app.get('/votes/list', async (req, reply) => {
    const tenantId = (req as any).tenantId
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' })
    const { decisionId } = req.query as { decisionId?: string }
    const where: any = { tenantId }
    if (decisionId) where.decisionId = decisionId
    const votes = await prisma.aiAgentVote.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 })
    return reply.send({ votes })
  })

  // POST /v1/ai-agents/votes — cast a vote
  app.post('/votes/cast', async (req, reply) => {
    const tenantId = (req as any).tenantId
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' })
    const { decisionId, agentSlug, vote, reasoning } = req.body as any
    if (!decisionId || !agentSlug || !vote) return reply.status(400).send({ error: 'decisionId, agentSlug, vote required' })
    const v = await prisma.aiAgentVote.upsert({
      where: { decisionId_agentSlug: { decisionId, agentSlug } },
      create: { tenantId, decisionId, agentSlug, vote, reasoning },
      update: { vote, reasoning },
    })
    return reply.send({ vote: v })
  })

  // GET /v1/ai-agents/dashboard — collaboration dashboard
  app.get('/dashboard/summary', async (req, reply) => {
    const tenantId = (req as any).tenantId
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' })
    const data = await getCollabDashboard(tenantId)
    return reply.send(data)
  })
}
