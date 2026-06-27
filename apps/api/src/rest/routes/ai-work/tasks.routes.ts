import type { FastifyInstance } from 'fastify'
import {
  createTask, listTasks, getTask, updateTaskStatus,
  getTaskMemory, getWorkDashboard, getActivityFeed, logWorkAudit,
} from '../../../brain/work/task.service.js'
import { spawnTaskExecution } from '../../../brain/work/executor.service.js'

export async function aiWorkTaskRoutes(app: FastifyInstance) {
  // GET /v1/ai-work/tasks
  app.get('/', async (req, reply) => {
    const tenantId = (req as any).tenantId
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' })
    const { status, provider, limit, offset } = req.query as any
    const result = await listTasks(tenantId, {
      status, provider,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    })
    return reply.send(result)
  })

  // POST /v1/ai-work/tasks
  app.post('/', async (req, reply) => {
    const tenantId = (req as any).tenantId
    const userId = (req as any).userId
    if (!tenantId || !userId) return reply.status(401).send({ error: 'Unauthorized' })

    const { title, request, description, provider, agentSlug, priority, riskLevel, module } = req.body as any
    if (!title || !request) return reply.status(400).send({ error: 'title and request are required' })

    const task = await createTask({ tenantId, userId, title, request, description, provider, agentSlug, priority, riskLevel, module })
    return reply.status(201).send({ task })
  })

  // GET /v1/ai-work/tasks/:id
  app.get('/:id', async (req, reply) => {
    const tenantId = (req as any).tenantId
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' })
    const { id } = req.params as { id: string }
    const task = await getTask(tenantId, id)
    if (!task) return reply.status(404).send({ error: 'Task not found' })
    return reply.send({ task })
  })

  // PATCH /v1/ai-work/tasks/:id
  app.patch('/:id', async (req, reply) => {
    const tenantId = (req as any).tenantId
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' })
    const { id } = req.params as { id: string }
    const { status, errorMessage, result, progressPct } = req.body as any

    const task = await getTask(tenantId, id)
    if (!task) return reply.status(404).send({ error: 'Task not found' })

    const updated = await updateTaskStatus(tenantId, id, status, { errorMessage, result, progressPct })
    return reply.send({ task: updated })
  })

  // POST /v1/ai-work/tasks/:id/start
  app.post('/:id/start', async (req, reply) => {
    const tenantId = (req as any).tenantId
    const userId = (req as any).userId
    if (!tenantId || !userId) return reply.status(401).send({ error: 'Unauthorized' })
    const { id } = req.params as { id: string }

    const task = await getTask(tenantId, id)
    if (!task) return reply.status(404).send({ error: 'Task not found' })
    if (!['draft', 'queued', 'paused'].includes(task.status)) {
      return reply.status(400).send({ error: `Cannot start a task with status: ${task.status}` })
    }

    spawnTaskExecution({
      taskId: id, tenantId, userId,
      request: task.request,
      provider: task.provider,
      agentSlug: task.agentSlug ?? undefined,
      module: task.module ?? undefined,
    })

    return reply.send({ message: 'Task execution started', taskId: id })
  })

  // POST /v1/ai-work/tasks/:id/pause
  app.post('/:id/pause', async (req, reply) => {
    const tenantId = (req as any).tenantId
    const userId = (req as any).userId
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' })
    const { id } = req.params as { id: string }
    const task = await getTask(tenantId, id)
    if (!task) return reply.status(404).send({ error: 'Task not found' })
    const updated = await updateTaskStatus(tenantId, id, 'paused')
    await logWorkAudit({ tenantId, taskId: id, userId, action: 'task_paused' })
    return reply.send({ task: updated })
  })

  // POST /v1/ai-work/tasks/:id/resume
  app.post('/:id/resume', async (req, reply) => {
    const tenantId = (req as any).tenantId
    const userId = (req as any).userId
    if (!tenantId || !userId) return reply.status(401).send({ error: 'Unauthorized' })
    const { id } = req.params as { id: string }
    const task = await getTask(tenantId, id)
    if (!task) return reply.status(404).send({ error: 'Task not found' })
    if (task.status !== 'paused') return reply.status(400).send({ error: 'Task is not paused' })

    spawnTaskExecution({
      taskId: id, tenantId, userId,
      request: task.request,
      provider: task.provider,
      agentSlug: task.agentSlug ?? undefined,
      module: task.module ?? undefined,
    })
    return reply.send({ message: 'Task resumed', taskId: id })
  })

  // POST /v1/ai-work/tasks/:id/cancel
  app.post('/:id/cancel', async (req, reply) => {
    const tenantId = (req as any).tenantId
    const userId = (req as any).userId
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' })
    const { id } = req.params as { id: string }
    const task = await getTask(tenantId, id)
    if (!task) return reply.status(404).send({ error: 'Task not found' })
    if (['completed', 'failed', 'cancelled'].includes(task.status)) {
      return reply.status(400).send({ error: `Cannot cancel a task with status: ${task.status}` })
    }
    const updated = await updateTaskStatus(tenantId, id, 'cancelled')
    await logWorkAudit({ tenantId, taskId: id, userId, action: 'task_cancelled' })
    return reply.send({ task: updated })
  })

  // GET /v1/ai-work/tasks/:id/steps
  app.get('/:id/steps', async (req, reply) => {
    const tenantId = (req as any).tenantId
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' })
    const { id } = req.params as { id: string }
    const task = await getTask(tenantId, id)
    if (!task) return reply.status(404).send({ error: 'Task not found' })
    return reply.send({ steps: task.steps })
  })

  // GET /v1/ai-work/tasks/:id/memory
  app.get('/:id/memory', async (req, reply) => {
    const tenantId = (req as any).tenantId
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' })
    const { id } = req.params as { id: string }
    const task = await getTask(tenantId, id)
    if (!task) return reply.status(404).send({ error: 'Task not found' })
    const memory = await getTaskMemory(id)
    return reply.send({ memory })
  })

  // GET /v1/ai-work/dashboard
  app.get('/dashboard/summary', async (req, reply) => {
    const tenantId = (req as any).tenantId
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' })
    const data = await getWorkDashboard(tenantId)
    return reply.send(data)
  })

  // GET /v1/ai-work/activity
  app.get('/activity/feed', async (req, reply) => {
    const tenantId = (req as any).tenantId
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' })
    const { limit } = req.query as { limit?: string }
    const feed = await getActivityFeed(tenantId, limit ? parseInt(limit, 10) : 50)
    return reply.send({ feed })
  })

  // GET /v1/ai-work/audit
  app.get('/audit/logs', async (req, reply) => {
    const tenantId = (req as any).tenantId
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' })
    const { taskId, limit } = req.query as { taskId?: string; limit?: string }
    const { prisma } = await import('@reno/database')
    const where: any = { tenantId }
    if (taskId) where.taskId = taskId
    const logs = await prisma.aiWorkAuditLog.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: limit ? parseInt(limit, 10) : 100,
    })
    return reply.send({ logs })
  })
}
