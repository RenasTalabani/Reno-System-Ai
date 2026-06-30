import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'
import { createProposal, approveAndExecute, rejectProposal } from './tools/proposal-engine.js'
import type { ToolName } from './tools/proposal-engine.js'

export async function liveToolsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Summary ──────────────────────────────────────────────────────────────────
  app.get('/summary', async (req) => {
    const { tenantId, userId } = req
    const [pending, executed, rejected, total] = await Promise.all([
      prisma.awltProposal.count({ where: { tenantId, userId, status: 'pending_approval' } }),
      prisma.awltProposal.count({ where: { tenantId, userId, status: 'executed' } }),
      prisma.awltProposal.count({ where: { tenantId, userId, status: 'rejected' } }),
      prisma.awltProposal.count({ where: { tenantId, userId } }),
    ])
    return { success: true, data: { pending, executed, rejected, total } }
  })

  // ── Proposals (central workflow) ──────────────────────────────────────────────
  app.get('/proposals', async (req) => {
    const { tenantId, userId } = req
    const q = req.query as { tool?: string; status?: string }
    const where: Record<string, unknown> = { tenantId, userId }
    if (q.tool) where.tool = q.tool
    if (q.status) where.status = q.status
    const proposals = await prisma.awltProposal.findMany({
      where: where as never, orderBy: { createdAt: 'desc' }, take: 30,
    })
    return { success: true, data: proposals }
  })

  app.get('/proposals/:id', async (req) => {
    const { tenantId } = req
    const { id } = req.params as { id: string }
    const p = await prisma.awltProposal.findFirst({
      where: { id, tenantId }, include: { logs: true },
    })
    if (!p) return { success: false, error: 'Proposal not found' }
    return { success: true, data: p }
  })

  app.post('/proposals/:id/approve', async (req) => {
    const { tenantId, userId } = req
    const { id } = req.params as { id: string }
    const { result, log } = await approveAndExecute(id, tenantId, userId)
    return { success: true, data: { proposalId: id, result, logId: (log as { id: string }).id } }
  })

  app.post('/proposals/:id/reject', async (req) => {
    const { tenantId, userId } = req
    const { id } = req.params as { id: string }
    const body = req.body as { reason?: string }
    await rejectProposal(id, tenantId, userId, body.reason)
    return { success: true, data: { proposalId: id, status: 'rejected' } }
  })

  // ── FILE TOOLS ────────────────────────────────────────────────────────────────

  app.post('/file/explore', async (req) => {
    const { tenantId, userId } = req
    const body = req.body as { path?: string }
    const proposal = await createProposal(tenantId, userId, 'file-explore',
      `Explore directory: ${body.path ?? '/'}`,
      { path: body.path ?? '/' },
      'Reno Brain will list directory contents. No files will be read or modified.',
      'File Explorer',
    )
    return { success: true, data: { proposal, message: 'Approve this proposal to view directory contents.' } }
  })

  app.post('/file/read', async (req) => {
    const { tenantId, userId } = req
    const body = req.body as { path: string; content?: string }
    if (!body.path) return { success: false, error: 'File path is required' }
    const proposal = await createProposal(tenantId, userId, 'file-read',
      `Read file: ${body.path}`,
      { path: body.path, content: body.content },
      `Reno Brain will read "${body.path}" to analyze and explain its contents. File will NOT be modified.`,
      'File Read (read-only)',
    )
    return { success: true, data: { proposal, message: 'Approve to allow Reno Brain to read this file.' } }
  })

  app.post('/file/permissions', async (req) => {
    const { tenantId, userId } = req
    const body = req.body as { path: string }
    const proposal = await createProposal(tenantId, userId, 'folder-permissions',
      `Check permissions: ${body.path}`,
      { path: body.path },
      'View folder/file permissions only. No changes will be made.',
    )
    return { success: true, data: { proposal } }
  })

  // ── GIT TOOLS ─────────────────────────────────────────────────────────────────

  app.post('/git/status', async (req) => {
    const { tenantId, userId } = req
    const body = req.body as { repoPath?: string; branch?: string }
    const proposal = await createProposal(tenantId, userId, 'git-status',
      `Git status: ${body.repoPath ?? 'current repo'}`,
      { repoPath: body.repoPath, branch: body.branch },
      'Read-only git status. No commits, pushes, or changes will be made.',
    )
    return { success: true, data: { proposal } }
  })

  app.post('/git/diff', async (req) => {
    const { tenantId, userId } = req
    const body = req.body as { repoPath?: string; file?: string; base?: string; head?: string }
    const proposal = await createProposal(tenantId, userId, 'git-diff',
      `Git diff: ${body.file ?? 'all files'}`,
      { repoPath: body.repoPath, file: body.file, base: body.base ?? 'HEAD~1', head: body.head ?? 'HEAD' },
      'View diff between commits or working tree. Read-only — no commits or changes.',
    )
    return { success: true, data: { proposal } }
  })

  app.post('/git/branches', async (req) => {
    const { tenantId, userId } = req
    const body = req.body as { repoPath?: string }
    const proposal = await createProposal(tenantId, userId, 'git-branches',
      'View git branches',
      { repoPath: body.repoPath },
      'List all local and remote branches. Read-only.',
    )
    return { success: true, data: { proposal } }
  })

  app.post('/git/pr-draft', async (req) => {
    const { tenantId, userId } = req
    const body = req.body as { title?: string; changes?: string[]; baseBranch?: string }
    const proposal = await createProposal(tenantId, userId, 'git-pr-draft',
      `Generate PR draft: ${body.title ?? 'New PR'}`,
      { title: body.title, changes: body.changes, baseBranch: body.baseBranch ?? 'main' },
      'Reno Brain will generate a pull request description based on the changes. PR will NOT be created until you approve and then trigger a separate GitHub action.',
    )
    return { success: true, data: { proposal } }
  })

  // ── CODE TOOLS ────────────────────────────────────────────────────────────────

  app.post('/code/explain', async (req) => {
    const { tenantId, userId } = req
    const body = req.body as { code: string; language?: string; question?: string }
    if (!body.code?.trim()) return { success: false, error: 'Code content is required' }
    const proposal = await createProposal(tenantId, userId, 'code-explain',
      `Explain ${body.language ?? 'code'} snippet (${body.code.length} chars)`,
      { code: body.code.substring(0, 4000), language: body.language, question: body.question },
      'Reno Brain will explain this code. No files will be modified and no commits will be made.',
    )
    return { success: true, data: { proposal } }
  })

  app.post('/code/refactor', async (req) => {
    const { tenantId, userId } = req
    const body = req.body as { code: string; language?: string; instructions?: string }
    if (!body.code?.trim()) return { success: false, error: 'Code is required' }
    const proposal = await createProposal(tenantId, userId, 'code-refactor',
      `Refactor proposal: ${body.language ?? 'code'} (${body.code.length} chars)`,
      { code: body.code.substring(0, 4000), language: body.language, instructions: body.instructions },
      'Reno Brain will SUGGEST a refactored version. The original code will NOT be changed. You must copy and apply the suggestion manually after reviewing.',
    )
    return { success: true, data: { proposal, warning: 'Refactored code is a SUGGESTION only — Reno never auto-modifies files.' } }
  })

  // ── DOCUMENT TOOLS ────────────────────────────────────────────────────────────

  app.post('/documents/excel', async (req) => {
    const { tenantId, userId } = req
    const body = req.body as { fileName: string; content?: string }
    const proposal = await createProposal(tenantId, userId, 'excel-read',
      `Read Excel: ${body.fileName}`,
      { fileName: body.fileName, content: body.content },
      'Read-only preview of Excel file. No modifications will be made.',
    )
    return { success: true, data: { proposal } }
  })

  app.post('/documents/word', async (req) => {
    const { tenantId, userId } = req
    const body = req.body as { fileName: string; content?: string }
    const proposal = await createProposal(tenantId, userId, 'word-read',
      `Read Word document: ${body.fileName}`,
      { fileName: body.fileName, content: body.content },
      'Read-only extraction. Document is not modified.',
    )
    return { success: true, data: { proposal } }
  })

  app.post('/documents/pdf', async (req) => {
    const { tenantId, userId } = req
    const body = req.body as { fileName: string; content?: string }
    const proposal = await createProposal(tenantId, userId, 'pdf-read',
      `Read PDF: ${body.fileName}`,
      { fileName: body.fileName, content: body.content },
      'Read-only PDF text extraction.',
    )
    return { success: true, data: { proposal } }
  })

  app.post('/documents/ocr', async (req) => {
    const { tenantId, userId } = req
    const body = req.body as { fileName: string; imageData?: string }
    const proposal = await createProposal(tenantId, userId, 'image-ocr',
      `OCR image: ${body.fileName}`,
      { fileName: body.fileName, imageData: body.imageData ? '[image data]' : null },
      'Extract text from image using OCR. Image is not modified.',
    )
    return { success: true, data: { proposal } }
  })

  // ── SQL & API TOOLS ───────────────────────────────────────────────────────────

  app.post('/sql/propose', async (req) => {
    const { tenantId, userId } = req
    const body = req.body as { query: string; database?: string; description?: string }
    if (!body.query?.trim()) return { success: false, error: 'SQL query is required' }

    const isDestructive = /\b(drop|delete|truncate|alter|update)\b/i.test(body.query)
    const proposal = await createProposal(tenantId, userId, 'sql-query',
      `SQL: ${body.query.substring(0, 80)}...`,
      { query: body.query, database: body.database ?? 'reno_dev' },
      isDestructive
        ? 'CAUTION: This query contains destructive operations. Reno Brain has analyzed it and it has NOT been executed. Approve only after careful review.'
        : 'Query analyzed by Reno Brain. Not executed yet — approve to run on read-only replica.',
      body.description,
    )
    return {
      success: true,
      data: {
        proposal,
        warning: isDestructive ? 'Destructive SQL detected — extra approval caution required.' : null,
      },
    }
  })

  app.post('/api/explore', async (req) => {
    const { tenantId, userId } = req
    const body = req.body as { baseUrl?: string; filter?: string }
    const proposal = await createProposal(tenantId, userId, 'api-explore',
      `API Explorer: ${body.baseUrl ?? 'http://localhost:4000/v1'}`,
      { baseUrl: body.baseUrl, filter: body.filter },
      'Browse available API endpoints. Read-only discovery.',
    )
    return { success: true, data: { proposal } }
  })

  // ── TERMINAL TOOL ─────────────────────────────────────────────────────────────

  app.post('/terminal/propose', async (req) => {
    const { tenantId, userId } = req
    const body = req.body as { command: string; cwd?: string; reason?: string }
    if (!body.command?.trim()) return { success: false, error: 'Command is required' }

    const proposal = await createProposal(tenantId, userId, 'terminal-propose',
      `Terminal: ${body.command}`,
      { command: body.command, cwd: body.cwd },
      `Reno Brain proposes running: "${body.command}". This command has NOT been executed. Review carefully before approving. Reason: ${body.reason ?? 'Not specified.'}`,
      body.reason,
    )
    return {
      success: true,
      data: {
        proposal,
        warning: 'Terminal commands require careful review. Approve only if you understand the impact.',
      },
    }
  })

  // ── OPS TOOLS ─────────────────────────────────────────────────────────────────

  app.post('/logs/view', async (req) => {
    const { tenantId, userId } = req
    const body = req.body as { source?: string; lines?: number; filter?: string }
    const proposal = await createProposal(tenantId, userId, 'logs-view',
      `View logs: ${body.source ?? 'app'}`,
      { source: body.source ?? 'app', lines: body.lines ?? 100, filter: body.filter },
      'Read-only log viewer. No system state will be changed.',
    )
    return { success: true, data: { proposal } }
  })

  app.post('/deploy/propose', async (req) => {
    const { tenantId, userId } = req
    const body = req.body as { service: string; environment: string; version?: string }
    const proposal = await createProposal(tenantId, userId, 'deploy-propose',
      `Deploy ${body.service} → ${body.environment}`,
      { service: body.service, environment: body.environment, version: body.version ?? 'latest' },
      'Reno Brain has generated a deployment plan. NO deployment has been triggered. Review all steps before approving.',
      `Deploy ${body.service} to ${body.environment}`,
    )
    return {
      success: true,
      data: {
        proposal,
        warning: 'Deployment will affect production/staging. Review all steps carefully.',
      },
    }
  })

  app.post('/docker/assist', async (req) => {
    const { tenantId, userId } = req
    const body = req.body as { command: string; context?: string }
    if (!body.command?.trim()) return { success: false, error: 'Docker command is required' }
    const proposal = await createProposal(tenantId, userId, 'docker-assist',
      `Docker: ${body.command}`,
      { command: body.command, context: body.context },
      `Reno Brain analyzed the Docker command "${body.command}". It has NOT been executed. Approve to run in the project environment.`,
    )
    return { success: true, data: { proposal } }
  })

  app.post('/k8s/assist', async (req) => {
    const { tenantId, userId } = req
    const body = req.body as { command: string; namespace?: string }
    if (!body.command?.trim()) return { success: false, error: 'kubectl command is required' }
    const proposal = await createProposal(tenantId, userId, 'k8s-assist',
      `kubectl: ${body.command}`,
      { command: body.command, namespace: body.namespace ?? 'default' },
      `Reno Brain analyzed the Kubernetes command "${body.command}". NOT executed yet. Approve only if you understand the cluster impact.`,
    )
    return {
      success: true,
      data: {
        proposal,
        warning: 'Kubernetes commands affect the cluster. Review carefully before approval.',
      },
    }
  })

  // ── Project Context ───────────────────────────────────────────────────────────

  app.get('/projects', async (req) => {
    const { tenantId, userId } = req
    const projects = await prisma.awltProjectContext.findMany({
      where: { tenantId, userId }, orderBy: { updatedAt: 'desc' },
    })
    return { success: true, data: projects }
  })

  app.post('/projects', async (req) => {
    const { tenantId, userId } = req
    const body = req.body as { name: string; type: string; metadata?: Record<string, unknown> }
    const project = await prisma.awltProjectContext.upsert({
      where: { tenantId_userId_name_type: { tenantId, userId, name: body.name, type: body.type } },
      create: { tenantId, userId, name: body.name, type: body.type, metadata: (body.metadata ?? {}) as never, lastSyncAt: new Date() },
      update: { metadata: (body.metadata ?? {}) as never, updatedAt: new Date(), lastSyncAt: new Date() },
    })
    return { success: true, data: project }
  })

  // ── Execution Logs ────────────────────────────────────────────────────────────

  app.get('/logs', async (req) => {
    const { tenantId, userId } = req
    const q = req.query as { tool?: string }
    const where: Record<string, unknown> = { tenantId, userId }
    if (q.tool) where.tool = q.tool
    const logs = await prisma.awltCommandLog.findMany({
      where: where as never, orderBy: { createdAt: 'desc' }, take: 20,
    })
    return { success: true, data: logs }
  })
}
