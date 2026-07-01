// Phase 49 — AI Universal Action Layer: API Routes

import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import {
  SYSTEM_CATALOG,
  validateToolInput,
  evaluatePolicy,
  simulateExecution,
  detectToolsForTask,
  buildMcpManifest,
  assessToolHealth,
  calculateToolCost,
  generateActionLayerSummary,
} from './ai-engine.js'

export async function actionLayerRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Dashboard ────────────────────────────────────────────────────────────────

  app.get('/dashboard', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string; userId: string }

    const [totalTools, activeTools, totalExecutions, successfulExecutions, mcpServers, costAgg] = await Promise.all([
      prisma.ualTool.count({ where: { tenantId } }),
      prisma.ualTool.count({ where: { tenantId, status: 'active' } }),
      prisma.ualToolExecution.count({ where: { tenantId } }),
      prisma.ualToolExecution.count({ where: { tenantId, status: 'completed' } }),
      prisma.ualMcpServer.count({ where: { tenantId } }),
      prisma.ualToolExecution.aggregate({ where: { tenantId }, _sum: { cost: true } }),
    ])

    const totalCost = costAgg._sum.cost ?? 0
    const summary = generateActionLayerSummary(totalTools, activeTools, totalExecutions, successfulExecutions, totalCost, mcpServers)

    const recentExecutions = await prisma.ualToolExecution.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { tool: { select: { name: true, category: true } } },
    })

    const topTools = await prisma.ualTool.findMany({
      where: { tenantId, status: 'active' },
      orderBy: { totalCalls: 'desc' },
      take: 5,
      select: { id: true, name: true, slug: true, category: true, totalCalls: true, totalCost: true, avgDurationMs: true },
    })

    return { summary, stats: { totalTools, activeTools, totalExecutions, successfulExecutions, totalCost, mcpServers }, recentExecutions, topTools }
  })

  // ── System Catalog ───────────────────────────────────────────────────────────

  app.get('/catalog', async (_req) => {
    return { tools: SYSTEM_CATALOG, total: SYSTEM_CATALOG.length }
  })

  app.post('/catalog/install', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { slug: string }

    const catalogTool = SYSTEM_CATALOG.find(t => t.slug === body.slug)
    if (!catalogTool) return { error: 'Tool not found in system catalog' }

    const existing = await prisma.ualTool.findFirst({ where: { tenantId, slug: body.slug } })
    if (existing) return existing

    const tool = await prisma.ualTool.create({
      data: {
        tenantId,
        name: catalogTool.name,
        slug: catalogTool.slug,
        version: catalogTool.version,
        description: catalogTool.description,
        category: catalogTool.category,
        provider: catalogTool.provider,
        schema: catalogTool.schema as never,
        permissions: catalogTool.permissions as never,
        isSystem: true,
        status: 'active',
        createdById: userId,
      },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'INSTALL', module: 'action-layer', entityType: 'UalTool', entityId: tool.id, newValues: { slug: tool.slug, name: tool.name } as never } }).catch(() => null)

    return tool
  })

  // ── Tools CRUD ───────────────────────────────────────────────────────────────

  app.get('/tools', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string; userId: string }
    const { category, provider, status } = req.query as { category?: string; provider?: string; status?: string }

    const where: Record<string, unknown> = { tenantId }
    if (category) where.category = category
    if (provider) where.provider = provider
    if (status) where.status = status

    const tools = await prisma.ualTool.findMany({
      where,
      orderBy: [{ totalCalls: 'desc' }, { name: 'asc' }],
      include: { _count: { select: { executions: true, policies: true } } },
    })

    return { tools, total: tools.length }
  })

  app.get('/tools/:id', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }

    const tool = await prisma.ualTool.findFirst({
      where: { tenantId, id },
      include: {
        policies: true,
        executions: { orderBy: { createdAt: 'desc' }, take: 20 },
        _count: { select: { executions: true, policies: true } },
      },
    })
    if (!tool) return { error: 'Tool not found' }

    const failedExecutions = tool.executions.filter(e => e.status === 'failed').length
    const health = assessToolHealth(tool.totalCalls, failedExecutions, tool.avgDurationMs ?? 0)

    return { tool, health }
  })

  app.post('/tools', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as {
      name: string; slug: string; description?: string; category?: string; provider?: string
      endpoint?: string; schema?: Record<string, unknown>; permissions?: Record<string, unknown>; version?: string
    }

    const tool = await prisma.ualTool.create({
      data: {
        tenantId,
        name: body.name,
        slug: body.slug,
        description: body.description,
        category: body.category ?? 'custom',
        provider: body.provider ?? 'local',
        endpoint: body.endpoint,
        version: body.version ?? '1.0.0',
        schema: (body.schema ?? {}) as never,
        permissions: (body.permissions ?? {}) as never,
        isSystem: false,
        status: 'active',
        createdById: userId,
      },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'action-layer', entityType: 'UalTool', entityId: tool.id, newValues: { slug: tool.slug, name: tool.name } as never } }).catch(() => null)

    return tool
  })

  app.patch('/tools/:id', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = req.body as Record<string, unknown>

    const tool = await prisma.ualTool.findFirst({ where: { tenantId, id } })
    if (!tool) return { error: 'Tool not found' }

    const updated = await prisma.ualTool.update({
      where: { id },
      data: {
        name: body.name as string ?? tool.name,
        description: body.description as string ?? tool.description,
        endpoint: body.endpoint as string ?? tool.endpoint,
        schema: body.schema ? (body.schema as never) : tool.schema,
        permissions: body.permissions ? (body.permissions as never) : tool.permissions,
        status: body.status as string ?? tool.status,
      },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE', module: 'action-layer', entityType: 'UalTool', entityId: id, newValues: body as never } }).catch(() => null)

    return updated
  })

  app.delete('/tools/:id', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }

    const tool = await prisma.ualTool.findFirst({ where: { tenantId, id } })
    if (!tool) return { error: 'Tool not found' }
    if (tool.isSystem) return { error: 'Cannot delete system tools — deactivate instead' }

    await prisma.ualTool.delete({ where: { id } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'DELETE', module: 'action-layer', entityType: 'UalTool', entityId: id, newValues: { slug: tool.slug } as never } }).catch(() => null)

    return { success: true }
  })

  // ── Execute Tool ─────────────────────────────────────────────────────────────

  app.post('/tools/:id/execute', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = req.body as { input?: Record<string, unknown>; agentId?: string; taskId?: string; callerType?: 'user' | 'agent'; callerId?: string }

    const tool = await prisma.ualTool.findFirst({
      where: { tenantId, id },
      include: { policies: true },
    })
    if (!tool) return { error: 'Tool not found' }
    if (tool.status !== 'active') return { error: 'Tool is not active' }

    const input = body.input ?? {}
    const schema = tool.schema as Record<string, unknown>
    const validation = validateToolInput(schema, input)
    if (!validation.valid) return { error: 'Input validation failed', details: validation.errors }

    const callerType = body.callerType ?? 'user'
    const callerId = body.callerId ?? userId
    const policyResult = evaluatePolicy(
      tool.policies.map(p => ({ name: p.name, subjectType: p.subjectType, subjectId: p.subjectId, action: p.action, isActive: p.isActive })),
      { callerType, callerId },
    )

    if (policyResult.decision === 'deny') {
      const blocked = await prisma.ualToolExecution.create({
        data: {
          tenantId, toolId: id,
          agentId: body.agentId,
          userId: userId,
          status: 'blocked',
          input: input as never,
          policyAction: 'deny',
          cost: 0,
        },
      })
      await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'EXECUTE_BLOCKED', module: 'action-layer', entityType: 'UalToolExecution', entityId: blocked.id, newValues: { toolSlug: tool.slug, reason: policyResult.reason } as never } }).catch(() => null)
      return { error: 'Execution blocked by policy', reason: policyResult.reason, executionId: blocked.id }
    }

    if (policyResult.decision === 'require_approval') {
      const pending = await prisma.ualToolExecution.create({
        data: {
          tenantId, toolId: id,
          agentId: body.agentId,
          userId: userId,
          status: 'pending',
          input: input as never,
          policyAction: 'require_approval',
          cost: 0,
        },
      })
      return { requiresApproval: true, executionId: pending.id, reason: policyResult.reason }
    }

    // Execute
    const startedAt = new Date()
    const execution = await prisma.ualToolExecution.create({
      data: {
        tenantId, toolId: id,
        agentId: body.agentId,
        userId: userId,
        status: 'running',
        input: input as never,
        policyAction: 'allow',
        startedAt,
        cost: 0,
      },
    })

    const sim = simulateExecution(tool.slug, input)
    const cost = calculateToolCost(tool.category, sim.durationMs)
    const completedAt = new Date()

    const updated = await prisma.ualToolExecution.update({
      where: { id: execution.id },
      data: {
        status: 'completed',
        output: sim.result as never,
        durationMs: sim.durationMs,
        cost,
        completedAt,
      },
    })

    // Update tool aggregate stats
    const newTotalCalls = tool.totalCalls + 1
    const newTotalCost = tool.totalCost + cost
    const prevAvg = tool.avgDurationMs ?? sim.durationMs
    const newAvg = Math.round((prevAvg * tool.totalCalls + sim.durationMs) / newTotalCalls)
    await prisma.ualTool.update({
      where: { id },
      data: { totalCalls: newTotalCalls, totalCost: newTotalCost, avgDurationMs: newAvg },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'EXECUTE', module: 'action-layer', entityType: 'UalToolExecution', entityId: updated.id, newValues: { toolSlug: tool.slug, status: 'completed', durationMs: sim.durationMs, cost } as never } }).catch(() => null)

    return { execution: updated, output: sim.result, durationMs: sim.durationMs, cost }
  })

  // ── Executions ───────────────────────────────────────────────────────────────

  app.get('/executions', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string; userId: string }
    const { toolId, agentId, status, limit } = req.query as { toolId?: string; agentId?: string; status?: string; limit?: string }

    const where: Record<string, unknown> = { tenantId }
    if (toolId) where.toolId = toolId
    if (agentId) where.agentId = agentId
    if (status) where.status = status

    const executions = await prisma.ualToolExecution.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit ?? '50'), 200),
      include: { tool: { select: { name: true, slug: true, category: true } } },
    })

    return { executions, total: executions.length }
  })

  // ── Policies ─────────────────────────────────────────────────────────────────

  app.get('/policies', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string; userId: string }
    const { toolId } = req.query as { toolId?: string }

    const where: Record<string, unknown> = { tenantId }
    if (toolId) where.toolId = toolId

    const policies = await prisma.ualExecutionPolicy.findMany({
      where,
      include: { tool: { select: { name: true, slug: true } } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    })

    return { policies, total: policies.length }
  })

  app.post('/policies', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { toolId: string; name: string; subjectType: string; subjectId?: string; action?: string; rateLimit?: number; conditions?: Record<string, unknown>; priority?: number }

    const tool = await prisma.ualTool.findFirst({ where: { tenantId, id: body.toolId } })
    if (!tool) return { error: 'Tool not found' }

    const policy = await prisma.ualExecutionPolicy.create({
      data: {
        tenantId,
        toolId: body.toolId,
        name: body.name,
        subjectType: body.subjectType,
        subjectId: body.subjectId,
        action: body.action ?? 'allow',
        rateLimit: body.rateLimit,
        conditions: (body.conditions ?? {}) as never,
        priority: body.priority ?? 0,
        isActive: true,
      },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'action-layer', entityType: 'UalExecutionPolicy', entityId: policy.id, newValues: { name: policy.name, toolId: policy.toolId, action: policy.action } as never } }).catch(() => null)

    return policy
  })

  app.patch('/policies/:id', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = req.body as Record<string, unknown>

    const policy = await prisma.ualExecutionPolicy.findFirst({ where: { tenantId, id } })
    if (!policy) return { error: 'Policy not found' }

    const updated = await prisma.ualExecutionPolicy.update({
      where: { id },
      data: {
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : policy.isActive,
        action: body.action as string ?? policy.action,
        rateLimit: body.rateLimit as number ?? policy.rateLimit,
        priority: body.priority as number ?? policy.priority,
      },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE', module: 'action-layer', entityType: 'UalExecutionPolicy', entityId: id, newValues: body as never } }).catch(() => null)

    return updated
  })

  app.delete('/policies/:id', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }

    const policy = await prisma.ualExecutionPolicy.findFirst({ where: { tenantId, id } })
    if (!policy) return { error: 'Policy not found' }

    await prisma.ualExecutionPolicy.delete({ where: { id } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'DELETE', module: 'action-layer', entityType: 'UalExecutionPolicy', entityId: id, newValues: { name: policy.name } as never } }).catch(() => null)

    return { success: true }
  })

  // ── MCP Servers ──────────────────────────────────────────────────────────────

  app.get('/mcp-servers', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string; userId: string }

    const servers = await prisma.ualMcpServer.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    })

    return { servers, total: servers.length }
  })

  app.post('/mcp-servers', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { name: string; slug: string; description?: string; endpoint: string; protocol?: string; authType?: string; authConfig?: Record<string, unknown> }

    const server = await prisma.ualMcpServer.create({
      data: {
        tenantId,
        name: body.name,
        slug: body.slug,
        description: body.description,
        endpoint: body.endpoint,
        protocol: body.protocol ?? 'http',
        authType: body.authType ?? 'none',
        authConfig: (body.authConfig ?? {}) as never,
        toolManifest: [] as never,
        status: 'active',
        healthScore: 100,
        lastCheckedAt: new Date(),
      },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'action-layer', entityType: 'UalMcpServer', entityId: server.id, newValues: { slug: server.slug, endpoint: server.endpoint } as never } }).catch(() => null)

    return server
  })

  app.post('/mcp-servers/:id/sync', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }

    const server = await prisma.ualMcpServer.findFirst({ where: { tenantId, id } })
    if (!server) return { error: 'MCP server not found' }

    // In production this would fetch the real manifest from the server endpoint.
    // For now we generate a simulated manifest from installed tools.
    const installedTools = await prisma.ualTool.findMany({ where: { tenantId, status: 'active' }, select: { name: true, slug: true, schema: true } })
    const manifest = buildMcpManifest(installedTools.map(t => ({ name: t.name, slug: t.slug, description: null, schema: t.schema })))

    const updated = await prisma.ualMcpServer.update({
      where: { id },
      data: { toolManifest: manifest as never, lastCheckedAt: new Date(), healthScore: 95 },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'SYNC', module: 'action-layer', entityType: 'UalMcpServer', entityId: id, newValues: { toolCount: manifest.length } as never } }).catch(() => null)

    return { server: updated, toolsDiscovered: manifest.length, manifest }
  })

  app.delete('/mcp-servers/:id', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }

    const server = await prisma.ualMcpServer.findFirst({ where: { tenantId, id } })
    if (!server) return { error: 'MCP server not found' }

    await prisma.ualMcpServer.delete({ where: { id } })
    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'DELETE', module: 'action-layer', entityType: 'UalMcpServer', entityId: id, newValues: { slug: server.slug } as never } }).catch(() => null)

    return { success: true }
  })

  // ── Tool Detection ───────────────────────────────────────────────────────────

  app.post('/detect-tools', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { taskTitle: string }

    const activeTools = await prisma.ualTool.findMany({
      where: { tenantId, status: 'active' },
      select: { slug: true, name: true, category: true },
    })

    const detected = detectToolsForTask(body.taskTitle, activeTools.map(t => t.slug))
    const enriched = detected.map(d => {
      const tool = activeTools.find(t => t.slug === d.slug)
      return { ...d, name: tool?.name ?? d.slug, category: tool?.category ?? 'custom' }
    })

    return { taskTitle: body.taskTitle, detectedTools: enriched }
  })

  // ── MCP Manifest Export ──────────────────────────────────────────────────────

  app.get('/mcp-manifest', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string; userId: string }

    const tools = await prisma.ualTool.findMany({
      where: { tenantId, status: 'active' },
      select: { name: true, slug: true, schema: true },
    })

    const manifest = buildMcpManifest(tools.map(t => ({ name: t.name, slug: t.slug, description: null, schema: t.schema })))

    return { version: '1.0', tools: manifest, totalTools: manifest.length, generatedAt: new Date().toISOString() }
  })
}
