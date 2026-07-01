/**
 * AI Autonomous Workspace — Planner
 *
 * Generates multi-step execution plans from natural-language objectives.
 * Every step is tied to a Live Tool (Phase 39) and requires independent
 * human approval before execution. Nothing runs automatically.
 */
import { prisma } from '@reno/database'

export interface JobPlan {
  summary: string
  estimatedSteps: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  steps: PlanStep[]
}

export interface PlanStep {
  stepNumber: number
  title: string
  description: string
  tool: string
  payload: Record<string, unknown>
  requiresApproval: true
}

// ── Generate a plan from an objective ──────────────────────────────────────

export function generatePlan(objective: string, projectName?: string): JobPlan {
  const obj = objective.toLowerCase()
  const proj = projectName ?? 'project'

  // Pattern-match the objective to a domain and produce a realistic plan
  if (obj.includes('bug') || obj.includes('fix') || obj.includes('error') || obj.includes('crash')) {
    return bugFixPlan(objective, proj)
  }
  if (obj.includes('refactor') || obj.includes('clean') || obj.includes('improve') || obj.includes('optimiz')) {
    return refactorPlan(objective, proj)
  }
  if (obj.includes('deploy') || obj.includes('release') || obj.includes('ship')) {
    return deployPlan(objective, proj)
  }
  if (obj.includes('audit') || obj.includes('security') || obj.includes('vulnerab')) {
    return securityAuditPlan(objective, proj)
  }
  if (obj.includes('todo') || obj.includes('discover') || obj.includes('scan') || obj.includes('find')) {
    return discoveryPlan(objective, proj)
  }
  if (obj.includes('document') || obj.includes('readme') || obj.includes('comment')) {
    return documentationPlan(objective, proj)
  }
  return genericAnalysisPlan(objective, proj)
}

// ── Plan templates ──────────────────────────────────────────────────────────

function bugFixPlan(objective: string, project: string): JobPlan {
  return {
    summary: `Reno Brain will investigate and propose a fix for: "${objective}". Each step requires your approval.`,
    estimatedSteps: 6,
    riskLevel: 'MEDIUM',
    steps: [
      step(1, 'Explore project structure', `Map the ${project} file tree to locate relevant modules.`, 'file-explore', { path: `/src` }),
      step(2, 'Check Git history for recent changes', 'Review recent commits that may have introduced the bug.', 'git-status', {}),
      step(3, 'Read error-prone files', 'Read the files most likely related to the reported bug.', 'file-read', { path: `/src/index.ts` }),
      step(4, 'Analyze suspicious code', 'Let Reno Brain explain the code section causing the issue.', 'code-explain', { code: '// [Code will be populated from step 3 result]', language: 'typescript' }),
      step(5, 'Propose fix', 'Generate a targeted refactor proposal for the buggy section.', 'code-refactor', { code: '// [Code will be populated from step 3 result]', language: 'typescript' }),
      step(6, 'Review Git diff after fix', 'Confirm only the intended lines were changed.', 'git-diff', {}),
    ],
  }
}

function refactorPlan(objective: string, project: string): JobPlan {
  return {
    summary: `Reno Brain will build a full refactor plan for ${project}. No files are modified without your approval.`,
    estimatedSteps: 7,
    riskLevel: 'MEDIUM',
    steps: [
      step(1, 'Explore project structure', 'Map all source directories and key files.', 'file-explore', { path: `/src` }),
      step(2, 'Index project files', 'Build a semantic index of all files for analysis.', 'file-explore', { path: `/src`, deep: true }),
      step(3, 'Scan for code quality issues', 'Identify functions that exceed complexity thresholds.', 'code-explain', { code: '// scanning...', language: 'typescript' }),
      step(4, 'Discover TODO markers', 'Find all TODO, FIXME, HACK comments in the codebase.', 'file-read', { path: `/src`, searchPattern: 'TODO|FIXME|HACK' }),
      step(5, 'Build refactor proposals', 'Generate targeted refactor suggestions for top candidates.', 'code-refactor', { code: '// [populated from scan]', language: 'typescript' }),
      step(6, 'Check for unused dependencies', 'Review package.json against actual imports.', 'file-read', { path: `/package.json` }),
      step(7, 'Create PR draft', 'Draft a pull request summarizing all proposed changes.', 'git-pr-draft', { title: `refactor: ${objective.substring(0, 60)}`, baseBranch: 'main' }),
    ],
  }
}

