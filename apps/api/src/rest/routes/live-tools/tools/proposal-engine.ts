/**
 * Proposal Engine — the central gate for ALL live tool actions.
 * No tool executes anything without a proposal being approved first.
 */
import { prisma } from '@reno/database'

export type ToolName =
  | 'file-explore' | 'file-read' | 'folder-permissions'
  | 'git-status' | 'git-diff' | 'git-branches' | 'git-pr-draft'
  | 'code-explain' | 'code-refactor'
  | 'excel-read' | 'word-read' | 'pdf-read' | 'image-ocr'
  | 'sql-query' | 'api-explore'
  | 'terminal-propose'
  | 'logs-view' | 'deploy-propose' | 'docker-assist' | 'k8s-assist'

export interface ProposalPayload {
  tool: ToolName
  input: Record<string, unknown>
  aiExplanation?: string
}

export async function createProposal(
  tenantId: string,
  userId: string,
  tool: ToolName,
  title: string,
  payload: Record<string, unknown>,
  aiExplanation?: string,
  description?: string,
) {
  const proposal = await prisma.awltProposal.create({
    data: {
      tenantId, userId, tool, title, description,
      payload: payload as never,
      aiExplanation,
      status: 'pending_approval',
    },
  })

  await prisma.sysAuditLog.create({
    data: {
      tenantId, userId, action: 'LIVE_TOOL_PROPOSED', module: 'live-tools',
      entityType: 'AwltProposal', entityId: proposal.id,
      newValues: { tool, title } as never,
    },
  }).catch(() => null)

  return proposal
}

export async function approveAndExecute(
  proposalId: string,
  tenantId: string,
  approverId: string,
): Promise<{ result: Record<string, unknown>; log: unknown }> {
  const proposal = await prisma.awltProposal.findFirst({
    where: { id: proposalId, tenantId },
  })
  if (!proposal) throw new Error('Proposal not found')
  if (proposal.status !== 'pending_approval') throw new Error(`Proposal is ${proposal.status} — cannot approve`)

  // Mark as approved & running
  await prisma.awltProposal.update({
    where: { id: proposalId },
    data: { status: 'running', approvedBy: approverId, approvedAt: new Date() },
  })

  const start = Date.now()
  let result: Record<string, unknown>
  try {
    result = await executeToolSimulated(proposal.tool as ToolName, proposal.payload as Record<string, unknown>)
  } catch (err) {
    await prisma.awltProposal.update({ where: { id: proposalId }, data: { status: 'failed' } })
    throw err
  }

  const durationMs = Date.now() - start

  // Mark executed + store result
  await prisma.awltProposal.update({
    where: { id: proposalId },
    data: { status: 'executed', result: result as never, executedAt: new Date() },
  })

  // Create command log
  const log = await prisma.awltCommandLog.create({
    data: {
      proposalId, tenantId, userId: approverId,
      tool: proposal.tool, input: proposal.payload,
      output: result as never, status: 'success', durationMs,
    },
  })

  await prisma.sysAuditLog.create({
    data: {
      tenantId, userId: approverId, action: 'LIVE_TOOL_EXECUTED', module: 'live-tools',
      entityType: 'AwltProposal', entityId: proposalId,
      newValues: { tool: proposal.tool, durationMs } as never,
    },
  }).catch(() => null)

  return { result, log }
}

export async function rejectProposal(
  proposalId: string,
  tenantId: string,
  rejectorId: string,
  reason?: string,
) {
  const proposal = await prisma.awltProposal.findFirst({ where: { id: proposalId, tenantId } })
  if (!proposal) throw new Error('Proposal not found')
  if (proposal.status !== 'pending_approval') throw new Error(`Cannot reject proposal in status: ${proposal.status}`)

  await prisma.awltProposal.update({
    where: { id: proposalId },
    data: { status: 'rejected', rejectedBy: rejectorId, rejectedAt: new Date(), rejectionReason: reason },
  })

  await prisma.sysAuditLog.create({
    data: {
      tenantId, userId: rejectorId, action: 'LIVE_TOOL_REJECTED', module: 'live-tools',
      entityType: 'AwltProposal', entityId: proposalId,
      newValues: { reason } as never,
    },
  }).catch(() => null)
}

