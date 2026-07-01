import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import {
  AGENT_TEMPLATES, generateAgentPlan, executeAgentTask,
  assessAgentPerformance, detectCollaborationNeeds, calculateTaskCost,
  generateHubSummary, type AgentType,
} from './ai-engine.js'

export async function agentsPlatformRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Dashboard ──────────────────────────────────────────────────────────────

  app.get('/dashboard', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }

    const [agents, tasks, collabs] = await Promise.all([
      prisma.eapAgent.findMany({ where: { tenantId }, select: { id: true, name: true, type: true, status: true, totalTasks: true, totalCost: true } }),
      prisma.eapAgentTask.findMany({ where: { tenantId }, select: { status: true, durationMs: true }, orderBy: { createdAt: 'desc' } }),
      prisma.eapAgentCollaboration.count({ where: { tenantId } }),
    ])

    const activeAgents = agents.filter(a => a.status === 'active').length
    const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'running').length
    const completedTasks = tasks.filter(t => t.status === 'completed').length
    const totalCost = agents.reduce((s, a) => s + a.totalCost, 0)
    const durations = tasks.filter(t => t.durationMs).map(t => t.durationMs!)
    const avgDurationMs = durations.length ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : 0

    return {
      success: true,
      data: {
        totalAgents: agents.length,
        activeAgents,
        pendingTasks,
        completedTasks,
        totalCollaborations: collabs,
        totalCost: parseFloat(totalCost.toFixed(2)),
        avgDurationMs,
        summary: generateHubSummary(agents.length, activeAgents, pendingTasks, completedTasks, totalCost),
        agentsByType: agents.reduce<Record<string, number>>((acc, a) => { acc[a.type] = (acc[a.type] ?? 0) + 1; return acc }, {}),
        recentAgents: agents.slice(0, 5),
      },
    }
  })

  // ── Marketplace ────────────────────────────────────────────────────────────

  app.get('/marketplace', async () => ({ success: true, data: AGENT_TEMPLATES }))

  app.post('/marketplace/deploy', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { templateType, customName } = req.body as { templateType: AgentType; customName?: string }

    const tmpl = AGENT_TEMPLATES.find(t => t.type === templateType)
    if (!tmpl) return { success: false, error: 'Unknown template type' }

    const existing = await prisma.eapAgent.findUnique({ where: { tenantId_slug: { tenantId, slug: tmpl.slug } } })
    if (existing) {
      // Idempotent: reactivate if inactive, return existing if already active
      if (existing.status !== 'active') {
        const reactivated = await prisma.eapAgent.update({ where: { id: existing.id }, data: { status: 'active' } })
        return { success: true, data: reactivated }
      }
      return { success: true, data: existing }
    }

    const agent = await prisma.eapAgent.create({
      data: {
        tenantId, slug: tmpl.slug, type: tmpl.type,
        name: customName ?? tmpl.name,
        description: tmpl.description,
        personality: tmpl.personality,
        goals: tmpl.goals as never,
        tools: tmpl.tools,
        createdById: userId,
      },
    })

    if (tmpl.defaultKpis.length > 0) {
      await prisma.eapAgentKpi.createMany({
        data: tmpl.defaultKpis.map(k => ({ tenantId, agentId: agent.id, name: k.name, value: 0, target: k.target, unit: k.unit })),
      })
    }

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'DEPLOY_AGENT', module: 'agents-platform', entityType: 'EapAgent', entityId: agent.id, newValues: { type: agent.type, name: agent.name } as never } }).catch(() => null)
    return { success: true, data: agent }
  })

  // ── Agents CRUD ────────────────────────────────────────────────────────────

  app.get('/agents', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const agents = await prisma.eapAgent.findMany({
      where: { tenantId },
      include: { _count: { select: { tasks: true, memories: true, kpis: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: agents }
  })

  app.post('/agents', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { name, type = 'custom', description, personality, goals = [], tools = [], slug } = req.body as {
      name: string; type?: string; description?: string; personality?: string
      goals?: string[]; tools?: string[]; slug?: string
    }

    const computedSlug = slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const agent = await prisma.eapAgent.create({
      data: { tenantId, name, slug: computedSlug, type, description, personality, goals: goals as never, tools, createdById: userId },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE_AGENT', module: 'agents-platform', entityType: 'EapAgent', entityId: agent.id, newValues: { name, type } as never } }).catch(() => null)
    return { success: true, data: agent }
  })

  app.get('/agents/:id', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const agent = await prisma.eapAgent.findFirst({
      where: { id, tenantId },
      include: { memories: { orderBy: { updatedAt: 'desc' }, take: 10 }, kpis: { orderBy: { createdAt: 'desc' }, take: 20 }, _count: { select: { tasks: true, auditLogs: true } } },
    })
    if (!agent) return { success: false, error: 'Not found' }
    return { success: true, data: agent }
  })

  app.put('/agents/:id', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = req.body as Partial<{ name: string; description: string; personality: string; goals: string[]; tools: string[]; status: string }>
    const agent = await prisma.eapAgent.updateMany({
      where: { id, tenantId },
      data: { ...body, goals: body.goals as never },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE_AGENT', module: 'agents-platform', entityType: 'EapAgent', entityId: id, newValues: body as never } }).catch(() => null)
    return { success: true, data: agent }
  })

  app.delete('/agents/:id', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    await prisma.eapAgent.updateMany({ where: { id, tenantId }, data: { status: 'inactive' } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'DEACTIVATE_AGENT', module: 'agents-platform', entityType: 'EapAgent', entityId: id, newValues: {} as never } }).catch(() => null)
    return { success: true }
  })

  app.post('/agents/:id/activate', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    await prisma.eapAgent.updateMany({ where: { id, tenantId }, data: { status: 'active' } })
    return { success: true }
  })

  app.post('/agents/:id/pause', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    await prisma.eapAgent.updateMany({ where: { id, tenantId }, data: { status: 'paused' } })
    return { success: true }
  })

  // ── Agent Performance ──────────────────────────────────────────────────────

  app.get('/agents/:id/performance', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }

    const [agent, tasks] = await Promise.all([
      prisma.eapAgent.findFirst({ where: { id, tenantId } }),
      prisma.eapAgentTask.findMany({ where: { agentId: id, tenantId } }),
    ])
    if (!agent) return { success: false, error: 'Not found' }

    const completed = tasks.filter(t => t.status === 'completed').length
    const failed = tasks.filter(t => t.status === 'failed').length
    const durations = tasks.filter(t => t.durationMs).map(t => t.durationMs!)
    const avgMs = durations.length ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : 0

    const perf = assessAgentPerformance(tasks.length, completed, failed, agent.totalCost, avgMs)
    return { success: true, data: perf }
  })

  // ── Memory ─────────────────────────────────────────────────────────────────

  app.get('/agents/:id/memory', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const memories = await prisma.eapAgentMemory.findMany({
      where: { agentId: id, tenantId },
      orderBy: { updatedAt: 'desc' },
    })
    return { success: true, data: memories }
  })

  app.post('/agents/:id/memory', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const { key, value, importance = 'medium', expiresAt } = req.body as { key: string; value: string; importance?: string; expiresAt?: string }

    const mem = await prisma.eapAgentMemory.upsert({
      where: { agentId_key: { agentId: id, key } },
      update: { value, importance, expiresAt: expiresAt ? new Date(expiresAt) : null },
      create: { tenantId, agentId: id, key, value, importance, expiresAt: expiresAt ? new Date(expiresAt) : null },
    })
    return { success: true, data: mem }
  })

  app.delete('/agents/:id/memory/:key', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id, key } = req.params as { id: string; key: string }
    await prisma.eapAgentMemory.deleteMany({ where: { agentId: id, tenantId, key } })
    return { success: true }
  })

  // ── Tasks ──────────────────────────────────────────────────────────────────

  app.get('/tasks', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { agentId, status } = req.query as { agentId?: string; status?: string }
    const tasks = await prisma.eapAgentTask.findMany({
      where: { tenantId, ...(agentId ? { agentId } : {}), ...(status ? { status } : {}) },
      include: { agent: { select: { name: true, type: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: tasks }
  })

  app.post('/agents/:id/tasks', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const { title, description, priority = 'medium', input = {} } = req.body as { title: string; description?: string; priority?: string; input?: Record<string, unknown> }

    const agent = await prisma.eapAgent.findFirst({ where: { id, tenantId } })
    if (!agent) return { success: false, error: 'Agent not found' }

    const plan = generateAgentPlan(agent.type as AgentType, title, description)
    const task = await prisma.eapAgentTask.create({
      data: { tenantId, agentId: id, title, description, priority, input: input as never, plan: plan as never },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE_TASK', module: 'agents-platform', entityType: 'EapAgentTask', entityId: task.id, newValues: { title, agentId: id } as never } }).catch(() => null)
    return { success: true, data: { task, plan } }
  })

  app.get('/tasks/:taskId', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { taskId } = req.params as { taskId: string }
    const task = await prisma.eapAgentTask.findFirst({
      where: { id: taskId, tenantId },
      include: { agent: { select: { name: true, type: true } }, collaborations: { include: { fromAgent: { select: { name: true } }, toAgent: { select: { name: true } } } } },
    })
    if (!task) return { success: false, error: 'Not found' }
    return { success: true, data: task }
  })

  app.post('/tasks/:taskId/execute', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { taskId } = req.params as { taskId: string }

    const task = await prisma.eapAgentTask.findFirst({ where: { id: taskId, tenantId }, include: { agent: true } })
    if (!task) return { success: false, error: 'Task not found' }
    if (task.status !== 'pending') return { success: false, error: `Task is already ${task.status}` }

    const startedAt = new Date()
    await prisma.eapAgentTask.update({ where: { id: taskId }, data: { status: 'running', startedAt } })

    const plan = (task.plan ?? generateAgentPlan(task.agent.type as AgentType, task.title)) as unknown as Parameters<typeof executeAgentTask>[2]
    const result = executeAgentTask(task.agent.type as AgentType, task.title, plan)
    const completedAt = new Date()
    const durationMs = result.durationMs

    await prisma.eapAgentTask.update({
      where: { id: taskId },
      data: { status: result.status, output: result as never, completedAt, durationMs, startedAt },
    })

    await prisma.eapAgent.update({
      where: { id: task.agentId },
      data: { totalTasks: { increment: 1 }, totalCost: { increment: result.cost } },
    })

    await prisma.eapAgentAuditLog.create({
      data: {
        tenantId, agentId: task.agentId, action: 'EXECUTE_TASK',
        entityType: 'EapAgentTask', entityId: taskId,
        summary: result.summary, cost: result.cost,
        metadata: { insights: result.insights, stepsCompleted: result.stepsCompleted } as never,
      },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'EXECUTE_TASK', module: 'agents-platform', entityType: 'EapAgentTask', entityId: taskId, newValues: { durationMs, cost: result.cost } as never } }).catch(() => null)
    return { success: true, data: result }
  })

  app.post('/tasks/:taskId/cancel', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { taskId } = req.params as { taskId: string }
    await prisma.eapAgentTask.updateMany({ where: { id: taskId, tenantId, status: { in: ['pending', 'running'] } }, data: { status: 'cancelled', completedAt: new Date() } })
    return { success: true }
  })

  // ── KPIs ───────────────────────────────────────────────────────────────────

  app.get('/agents/:id/kpis', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const kpis = await prisma.eapAgentKpi.findMany({ where: { agentId: id, tenantId }, orderBy: { createdAt: 'desc' } })
    return { success: true, data: kpis }
  })

  app.post('/agents/:id/kpis', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const { name, value, target, unit, period } = req.body as { name: string; value: number; target?: number; unit?: string; period?: string }
    const kpi = await prisma.eapAgentKpi.create({ data: { tenantId, agentId: id, name, value, target, unit, period } })
    return { success: true, data: kpi }
  })

  // ── Collaborations ─────────────────────────────────────────────────────────

  app.get('/agents/:id/collaborations', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const collabs = await prisma.eapAgentCollaboration.findMany({
      where: { tenantId, OR: [{ fromAgentId: id }, { toAgentId: id }] },
      include: { fromAgent: { select: { name: true, type: true } }, toAgent: { select: { name: true, type: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return { success: true, data: collabs }
  })

  app.post('/collaborate', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { fromAgentId, toAgentId, message, type = 'request', taskId } = req.body as { fromAgentId: string; toAgentId: string; message: string; type?: string; taskId?: string }

    const [fromAgent, toAgent] = await Promise.all([
      prisma.eapAgent.findFirst({ where: { id: fromAgentId, tenantId } }),
      prisma.eapAgent.findFirst({ where: { id: toAgentId, tenantId } }),
    ])
    if (!fromAgent || !toAgent) return { success: false, error: 'One or both agents not found' }

    const collab = await prisma.eapAgentCollaboration.create({
      data: { tenantId, fromAgentId, toAgentId, message, type, taskId: taskId ?? null },
      include: { fromAgent: { select: { name: true } }, toAgent: { select: { name: true } } },
    })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'AGENT_COLLABORATE', module: 'agents-platform', entityType: 'EapAgentCollaboration', entityId: collab.id, newValues: { fromAgentId, toAgentId, type } as never } }).catch(() => null)
    return { success: true, data: collab }
  })

  // ── Collaboration needs detection ──────────────────────────────────────────

  app.post('/agents/:id/detect-collaboration', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const { taskTitle } = req.body as { taskTitle: string }

    const [agent, allAgents] = await Promise.all([
      prisma.eapAgent.findFirst({ where: { id, tenantId } }),
      prisma.eapAgent.findMany({ where: { tenantId, status: 'active', id: { not: id } }, select: { type: true } }),
    ])
    if (!agent) return { success: false, error: 'Agent not found' }

    const availableTypes = allAgents.map(a => a.type as AgentType)
    const needs = detectCollaborationNeeds(agent.type as AgentType, taskTitle, availableTypes)
    return { success: true, data: needs }
  })

  // ── Audit Logs ─────────────────────────────────────────────────────────────

  app.get('/agents/:id/audit', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const { id } = req.params as { id: string }
    const logs = await prisma.eapAgentAuditLog.findMany({
      where: { agentId: id, tenantId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })
    return { success: true, data: logs }
  })

  // ── All collaborations for tenant ──────────────────────────────────────────

  app.get('/collaborations', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string }
    const collabs = await prisma.eapAgentCollaboration.findMany({
      where: { tenantId },
      include: { fromAgent: { select: { name: true, type: true } }, toAgent: { select: { name: true, type: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: collabs }
  })
}