function deployPlan(objective: string, project: string): JobPlan {
  return {
    summary: `Reno Brain will prepare a deployment plan for ${project}. Deployment does NOT start until you approve each step.`,
    estimatedSteps: 6,
    riskLevel: 'HIGH',
    steps: [
      step(1, 'Verify current branch and status', 'Confirm we are on the correct branch with no unstaged changes.', 'git-status', {}),
      step(2, 'Review recent commits', 'Check what changed since the last deployment.', 'git-diff', { base: 'origin/main' }),
      step(3, 'Run pre-deployment checks', 'View application logs to confirm stable baseline.', 'logs-view', { source: 'app', lines: 50 }),
      step(4, 'Review Docker configuration', 'Confirm container configuration matches target environment.', 'docker-assist', { command: 'docker ps' }),
      step(5, 'Propose deployment', 'Generate a step-by-step deployment plan for review.', 'deploy-propose', { service: project, environment: 'staging' }),
      step(6, 'Verify deployment in Kubernetes', 'Check pod status after deployment.', 'k8s-assist', { command: 'kubectl get pods' }),
    ],
  }
}

function securityAuditPlan(objective: string, project: string): JobPlan {
  return {
    summary: `Reno Brain will perform a security audit of ${project}. All findings are reported, not auto-fixed.`,
    estimatedSteps: 6,
    riskLevel: 'LOW',
    steps: [
      step(1, 'Map project entry points', 'Identify API routes and auth middleware.', 'file-explore', { path: `/src` }),
      step(2, 'Check authentication code', 'Analyze auth/JWT/session handling for vulnerabilities.', 'code-explain', { code: '// auth files', language: 'typescript' }),
      step(3, 'Review SQL query patterns', 'Identify any raw SQL that may be vulnerable to injection.', 'sql-propose', { query: 'SELECT * FROM information_schema.tables LIMIT 10' }),
      step(4, 'Scan environment variables', 'Verify no secrets are hardcoded in source files.', 'file-read', { path: `/.env.example` }),
      step(5, 'Review dependency security', 'Check package.json for known vulnerable packages.', 'file-read', { path: `/package.json` }),
      step(6, 'Generate security report', 'Summarize all findings with severity levels.', 'code-explain', { code: '// security summary', language: 'text' }),
    ],
  }
}

function discoveryPlan(objective: string, project: string): JobPlan {
  return {
    summary: `Reno Brain will scan ${project} for TODOs, bugs, and improvement opportunities.`,
    estimatedSteps: 5,
    riskLevel: 'LOW',
    steps: [
      step(1, 'Explore all source directories', 'Map the complete file tree.', 'file-explore', { path: `/src` }),
      step(2, 'Find TODO and FIXME comments', 'Scan all source files for actionable markers.', 'file-read', { path: `/src`, searchPattern: 'TODO|FIXME|HACK|TEMP|XXX' }),
      step(3, 'Analyze code complexity hotspots', 'Identify files with high complexity scores.', 'code-explain', { code: '// complexity scan', language: 'typescript' }),
      step(4, 'Check Git for uncommitted work', 'See if there is unfinished work in progress.', 'git-status', {}),
      step(5, 'Build discovery report', 'Compile all findings into a prioritized action list.', 'code-explain', { code: '// discovery summary', language: 'text' }),
    ],
  }
}

function documentationPlan(objective: string, project: string): JobPlan {
  return {
    summary: `Reno Brain will analyze ${project} and propose documentation improvements.`,
    estimatedSteps: 5,
    riskLevel: 'LOW',
    steps: [
      step(1, 'Read existing README', 'Understand the current documentation state.', 'file-read', { path: `/README.md` }),
      step(2, 'Explore source structure', 'Map modules and their relationships.', 'file-explore', { path: `/src` }),
      step(3, 'Analyze key exported functions', 'Find public APIs that need documentation.', 'code-explain', { code: '// public API scan', language: 'typescript' }),
      step(4, 'Draft API documentation', 'Generate JSDoc-style documentation proposals.', 'code-refactor', { code: '// undocumented functions', language: 'typescript' }),
      step(5, 'Propose README update', 'Draft an improved README for review.', 'git-pr-draft', { title: `docs: improve ${project} documentation`, baseBranch: 'main' }),
    ],
  }
}