// ── Simulated execution engine ─────────────────────────────────────────────────
// In production, each tool dispatches to a local agent (VS Code bridge / desktop agent).
// This implementation returns realistic simulated outputs so the API is fully functional.
async function executeToolSimulated(tool: ToolName, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  await new Promise(r => setTimeout(r, 30)) // simulate latency

  switch (tool) {
    case 'file-explore':
      return {
        path: payload.path ?? '/',
        entries: [
          { name: 'src', type: 'directory', size: null, modified: new Date().toISOString() },
          { name: 'package.json', type: 'file', size: 1248, modified: new Date().toISOString() },
          { name: 'tsconfig.json', type: 'file', size: 384, modified: new Date().toISOString() },
          { name: 'README.md', type: 'file', size: 2048, modified: new Date().toISOString() },
        ],
        totalEntries: 4,
      }

    case 'file-read':
      return {
        path: payload.path ?? 'unknown',
        content: payload.content ?? `[File content would appear here after user grants access to: ${payload.path}]`,
        lineCount: 42,
        encoding: 'utf-8',
        note: 'Read-only. No modifications made.',
      }

    case 'folder-permissions':
      return {
        path: payload.path ?? '/',
        owner: 'reno-app',
        permissions: { read: true, write: false, execute: false },
        acl: [
          { user: 'admin', permissions: 'rwx' },
          { user: 'app-user', permissions: 'r--' },
        ],
      }

    case 'git-status':
      return {
        branch: payload.branch ?? 'main',
        staged: [{ file: 'src/auth.ts', status: 'M' }],
        unstaged: [{ file: 'src/routes.ts', status: 'M' }, { file: 'README.md', status: '?' }],
        clean: false,
        ahead: 2,
        behind: 0,
      }

    case 'git-diff':
      return {
        file: payload.file ?? '(all files)',
        diff: `--- a/src/auth.ts\n+++ b/src/auth.ts\n@@ -10,7 +10,7 @@\n-  const token = req.headers.authorization\n+  const token = req.headers.authorization?.split(' ')[1]`,
        additions: 1,
        deletions: 1,
        hunks: 1,
      }

    case 'git-branches':
      return {
        current: 'main',
        local: ['main', 'feature/phase-39', 'fix/auth-middleware'],
        remote: ['origin/main', 'origin/feature/phase-39'],
        lastCommit: { hash: 'df0eadb', message: 'feat(phase38): Reno AI Workspace', author: 'Renas Talabani' },
      }

    case 'git-pr-draft':
      return {
        title: payload.title ?? 'feat: AI Workspace Live Tools (Phase 39)',
        body: `## Summary\n- ${(payload.changes as string[] ?? ['Implements Phase 39 live tool proposals', 'Adds proposal-approve-execute workflow', 'Full audit logging for all tool actions']).join('\n- ')}\n\n## Test plan\n- [ ] All 20 smoke tests pass\n- [ ] Proposals require approval before execution\n- [ ] Audit logs created for all actions\n\n🤖 Draft generated by Reno Brain`,
        baseBranch: 'main',
        status: 'draft',
        note: 'PR not created — this is a draft for your review. Approve to create on GitHub.',
      }

    case 'code-explain':
      return {
        code: String(payload.code ?? '').substring(0, 200),
        language: payload.language ?? 'unknown',
        explanation: `This code ${payload.language === 'typescript' ? 'TypeScript' : payload.language ?? 'code'} snippet performs: ${String(payload.code ?? '').substring(0, 80)}... It follows standard patterns and appears well-structured. Key points: defines a function/class, handles input validation, returns a typed response.`,
        complexity: 'medium',
        suggestions: ['Add JSDoc comments', 'Consider extracting magic numbers to constants'],
        note: 'Explanation only — Reno Brain did not modify any files.',
      }

    case 'code-refactor':
      return {
        original: String(payload.code ?? '').substring(0, 200),
        refactored: String(payload.code ?? '').replace(/var /g, 'const ').replace(/function /g, 'const '),
        changes: ['Replaced var with const', 'Converted function declarations to arrow functions'],
        reasoning: 'Modern JavaScript/TypeScript prefers const over var and arrow functions for cleaner scoping.',
        note: 'PROPOSAL ONLY — no files were modified. Review and apply manually after approval.',
      }

    case 'excel-read':
      return {
        file: payload.fileName ?? 'unknown.xlsx',
        sheets: ['Sheet1', 'Summary', 'Data'],
        preview: {
          sheet: 'Sheet1',
          headers: ['Date', 'Revenue', 'Units', 'Region'],
          rows: [['2026-01', '50000', '120', 'MENA'], ['2026-02', '55000', '135', 'MENA']],
          totalRows: 24,
        },
        note: 'Read-only preview. No modifications made to the file.',
      }

    case 'word-read':
      return {
        file: payload.fileName ?? 'unknown.docx',
        wordCount: 1240,
        paragraphs: 18,
        preview: 'This document covers the quarterly business review for Q2 2026. Key highlights include revenue growth of 25% year-over-year...',
        headings: ['Executive Summary', 'Financial Performance', 'Operational Metrics', 'Recommendations'],
        note: 'Read-only preview.',
      }

    case 'pdf-read':
      return {
        file: payload.fileName ?? 'unknown.pdf',
        pages: 8,
        text: 'Page 1: Executive Summary. This report covers the annual performance review...',
        metadata: { author: 'Reno System', created: '2026-06-01', encrypted: false },
        note: 'Read-only extraction.',
      }

    case 'image-ocr':
      return {
        file: payload.fileName ?? 'unknown.png',
        text: 'Extracted text would appear here after processing the image.',
        confidence: 0.94,
        language: 'en',
        blocks: [{ text: 'Sample OCR block', bbox: [0, 0, 100, 50] }],
        note: 'Text extracted for reading only.',
      }

    case 'sql-query':
      return {
        query: String(payload.query ?? '').substring(0, 500),
        database: payload.database ?? 'reno_dev',
        explanation: `This SQL query selects data from the specified table with filtering conditions. It performs a JOIN between two tables and returns aggregated results. Estimated rows: 42.`,
        estimatedRows: 42,
        risk: 'LOW',
        note: 'PROPOSAL ONLY — query was NOT executed. Approve to run on a read-only replica.',
        warning: String(payload.query ?? '').toLowerCase().includes('delete') || String(payload.query ?? '').toLowerCase().includes('drop')
          ? 'WARNING: Destructive operation detected. Requires additional confirmation.'
          : null,
      }

    case 'api-explore':
      return {
        baseUrl: payload.baseUrl ?? 'http://localhost:4000/v1',
        endpoints: [
          { method: 'GET', path: '/ai-workspace/summary', description: 'AI workspace summary' },
          { method: 'POST', path: '/ai-workspace/command', description: 'Send command to Reno Brain' },
          { method: 'GET', path: '/live-tools/proposals', description: 'List tool proposals' },
        ],
        totalEndpoints: 280,
        categories: ['auth', 'crm', 'hr', 'finance', 'ai-workspace', 'live-tools'],
      }

    case 'terminal-propose':
      return {
        command: String(payload.command ?? ''),
        shell: 'bash',
        workingDirectory: payload.cwd ?? '~',
        risk: assessCommandRisk(String(payload.command ?? '')),
        alternativeSuggestion: payload.command ? `Consider: ${String(payload.command).replace('rm -rf', 'rm -i')}` : null,
        note: 'PROPOSAL ONLY — command NOT executed. Approve to run in sandbox environment.',
        warning: assessCommandRisk(String(payload.command ?? '')) === 'HIGH'
          ? 'High-risk command detected. Extra caution required before approval.'
          : null,
      }

    case 'logs-view':
      return {
        source: payload.source ?? 'app',
        lines: [
          { time: new Date().toISOString(), level: 'INFO', message: 'Server started on port 4000' },
          { time: new Date().toISOString(), level: 'WARN', message: 'Redis cache degraded, falling back to DB' },
          { time: new Date().toISOString(), level: 'INFO', message: 'Prisma client connected to PostgreSQL' },
          { time: new Date().toISOString(), level: 'INFO', message: 'AI Workspace module initialized' },
        ],
        totalLines: 1240,
        filter: payload.filter ?? null,
      }

    case 'deploy-propose':
      return {
        environment: payload.environment ?? 'staging',
        service: payload.service ?? 'reno-api',
        version: payload.version ?? 'latest',
        steps: [
          '1. Build Docker image: reno-api:latest',
          '2. Push to registry: registry.renoos.io/reno-api:latest',
          '3. Update deployment: kubectl set image deployment/reno-api reno-api=registry.renoos.io/reno-api:latest',
          '4. Wait for rollout: kubectl rollout status deployment/reno-api',
          '5. Run smoke tests against staging',
        ],
        estimatedDowntime: '0s (rolling update)',
        note: 'PROPOSAL ONLY — deployment NOT started. Approve to begin the rollout.',
      }

    case 'docker-assist':
      return {
        command: String(payload.command ?? 'docker ps'),
        explanation: `Docker command: ${payload.command}. This will ${String(payload.command ?? '').includes('run') ? 'start a new container' : 'list containers'}. Current containers in this environment: reno-postgres (up), reno-redis (up), reno-api (up).`,
        proposedOutput: payload.command === 'docker ps' ? 'CONTAINER_ID  IMAGE  COMMAND  CREATED  STATUS  PORTS  NAMES\nabc123  postgres:15  ...  2h  Up  5433->5432  reno-postgres' : 'Command output would appear here.',
        note: 'PROPOSAL ONLY — command NOT executed.',
      }

    case 'k8s-assist':
      return {
        command: String(payload.command ?? 'kubectl get pods'),
        namespace: payload.namespace ?? 'default',
        explanation: `Kubernetes command: ${payload.command}. This will ${String(payload.command ?? '').includes('get pods') ? 'list all pods in the namespace' : 'perform the requested k8s operation'}.`,
        proposedOutput: 'NAME  READY  STATUS  RESTARTS  AGE\nreno-api-7d8f9-abc12  1/1  Running  0  2h\nreno-worker-8c9f1-def34  1/1  Running  0  2h',
        note: 'PROPOSAL ONLY — command NOT executed.',
      }

    default:
      return { tool, status: 'unsupported', message: `Tool '${tool}' is not yet implemented.` }
  }
}

function assessCommandRisk(command: string): 'LOW' | 'MEDIUM' | 'HIGH' {
  const cmd = command.toLowerCase()
  if (cmd.includes('rm -rf') || cmd.includes('drop table') || cmd.includes('format') || cmd.includes('mkfs')) return 'HIGH'
  if (cmd.includes('rm ') || cmd.includes('mv ') || cmd.includes('chmod') || cmd.includes('sudo')) return 'MEDIUM'
  return 'LOW'
}
