import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'
import { buildContext, buildPromptContext } from './services/context-builder.js'
import { universalSearch } from './services/universal-search.js'
import { executeTask, buildSteps } from './services/task-executor.js'
import { processDocument } from './services/document-analyzer.js'
import { runRenoBrain, isProviderEnabled } from './services/reno-brain.js'

export async function aiWorkspaceRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Summary / Dashboard ──────────────────────────────────────────────────────
  app.get('/summary', async (req) => {
    const { tenantId, userId } = req
    const [activeSessions, pendingTasks, documents, memories, recentSearches] = await Promise.all([
      prisma.aiwSession.count({ where: { tenantId, userId, status: 'active' } }),
      prisma.aiwTask.count({ where: { tenantId, userId, status: { in: ['pending_approval', 'running'] } } }),
      prisma.aiwDocument.count({ where: { tenantId, userId } }),
      prisma.aiwMemory.count({ where: { tenantId, userId } }),
      prisma.aiwSearchLog.count({ where: { tenantId, userId } }),
    ])
    return { success: true, data: { activeSessions, pendingTasks, documents, memories, recentSearches } }
  })

  app.get('/dashboard', async (req) => {
    const { tenantId, userId } = req
    const [sessions, tasks, recentDocs, recentMemory] = await Promise.all([
      prisma.aiwSession.findMany({
        where: { tenantId, userId, status: 'active' },
        orderBy: { updatedAt: 'desc' }, take: 5,
        select: { id: true, title: true, provider: true, updatedAt: true, _count: { select: { messages: true } } },
      }),
      prisma.aiwTask.findMany({
        where: { tenantId, userId, status: { in: ['pending_approval', 'running', 'completed'] } },
        orderBy: { updatedAt: 'desc' }, take: 5,
        select: { id: true, title: true, status: true, updatedAt: true },
      }),
      prisma.aiwDocument.findMany({
        where: { tenantId, userId },
        orderBy: { createdAt: 'desc' }, take: 5,
        select: { id: true, name: true, type: true, status: true, createdAt: true },
      }),
      prisma.aiwMemory.findMany({
        where: { tenantId, userId, type: { in: ['project', 'favorite'] } },
        orderBy: { updatedAt: 'desc' }, take: 10,
        select: { id: true, type: true, key: true, value: true },
      }),
    ])
    return { success: true, data: { sessions, tasks, recentDocs, memory: recentMemory } }
  })

  // ── Command Center ───────────────────────────────────────────────────────────
  app.post('/command', async (req) => {
    const { tenantId, userId } = req
    const body = req.body as { message: string; sessionId?: string; provider?: string }
    const { message, provider = 'reno-brain' } = body

    if (!message?.trim()) return { success: false, error: 'Message is required' }

    // Respect provider rules: external providers need explicit tenant opt-in
    let resolvedProvider: 'reno-brain' | 'claude' | 'openai' = 'reno-brain'
    if (provider === 'claude' || provider === 'openai') {
      const enabled = await isProviderEnabled(tenantId, provider)
      if (!enabled) {
        return {
          success: false,
          error: `Provider '${provider}' is not enabled for this tenant. Tenant admin must enable it in AI Settings.`,
          fallback: 'reno-brain',
        }
      }
      resolvedProvider = provider
    }

    // Get or create session
    let session = body.sessionId
      ? await prisma.aiwSession.findFirst({ where: { id: body.sessionId, tenantId } })
      : null

    if (!session) {
      session = await prisma.aiwSession.create({
        data: {
          tenantId, userId, provider: resolvedProvider,
          title: message.substring(0, 100),
          status: 'active',
        },
      })
    }

    // Build context and run AI
    const ctx = await buildContext(tenantId, userId)
    const prompt = buildPromptContext(ctx, message)
    const aiResponse = await runRenoBrain(prompt, `Session: ${session.id}`)

    // Store user message + AI response
    await prisma.aiwMessage.createMany({
      data: [
        { sessionId: session.id, role: 'user', content: message },
        {
          sessionId: session.id, role: 'assistant',
          content: aiResponse.content, provider: aiResponse.provider,
          tokens: aiResponse.tokens,
        },
      ],
    })

    // Update session timestamp
    await prisma.aiwSession.update({ where: { id: session.id }, data: { updatedAt: new Date() } })

    // Audit log
    await prisma.sysAuditLog.create({
      data: {
        tenantId, userId, action: 'AI_COMMAND', module: 'ai-workspace',
        entityType: 'AiwSession', entityId: session.id,
        newValues: { provider: resolvedProvider, tokens: aiResponse.tokens, messageLength: message.length },
      },
    }).catch(() => null)

    return {
      success: true,
      data: {
        sessionId: session.id,
        reply: aiResponse.content,
        provider: aiResponse.provider,
        tokens: aiResponse.tokens,
      },
    }
  })

  // ── Phase 38 Sessions (AiwSession model) ─────────────────────────────────────
  app.get('/p38/sessions', async (req) => {
    const { tenantId, userId } = req
    const sessions = await prisma.aiwSession.findMany({
      where: { tenantId, userId },
      include: { _count: { select: { messages: true } } },
      orderBy: { updatedAt: 'desc' }, take: 20,
    })
    return { success: true, data: sessions }
  })

  app.get('/p38/sessions/:id', async (req) => {
    const { tenantId, userId } = req
    const { id } = req.params as { id: string }
    const session = await prisma.aiwSession.findFirst({
      where: { id, tenantId, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })
    if (!session) return { success: false, error: 'Session not found' }
    return { success: true, data: session }
  })

  app.delete('/p38/sessions/:id', async (req) => {
    const { tenantId, userId } = req
    const { id } = req.params as { id: string }
    await prisma.aiwSession.update({ where: { id }, data: { status: 'archived' } })
    await prisma.sysAuditLog.create({
      data: { tenantId, userId, action: 'AI_SESSION_ARCHIVED', module: 'ai-workspace', entityType: 'AiwSession', entityId: id },
    }).catch(() => null)
    return { success: true }
  })

  // ── Universal Search ──────────────────────────────────────────────────────────
  app.get('/universal-search', async (req) => {
    const { tenantId, userId } = req
    const q = req.query as { q?: string }
    if (!q.q?.trim()) return { success: false, error: 'Query required' }

    const start = Date.now()
    const { results, modules, totalCount } = await universalSearch(tenantId, q.q)
    const durationMs = Date.now() - start

    await prisma.aiwSearchLog.create({
      data: { tenantId, userId, query: q.q, modules, resultCount: totalCount, durationMs },
    })

    return { success: true, data: { query: q.q, results, modules, totalCount, durationMs } }
  })

  app.get('/universal-search/history', async (req) => {
    const { tenantId, userId } = req
    const history = await prisma.aiwSearchLog.findMany({
      where: { tenantId, userId },
      orderBy: { createdAt: 'desc' }, take: 20,
      select: { id: true, query: true, resultCount: true, modules: true, createdAt: true },
    })
    return { success: true, data: history }
  })

  // ── Workspace Memory (Phase 38 AiwMemory model) ───────────────────────────────
  app.get('/workspace-memory', async (req) => {
    const { tenantId, userId } = req
    const q = req.query as { type?: string }
    const where: Record<string, unknown> = { tenantId, userId }
    if (q.type) where.type = q.type
    const memory = await prisma.aiwMemory.findMany({ where: where as never, orderBy: { updatedAt: 'desc' } })
    return { success: true, data: memory }
  })

  app.post('/workspace-memory', async (req) => {
    const { tenantId, userId } = req
    const body = req.body as { type: string; key: string; value: Record<string, unknown>; expiresAt?: string }
    const jsonValue = body.value as never
    const mem = await prisma.aiwMemory.upsert({
      where: { tenantId_userId_type_key: { tenantId, userId, type: body.type, key: body.key } },
      create: {
        tenantId, userId, type: body.type, key: body.key, value: jsonValue,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      },
      update: { value: jsonValue, updatedAt: new Date() },
    })
    return { success: true, data: mem }
  })

  app.delete('/workspace-memory/:id', async (req) => {
    const { id } = req.params as { id: string }
    await prisma.aiwMemory.delete({ where: { id } })
    return { success: true }
  })

  // ── Tasks (Task Executor) ─────────────────────────────────────────────────────
  app.get('/tasks', async (req) => {
    const { tenantId, userId } = req
    const q = req.query as { status?: string }
    const where: Record<string, unknown> = { tenantId, userId }
    if (q.status) where.status = q.status
    const tasks = await prisma.aiwTask.findMany({
      where: where as never, orderBy: { createdAt: 'desc' }, take: 20,
    })
    return { success: true, data: tasks }
  })

  app.post('/tasks', async (req) => {
    const { tenantId, userId } = req
    const body = req.body as { title: string; description: string; sessionId?: string }
    const steps = buildSteps(body.description || body.title)
    const task = await prisma.aiwTask.create({
      data: {
        tenantId, userId, title: body.title, description: body.description,
        sessionId: body.sessionId ?? undefined,
        steps: steps as never, status: 'pending_approval',
      },
    })
    await prisma.sysAuditLog.create({
      data: {
        tenantId, userId, action: 'AI_TASK_CREATED', module: 'ai-workspace',
        entityType: 'AiwTask', entityId: task.id,
        newValues: { title: body.title, steps: steps.length },
      },
    }).catch(() => null)
    return { success: true, data: task }
  })

  app.get('/tasks/:id', async (req) => {
    const { tenantId } = req
    const { id } = req.params as { id: string }
    const task = await prisma.aiwTask.findFirst({ where: { id, tenantId } })
    if (!task) return { success: false, error: 'Task not found' }
    return { success: true, data: task }
  })

  app.post('/tasks/:id/approve', async (req) => {
    const { tenantId, userId } = req
    const { id } = req.params as { id: string }
    const task = await prisma.aiwTask.findFirst({ where: { id, tenantId } })
    if (!task) return { success: false, error: 'Task not found' }
    if (task.status !== 'pending_approval') return { success: false, error: `Cannot approve task in status: ${task.status}` }

    await prisma.sysAuditLog.create({
      data: {
        tenantId, userId, action: 'AI_TASK_APPROVED', module: 'ai-workspace',
        entityType: 'AiwTask', entityId: id,
        newValues: { title: task.title },
      },
    }).catch(() => null)

    // Execute async (non-blocking)
    executeTask(id, userId).catch(async (err) => {
      await prisma.aiwTask.update({ where: { id }, data: { status: 'failed', result: { error: String(err) } as never } })
    })

    return { success: true, data: { taskId: id, status: 'running', message: 'Task approved and execution started.' } }
  })

  app.post('/tasks/:id/cancel', async (req) => {
    const { tenantId, userId } = req
    const { id } = req.params as { id: string }
    const task = await prisma.aiwTask.update({
      where: { id }, data: { status: 'cancelled', updatedAt: new Date() },
    })
    await prisma.sysAuditLog.create({
      data: {
        tenantId, userId, action: 'AI_TASK_CANCELLED', module: 'ai-workspace',
        entityType: 'AiwTask', entityId: id,
        newValues: { title: task.title },
      },
    }).catch(() => null)
    return { success: true, data: task }
  })

  // ── Documents ─────────────────────────────────────────────────────────────────
  app.get('/documents', async (req) => {
    const { tenantId, userId } = req
    const docs = await prisma.aiwDocument.findMany({
      where: { tenantId, userId }, orderBy: { createdAt: 'desc' }, take: 20,
    })
    return { success: true, data: docs }
  })

  app.post('/documents/analyze', async (req) => {
    const { tenantId, userId } = req
    const body = req.body as { name: string; type: string; content: string; sizeBytes?: number }

    if (!body.content?.trim()) return { success: false, error: 'Document content is required' }
    if (!['pdf', 'word', 'excel', 'markdown', 'text', 'code'].includes(body.type)) {
      return { success: false, error: 'Invalid document type. Use: pdf, word, excel, markdown, text, code' }
    }

    // Permission gate — user must have provided content (consent implied by submission)
    const doc = await prisma.aiwDocument.create({
      data: {
        tenantId, userId, name: body.name, type: body.type,
        sizeBytes: body.sizeBytes, status: 'processing',
      },
    })

    await prisma.sysAuditLog.create({
      data: {
        tenantId, userId, action: 'AI_DOCUMENT_ANALYZED', module: 'ai-workspace',
        entityType: 'AiwDocument', entityId: doc.id,
        newValues: { name: body.name, type: body.type },
      },
    }).catch(() => null)

    await processDocument(doc.id, body.content, body.type as never)
    const updated = await prisma.aiwDocument.findUnique({ where: { id: doc.id } })

    return { success: true, data: updated }
  })

  app.get('/documents/:id', async (req) => {
    const { tenantId, userId } = req
    const { id } = req.params as { id: string }
    const doc = await prisma.aiwDocument.findFirst({ where: { id, tenantId, userId } })
    if (!doc) return { success: false, error: 'Document not found' }
    return { success: true, data: doc }
  })

  // ── Context Builder ───────────────────────────────────────────────────────────
  app.get('/context', async (req) => {
    const { tenantId, userId } = req
    const ctx = await buildContext(tenantId, userId)
    return { success: true, data: ctx }
  })

  // ── Developer Workspace (code review — read-only, never auto-commits) ─────────
  app.post('/dev/review', async (req) => {
    const { tenantId, userId } = req
    const body = req.body as { code: string; language?: string; question?: string }

    if (!body.code?.trim()) return { success: false, error: 'Code content is required' }

    const question = body.question ?? 'Please review this code and explain what it does, identify any issues, and suggest improvements.'
    const prompt = `Language: ${body.language ?? 'unknown'}\n\nCode:\n\`\`\`\n${body.code.substring(0, 4000)}\n\`\`\`\n\n${question}`
    const ctx = await buildContext(tenantId, userId)
    const aiResponse = await runRenoBrain(prompt, buildPromptContext(ctx, 'code review'))

    await prisma.sysAuditLog.create({
      data: {
        tenantId, userId, action: 'AI_CODE_REVIEWED', module: 'ai-workspace',
        entityType: 'DevWorkspace',
        newValues: { language: body.language ?? 'unknown', codeLength: body.code.length },
      },
    }).catch(() => null)

    return {
      success: true,
      data: {
        review: aiResponse.content,
        provider: aiResponse.provider,
        warning: 'Reno AI never commits code automatically. Review suggestions carefully before applying.',
      },
    }
  })

  // ── Spreadsheet Intelligence ──────────────────────────────────────────────────
  app.post('/spreadsheet/analyze', async (req) => {
    const { tenantId, userId } = req
    const body = req.body as { name: string; headers: string[]; sampleRows: unknown[][]; question?: string }

    const prompt = `Spreadsheet: "${body.name}"
Headers: ${body.headers.join(', ')}
Sample data (${body.sampleRows.length} rows): ${JSON.stringify(body.sampleRows.slice(0, 5))}

${body.question ?? 'Analyze this spreadsheet: explain the data structure, identify patterns, and suggest useful reports or charts.'}`

    const ctx = await buildContext(tenantId, userId)
    const aiResponse = await runRenoBrain(prompt, buildPromptContext(ctx, 'spreadsheet analysis'))

    return {
      success: true,
      data: {
        analysis: aiResponse.content,
        provider: aiResponse.provider,
        suggestions: [
          'Create a pivot table for summary statistics',
          'Add data validation to prevent input errors',
          'Consider a line chart for time-series columns',
        ],
      },
    }
  })
}