function genericAnalysisPlan(objective: string, project: string): JobPlan {
  return {
    summary: `Reno Brain will analyze ${project} in relation to: "${objective}".`,
    estimatedSteps: 5,
    riskLevel: 'LOW',
    steps: [
      step(1, 'Map project structure', 'Explore the full directory tree.', 'file-explore', { path: `/src` }),
      step(2, 'Review Git status', 'Check current branch and recent changes.', 'git-status', {}),
      step(3, 'Read key configuration files', 'Read package.json and tsconfig.', 'file-read', { path: `/package.json` }),
      step(4, 'Analyze main entry point', 'Explain the main application entry point.', 'code-explain', { code: '// main entry', language: 'typescript' }),
      step(5, 'Generate analysis report', 'Summarize findings relevant to the objective.', 'code-explain', { code: '// analysis summary', language: 'text' }),
    ],
  }
}

function step(
  stepNumber: number,
  title: string,
  description: string,
  tool: string,
  payload: Record<string, unknown>,
): PlanStep {
  return { stepNumber, title, description, tool, payload, requiresApproval: true }
}

// ── Persist job + steps to DB ───────────────────────────────────────────────

export async function persistJob(
  tenantId: string,
  userId: string,
  title: string,
  objective: string,
  plan: JobPlan,
  projectName?: string,
) {
  const job = await prisma.awsJob.create({
    data: {
      tenantId, userId, title, objective,
      projectName: projectName ?? null,
      status: 'ready',
      plan: plan as never,
      totalSteps: plan.steps.length,
    },
  })

  // Create all steps as "waiting" — only first becomes pending_approval when job starts
  await prisma.awsJobStep.createMany({
    data: plan.steps.map(s => ({
      jobId: job.id, tenantId,
      stepNumber: s.stepNumber,
      title: s.title,
      description: s.description,
      tool: s.tool,
      payload: s.payload as never,
      status: 'waiting',
    })),
  })

  return job
}

// ── Simulated step execution (same pattern as Phase 39 live tools) ──────────

export async function executeStep(
  stepId: string,
  tenantId: string,
  approverId: string,
): Promise<{ job: unknown; step: unknown }> {
  const stepRecord = await prisma.awsJobStep.findFirst({ where: { id: stepId, tenantId } })
  if (!stepRecord) throw new Error('Step not found')
  if (stepRecord.status !== 'pending_approval') throw new Error(`Step status is '${stepRecord.status}' — approve first`)

  // Mark running
  await prisma.awsJobStep.update({
    where: { id: stepId },
    data: { status: 'running', approvedBy: approverId, approvedAt: new Date() },
  })

  // Simulate execution
  await new Promise(r => setTimeout(r, 30))
  const result = {
    tool: stepRecord.tool,
    status: 'completed',
    output: `Step "${stepRecord.title}" executed successfully via ${stepRecord.tool}.`,
    timestamp: new Date().toISOString(),
    note: 'Simulated output — connect Reno Desktop Agent for live execution.',
  }

  // Mark completed
  const updatedStep = await prisma.awsJobStep.update({
    where: { id: stepId },
    data: { status: 'completed', result: result as never, executedAt: new Date() },
  })

  // Advance job's currentStep; if there's a next step, promote it to pending_approval
  const job = await prisma.awsJob.findUnique({ where: { id: stepRecord.jobId } })
  if (!job) throw new Error('Job not found')

  const nextStepNumber = stepRecord.stepNumber + 1
  const hasNext = nextStepNumber <= job.totalSteps

  if (hasNext) {
    await prisma.awsJobStep.updateMany({
      where: { jobId: job.id, tenantId, stepNumber: nextStepNumber },
      data: { status: 'pending_approval' },
    })
  }

  const newStatus = hasNext ? 'running' : 'completed'
  const updatedJob = await prisma.awsJob.update({
    where: { id: job.id },
    data: {
      currentStep: stepRecord.stepNumber,
      status: newStatus,
      ...(newStatus === 'completed' ? { completedAt: new Date() } : {}),
    },
  })

  // Audit log
  await prisma.sysAuditLog.create({
    data: {
      tenantId, userId: approverId,
      action: 'AWS_STEP_EXECUTED', module: 'ai-autonomous',
      entityType: 'AwsJobStep', entityId: stepId,
      newValues: { tool: stepRecord.tool, stepNumber: stepRecord.stepNumber, jobId: job.id } as never,
    },
  }).catch(() => null)

  return { job: updatedJob, step: updatedStep }
}
