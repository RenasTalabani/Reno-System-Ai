// Phase 50 — AI Continuous Learning & Optimization Platform: API Routes

import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { requireAuth } from '../../middleware/auth.js'
import {
  analyzeToolPerformance,
  analyzeAgentPerformance,
  analyzePolicies,
  generateKgFeedbackFromToolExecution,
  calculateEvolutionScore,
  determineEvolutionTrend,
  calculateLearningScore,
  generateTopSuggestions,
  generateLearningSummary,
} from './ai-engine.js'

export async function learningRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Dashboard ────────────────────────────────────────────────────────────────

  app.get('/dashboard', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string; userId: string }

    const [
      totalEvents, successEvents, failureEvents,
      positiveFeedback, negativeFeedback,
      openToolInsights, appliedToolInsights,
      openAgentInsights, appliedAgentInsights,
      openPolicyInsights,
      pendingKgFeedback, approvedKgFeedback,
      latestSnapshot,
    ] = await Promise.all([
      prisma.aclLearningEvent.count({ where: { tenantId } }),
      prisma.aclLearningEvent.count({ where: { tenantId, outcome: 'success' } }),
      prisma.aclLearningEvent.count({ where: { tenantId, outcome: 'failure' } }),
      prisma.aclLearningEvent.count({ where: { tenantId, feedback: 'thumbs_up' } }),
      prisma.aclLearningEvent.count({ where: { tenantId, feedback: 'thumbs_down' } }),
      prisma.aclToolInsight.count({ where: { tenantId, status: 'open' } }),
      prisma.aclToolInsight.count({ where: { tenantId, status: 'applied' } }),
      prisma.aclAgentInsight.count({ where: { tenantId, status: 'open' } }),
      prisma.aclAgentInsight.count({ where: { tenantId, status: 'applied' } }),
      prisma.aclPolicyInsight.count({ where: { tenantId, status: 'open' } }),
      prisma.aclKgFeedback.count({ where: { tenantId, status: 'pending' } }),
      prisma.aclKgFeedback.count({ where: { tenantId, status: 'approved' } }),
      prisma.aclEvolutionSnapshot.findFirst({ where: { tenantId }, orderBy: { snapshotDate: 'desc' } }),
    ])

    const openInsights = openToolInsights + openAgentInsights + openPolicyInsights
    const appliedInsights = appliedToolInsights + appliedAgentInsights

    const { score, grade, summary } = calculateLearningScore({
      totalEvents, successEvents, failureEvents,
      feedbackPositive: positiveFeedback, feedbackNegative: negativeFeedback,
      openInsights, appliedInsights,
    })

    const topSuggestions = generateTopSuggestions(openToolInsights, openAgentInsights, openPolicyInsights, pendingKgFeedback)
    const dashboardSummary = generateLearningSummary(score, grade, totalEvents, appliedInsights)

    const recentEvents = await prisma.aclLearningEvent.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return {
      summary: dashboardSummary,
      learningScore: { score, grade },
      stats: {
        totalEvents, successEvents, failureEvents,
        positiveFeedback, negativeFeedback,
        openInsights, appliedInsights,
        pendingKgFeedback, approvedKgFeedback,
        latestEvolutionScore: latestSnapshot?.overallScore ?? null,
        latestEvolutionTrend: latestSnapshot?.trend ?? null,
      },
      topSuggestions,
      recentEvents,
    }
  })

  // ── Learning Events ───────────────────────────────────────────────────────────

  app.get('/events', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string; userId: string }
    const { eventType, sourceModule, outcome, limit } = req.query as { eventType?: string; sourceModule?: string; outcome?: string; limit?: string }

    const where: Record<string, unknown> = { tenantId }
    if (eventType) where.eventType = eventType
    if (sourceModule) where.sourceModule = sourceModule
    if (outcome) where.outcome = outcome

    const events = await prisma.aclLearningEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit ?? '50'), 200),
    })

    return { events, total: events.length }
  })

  app.post('/events', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as {
      eventType: string; sourceModule: string; sourceId?: string; outcome?: string
      inputContext?: Record<string, unknown>; outputContext?: Record<string, unknown>
      metrics?: Record<string, unknown>; feedback?: string
    }

    const event = await prisma.aclLearningEvent.create({
      data: {
        tenantId,
        eventType: body.eventType,
        sourceModule: body.sourceModule,
        sourceId: body.sourceId,
        outcome: body.outcome ?? 'success',
        inputContext: (body.inputContext ?? {}) as never,
        outputContext: (body.outputContext ?? {}) as never,
        metrics: (body.metrics ?? {}) as never,
        feedback: body.feedback,
      },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'learning', entityType: 'AclLearningEvent', entityId: event.id, newValues: { eventType: event.eventType, outcome: event.outcome } as never } }).catch(() => null)

    // If this is a tool execution event with output, generate KG feedback proposals
    if (body.eventType === 'tool_execution' && body.sourceId && body.inputContext && body.outputContext) {
      const proposals = generateKgFeedbackFromToolExecution(body.sourceId, body.inputContext, body.outputContext as Record<string, unknown>)
      for (const p of proposals) {
        await prisma.aclKgFeedback.create({
          data: { tenantId, feedbackType: p.feedbackType, sourceModule: p.sourceModule, proposedData: p.proposedData as never, confidence: p.confidence, status: 'pending' },
        }).catch(() => null)
      }
    }

    return event
  })

  app.patch('/events/:id/feedback', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = req.body as { feedback: 'thumbs_up' | 'thumbs_down' }

    const event = await prisma.aclLearningEvent.findFirst({ where: { tenantId, id } })
    if (!event) return { error: 'Event not found' }

    const updated = await prisma.aclLearningEvent.update({ where: { id }, data: { feedback: body.feedback } })
    return updated
  })

  // ── Tool Insights ─────────────────────────────────────────────────────────────

  app.get('/insights/tools', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string; userId: string }
    const { status, severity } = req.query as { status?: string; severity?: string }

    const where: Record<string, unknown> = { tenantId }
    if (status) where.status = status
    if (severity) where.severity = severity

    const insights = await prisma.aclToolInsight.findMany({
      where,
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      include: { tenant: { select: { name: true } } },
    })

    return { insights, total: insights.length }
  })

  app.post('/insights/tools/analyze', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }

    const tools = await prisma.ualTool.findMany({
      where: { tenantId, status: 'active' },
      include: { executions: true },
    })

    const created: { id: string; title: string }[] = []

    for (const tool of tools) {
      if (tool.totalCalls < 5) continue

      const failed = tool.executions.filter(e => e.status === 'failed').length
      const blocked = tool.executions.filter(e => e.status === 'blocked').length

      const insightResults = analyzeToolPerformance(tool.slug, tool.category, {
        totalCalls: tool.totalCalls,
        successRate: tool.totalCalls > 0 ? (tool.totalCalls - failed) / tool.totalCalls : 1,
        avgDurationMs: tool.avgDurationMs ?? 0,
        totalCost: tool.totalCost,
        failureRate: tool.totalCalls > 0 ? failed / tool.totalCalls : 0,
        blockedRate: tool.totalCalls > 0 ? blocked / tool.totalCalls : 0,
      })

      for (const r of insightResults) {
        const existing = await prisma.aclToolInsight.findFirst({ where: { tenantId, toolId: tool.id, insightType: r.insightType, status: 'open' } })
        if (existing) continue

        const insight = await prisma.aclToolInsight.create({
          data: {
            tenantId, toolId: tool.id,
            insightType: r.insightType, severity: r.severity,
            title: r.title, description: r.description,
            suggestions: r.suggestions as never, metrics: r.metrics as never,
            status: 'open',
          },
        })
        created.push({ id: insight.id, title: insight.title })
      }
    }

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'ANALYZE', module: 'learning', entityType: 'AclToolInsight', entityId: tenantId, newValues: { insightsCreated: created.length } as never } }).catch(() => null)

    return { insightsCreated: created.length, insights: created }
  })

  app.patch('/insights/tools/:id', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = req.body as { status: string }

    const insight = await prisma.aclToolInsight.findFirst({ where: { tenantId, id } })
    if (!insight) return { error: 'Insight not found' }

    const updated = await prisma.aclToolInsight.update({
      where: { id },
      data: { status: body.status, appliedAt: body.status === 'applied' ? new Date() : undefined },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE', module: 'learning', entityType: 'AclToolInsight', entityId: id, newValues: { status: body.status } as never } }).catch(() => null)

    return updated
  })

  // ── Agent Insights ────────────────────────────────────────────────────────────

  app.get('/insights/agents', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string; userId: string }
    const { status, severity } = req.query as { status?: string; severity?: string }

    const where: Record<string, unknown> = { tenantId }
    if (status) where.status = status
    if (severity) where.severity = severity

    const insights = await prisma.aclAgentInsight.findMany({
      where,
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    })

    return { insights, total: insights.length }
  })

  app.post('/insights/agents/analyze', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }

    const agents = await prisma.eapAgent.findMany({
      where: { tenantId, status: 'active' },
      include: { tasks: true },
    })

    const created: { id: string; title: string }[] = []

    for (const agent of agents) {
      if (agent.totalTasks < 3) continue

      const completed = agent.tasks.filter(t => t.status === 'completed').length
      const failed = agent.tasks.filter(t => t.status === 'failed').length
      const avgDurationMs = agent.tasks.length > 0
        ? agent.tasks.reduce((s, t) => s + (t.durationMs ?? 0), 0) / agent.tasks.length
        : 0

      const insightResults = analyzeAgentPerformance(agent.name, {
        agentType: agent.type,
        totalTasks: agent.totalTasks,
        completedTasks: completed,
        failedTasks: failed,
        totalCost: agent.totalCost,
        avgDurationMs,
      })

      for (const r of insightResults) {
        const existing = await prisma.aclAgentInsight.findFirst({ where: { tenantId, agentId: agent.id, insightType: r.insightType, status: 'open' } })
        if (existing) continue

        const insight = await prisma.aclAgentInsight.create({
          data: {
            tenantId, agentId: agent.id,
            insightType: r.insightType, severity: r.severity,
            title: r.title, description: r.description,
            suggestions: r.suggestions as never, metrics: r.metrics as never,
            status: 'open',
          },
        })
        created.push({ id: insight.id, title: insight.title })
      }
    }

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'ANALYZE', module: 'learning', entityType: 'AclAgentInsight', entityId: tenantId, newValues: { insightsCreated: created.length } as never } }).catch(() => null)

    return { insightsCreated: created.length, insights: created }
  })

  app.patch('/insights/agents/:id', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = req.body as { status: string }

    const insight = await prisma.aclAgentInsight.findFirst({ where: { tenantId, id } })
    if (!insight) return { error: 'Insight not found' }

    const updated = await prisma.aclAgentInsight.update({
      where: { id },
      data: { status: body.status, appliedAt: body.status === 'applied' ? new Date() : undefined },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE', module: 'learning', entityType: 'AclAgentInsight', entityId: id, newValues: { status: body.status } as never } }).catch(() => null)

    return updated
  })

  // ── Policy Insights ───────────────────────────────────────────────────────────

  app.get('/insights/policies', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string; userId: string }

    const insights = await prisma.aclPolicyInsight.findMany({
      where: { tenantId },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    })

    return { insights, total: insights.length }
  })

  app.post('/insights/policies/analyze', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }

    const policies = await prisma.ualExecutionPolicy.findMany({ where: { tenantId } })

    const results = analyzePolicies(policies.map(p => ({
      id: p.id, name: p.name, toolId: p.toolId, subjectType: p.subjectType,
      subjectId: p.subjectId, action: p.action, priority: p.priority, isActive: p.isActive,
    })))

    const created: { id: string; title: string }[] = []

    for (const r of results) {
      const existing = await prisma.aclPolicyInsight.findFirst({ where: { tenantId, insightType: r.insightType, status: 'open' } })
      if (existing) continue

      const insight = await prisma.aclPolicyInsight.create({
        data: {
          tenantId, insightType: r.insightType, severity: r.severity,
          title: r.title, description: r.description,
          affectedPolicies: r.affectedPolicies as never, suggestion: r.suggestion,
          status: 'open',
        },
      })
      created.push({ id: insight.id, title: insight.title })
    }

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'ANALYZE', module: 'learning', entityType: 'AclPolicyInsight', entityId: tenantId, newValues: { insightsCreated: created.length } as never } }).catch(() => null)

    return { insightsCreated: created.length, insights: created }
  })

  app.patch('/insights/policies/:id', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = req.body as { status: string }

    const insight = await prisma.aclPolicyInsight.findFirst({ where: { tenantId, id } })
    if (!insight) return { error: 'Insight not found' }

    const updated = await prisma.aclPolicyInsight.update({
      where: { id },
      data: { status: body.status, resolvedAt: body.status === 'applied' ? new Date() : undefined },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'UPDATE', module: 'learning', entityType: 'AclPolicyInsight', entityId: id, newValues: { status: body.status } as never } }).catch(() => null)

    return updated
  })

  // ── Knowledge Graph Feedback ──────────────────────────────────────────────────

  app.get('/kg-feedback', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string; userId: string }
    const { status } = req.query as { status?: string }

    const where: Record<string, unknown> = { tenantId }
    if (status) where.status = status

    const feedback = await prisma.aclKgFeedback.findMany({
      where,
      orderBy: [{ confidence: 'desc' }, { createdAt: 'desc' }],
    })

    return { feedback, total: feedback.length }
  })

  app.post('/kg-feedback', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { feedbackType: string; sourceModule: string; proposedData: Record<string, unknown>; confidence?: number }

    const item = await prisma.aclKgFeedback.create({
      data: {
        tenantId, feedbackType: body.feedbackType, sourceModule: body.sourceModule,
        proposedData: body.proposedData as never, confidence: body.confidence ?? 50, status: 'pending',
      },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'CREATE', module: 'learning', entityType: 'AclKgFeedback', entityId: item.id, newValues: { feedbackType: item.feedbackType } as never } }).catch(() => null)

    return item
  })

  app.patch('/kg-feedback/:id/review', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const { id } = req.params as { id: string }
    const body = req.body as { status: 'approved' | 'rejected'; reviewNote?: string }

    const item = await prisma.aclKgFeedback.findFirst({ where: { tenantId, id } })
    if (!item) return { error: 'Feedback item not found' }

    const updated = await prisma.aclKgFeedback.update({
      where: { id },
      data: { status: body.status, reviewedBy: userId, reviewNote: body.reviewNote, reviewedAt: new Date() },
    })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: body.status === 'approved' ? 'APPROVE' : 'REJECT', module: 'learning', entityType: 'AclKgFeedback', entityId: id, newValues: { status: body.status } as never } }).catch(() => null)

    return updated
  })

  // ── Evolution Snapshots ───────────────────────────────────────────────────────

  app.get('/evolution', async (req) => {
    const { tenantId } = req as unknown as { tenantId: string; userId: string }
    const { limit } = req.query as { limit?: string }

    const snapshots = await prisma.aclEvolutionSnapshot.findMany({
      where: { tenantId },
      orderBy: { snapshotDate: 'desc' },
      take: Math.min(parseInt(limit ?? '30'), 90),
    })

    return { snapshots, total: snapshots.length }
  })

  app.post('/evolution/snapshot', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }
    const body = req.body as { period?: string; notes?: string }
    const period = body.period ?? 'daily'
    const today = new Date(); today.setHours(0, 0, 0, 0)

    // Check for existing snapshot today
    const existing = await prisma.aclEvolutionSnapshot.findFirst({ where: { tenantId, snapshotDate: today, period } })

    // Gather metrics
    const [
      totalTools, activeTools, totalExec, successExec, costAgg,
      totalAgents, activeAgents, totalTasks, completedTasks, agentCostAgg,
      totalEntities, totalRelations, totalFacts, pendingKgFeedback,
      totalPolicies, activePolicies, blockedExec, openPolicyInsights,
    ] = await Promise.all([
      prisma.ualTool.count({ where: { tenantId } }),
      prisma.ualTool.count({ where: { tenantId, status: 'active' } }),
      prisma.ualToolExecution.count({ where: { tenantId } }),
      prisma.ualToolExecution.count({ where: { tenantId, status: 'completed' } }),
      prisma.ualToolExecution.aggregate({ where: { tenantId }, _sum: { cost: true } }),
      prisma.eapAgent.count({ where: { tenantId } }),
      prisma.eapAgent.count({ where: { tenantId, status: 'active' } }),
      prisma.eapAgentTask.count({ where: { tenantId } }),
      prisma.eapAgentTask.count({ where: { tenantId, status: 'completed' } }),
      prisma.eapAgent.aggregate({ where: { tenantId }, _sum: { totalCost: true } }),
      prisma.kgEntity.count({ where: { tenantId } }),
      prisma.kgRelation.count({ where: { tenantId } }),
      prisma.kgFact.count({ where: { tenantId } }),
      prisma.aclKgFeedback.count({ where: { tenantId, status: 'pending' } }),
      prisma.ualExecutionPolicy.count({ where: { tenantId } }),
      prisma.ualExecutionPolicy.count({ where: { tenantId, isActive: true } }),
      prisma.ualToolExecution.count({ where: { tenantId, status: 'blocked' } }),
      prisma.aclPolicyInsight.count({ where: { tenantId, status: 'open' } }),
    ])

    const evMetrics = {
      toolMetrics: {
        totalTools, activeTools, totalExecutions: totalExec,
        successRate: totalExec > 0 ? successExec / totalExec : 1,
        avgCostPerExecution: totalExec > 0 ? (costAgg._sum.cost ?? 0) / totalExec : 0,
      },
      agentMetrics: {
        totalAgents, activeAgents, totalTasks,
        completionRate: totalTasks > 0 ? completedTasks / totalTasks : 1,
        avgTaskCost: totalAgents > 0 ? (agentCostAgg._sum.totalCost ?? 0) / totalAgents : 0,
      },
      kgMetrics: { totalEntities, totalRelations, totalFacts, pendingFeedback: pendingKgFeedback },
      policyMetrics: { totalPolicies, activePolicies, blockedExecutions: blockedExec, insightCount: openPolicyInsights },
    }

    const { score, notes } = calculateEvolutionScore(evMetrics)

    // Determine trend by comparing to previous snapshot
    const previous = await prisma.aclEvolutionSnapshot.findFirst({
      where: { tenantId, period, snapshotDate: { lt: today } },
      orderBy: { snapshotDate: 'desc' },
    })
    const trend = determineEvolutionTrend(score, previous?.overallScore ?? null)

    const data = {
      tenantId, snapshotDate: today, period,
      toolMetrics: evMetrics.toolMetrics as never,
      agentMetrics: evMetrics.agentMetrics as never,
      kgMetrics: evMetrics.kgMetrics as never,
      policyMetrics: evMetrics.policyMetrics as never,
      overallScore: score, trend,
      notes: [...notes, ...(body.notes ? [body.notes] : [])].join(' · ') || undefined,
    }

    const snapshot = existing
      ? await prisma.aclEvolutionSnapshot.update({ where: { id: existing.id }, data })
      : await prisma.aclEvolutionSnapshot.create({ data })

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'SNAPSHOT', module: 'learning', entityType: 'AclEvolutionSnapshot', entityId: snapshot.id, newValues: { score, trend, period } as never } }).catch(() => null)

    return { snapshot, score, trend, notes }
  })

  // ── Run Full Optimization Scan ────────────────────────────────────────────────

  app.post('/run-optimization', async (req) => {
    const { tenantId, userId } = req as unknown as { tenantId: string; userId: string }

    const results = { toolInsights: 0, agentInsights: 0, policyInsights: 0, kgFeedback: 0 }

    // Tool analysis
    const tools = await prisma.ualTool.findMany({ where: { tenantId, status: 'active' }, include: { executions: true } })
    for (const tool of tools) {
      if (tool.totalCalls < 5) continue
      const failed = tool.executions.filter(e => e.status === 'failed').length
      const blocked = tool.executions.filter(e => e.status === 'blocked').length
      const insights = analyzeToolPerformance(tool.slug, tool.category, {
        totalCalls: tool.totalCalls, successRate: tool.totalCalls > 0 ? (tool.totalCalls - failed) / tool.totalCalls : 1,
        avgDurationMs: tool.avgDurationMs ?? 0, totalCost: tool.totalCost,
        failureRate: tool.totalCalls > 0 ? failed / tool.totalCalls : 0,
        blockedRate: tool.totalCalls > 0 ? blocked / tool.totalCalls : 0,
      })
      for (const r of insights) {
        const ex = await prisma.aclToolInsight.findFirst({ where: { tenantId, toolId: tool.id, insightType: r.insightType, status: 'open' } })
        if (ex) continue
        await prisma.aclToolInsight.create({ data: { tenantId, toolId: tool.id, insightType: r.insightType, severity: r.severity, title: r.title, description: r.description, suggestions: r.suggestions as never, metrics: r.metrics as never, status: 'open' } })
        results.toolInsights++
      }
    }

    // Agent analysis
    const agents = await prisma.eapAgent.findMany({ where: { tenantId, status: 'active' }, include: { tasks: true } })
    for (const agent of agents) {
      if (agent.totalTasks < 3) continue
      const completed = agent.tasks.filter(t => t.status === 'completed').length
      const failed = agent.tasks.filter(t => t.status === 'failed').length
      const avgDur = agent.tasks.length > 0 ? agent.tasks.reduce((s, t) => s + (t.durationMs ?? 0), 0) / agent.tasks.length : 0
      const insights = analyzeAgentPerformance(agent.name, { agentType: agent.type, totalTasks: agent.totalTasks, completedTasks: completed, failedTasks: failed, totalCost: agent.totalCost, avgDurationMs: avgDur })
      for (const r of insights) {
        const ex = await prisma.aclAgentInsight.findFirst({ where: { tenantId, agentId: agent.id, insightType: r.insightType, status: 'open' } })
        if (ex) continue
        await prisma.aclAgentInsight.create({ data: { tenantId, agentId: agent.id, insightType: r.insightType, severity: r.severity, title: r.title, description: r.description, suggestions: r.suggestions as never, metrics: r.metrics as never, status: 'open' } })
        results.agentInsights++
      }
    }

    // Policy analysis
    const policies = await prisma.ualExecutionPolicy.findMany({ where: { tenantId } })
    const policyResults = analyzePolicies(policies.map(p => ({ id: p.id, name: p.name, toolId: p.toolId, subjectType: p.subjectType, subjectId: p.subjectId, action: p.action, priority: p.priority, isActive: p.isActive })))
    for (const r of policyResults) {
      const ex = await prisma.aclPolicyInsight.findFirst({ where: { tenantId, insightType: r.insightType, status: 'open' } })
      if (ex) continue
      await prisma.aclPolicyInsight.create({ data: { tenantId, insightType: r.insightType, severity: r.severity, title: r.title, description: r.description, affectedPolicies: r.affectedPolicies as never, suggestion: r.suggestion, status: 'open' } })
      results.policyInsights++
    }

    await prisma.sysAuditLog.create({ data: { tenantId, userId, action: 'OPTIMIZE', module: 'learning', entityType: 'LearningPlatform', entityId: tenantId, newValues: results as never } }).catch(() => null)

    return { success: true, results, totalInsightsCreated: results.toolInsights + results.agentInsights + results.policyInsights }
  })
}
