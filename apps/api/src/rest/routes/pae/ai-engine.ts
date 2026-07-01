// Phase 52 — AI Process Automation Engine: AI Engine

export const STEP_TYPES = ['action', 'condition', 'loop', 'delay', 'parallel', 'human_approval', 'webhook', 'transform'] as const
export type StepType = typeof STEP_TYPES[number]

export const TRIGGER_TYPES = ['manual', 'schedule', 'event', 'webhook', 'api'] as const
export type TriggerType = typeof TRIGGER_TYPES[number]

export const WORKFLOW_CATEGORIES = ['crm', 'hr', 'finance', 'communication', 'document', 'onboarding', 'approval', 'reporting', 'custom'] as const

// ── Built-in Workflow Templates ───────────────────────────────────────────────

export interface WorkflowTemplate {
  name: string
  slug: string
  category: string
  description: string
  steps: Array<{ name: string; stepType: StepType; stepOrder: number; config: Record<string, unknown> }>
  triggerType: TriggerType
  triggerConfig: Record<string, unknown>
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    name: 'New Lead Nurture',
    slug: 'new_lead_nurture',
    category: 'crm',
    description: 'Automatically enrich and score new CRM leads, then assign to rep',
    steps: [
      { name: 'Enrich Lead Data', stepType: 'action', stepOrder: 1, config: { tool: 'crm_enrich', params: {} } },
      { name: 'Score Lead', stepType: 'action', stepOrder: 2, config: { tool: 'crm_score', params: {} } },
      { name: 'High Score?', stepType: 'condition', stepOrder: 3, config: { field: 'score', operator: 'gte', value: 70 } },
      { name: 'Assign to Senior Rep', stepType: 'action', stepOrder: 4, config: { tool: 'crm_assign', params: { tier: 'senior' } } },
    ],
    triggerType: 'event',
    triggerConfig: { channel: 'crm.lead.created' },
  },
  {
    name: 'Employee Onboarding',
    slug: 'employee_onboarding',
    category: 'hr',
    description: 'Automate new employee setup: accounts, docs, orientation schedule',
    steps: [
      { name: 'Create User Account', stepType: 'action', stepOrder: 1, config: { tool: 'hr_create_user', params: {} } },
      { name: 'Send Welcome Email', stepType: 'action', stepOrder: 2, config: { tool: 'email_send', params: { template: 'welcome' } } },
      { name: 'Generate Documents', stepType: 'action', stepOrder: 3, config: { tool: 'doc_generate', params: { template: 'offer_letter' } } },
      { name: 'Schedule Orientation', stepType: 'action', stepOrder: 4, config: { tool: 'calendar_create', params: { title: 'Orientation' } } },
      { name: 'Manager Approval', stepType: 'human_approval', stepOrder: 5, config: { approverRole: 'hr_manager', message: 'Please review new employee setup' } },
    ],
    triggerType: 'event',
    triggerConfig: { channel: 'hr.employee.hired' },
  },
  {
    name: 'Invoice Approval',
    slug: 'invoice_approval',
    category: 'finance',
    description: 'Route invoices for approval based on amount thresholds',
    steps: [
      { name: 'Validate Invoice', stepType: 'action', stepOrder: 1, config: { tool: 'finance_validate', params: {} } },
      { name: 'Amount > $10K?', stepType: 'condition', stepOrder: 2, config: { field: 'amount', operator: 'gte', value: 10000 } },
      { name: 'CFO Approval', stepType: 'human_approval', stepOrder: 3, config: { approverRole: 'cfo', message: 'High-value invoice requires CFO approval' } },
      { name: 'Post to Accounting', stepType: 'action', stepOrder: 4, config: { tool: 'finance_post', params: {} } },
    ],
    triggerType: 'event',
    triggerConfig: { channel: 'finance.invoice.received' },
  },
  {
    name: 'Weekly Report Generator',
    slug: 'weekly_report',
    category: 'reporting',
    description: 'Generate and email weekly business summary every Monday',
    steps: [
      { name: 'Gather KPIs', stepType: 'action', stepOrder: 1, config: { tool: 'analytics_query', params: { period: 'last_7_days' } } },
      { name: 'Generate Report', stepType: 'action', stepOrder: 2, config: { tool: 'doc_generate', params: { template: 'weekly_report' } } },
      { name: 'Send to Stakeholders', stepType: 'action', stepOrder: 3, config: { tool: 'email_send', params: { recipients: 'stakeholders', template: 'weekly_report' } } },
    ],
    triggerType: 'schedule',
    triggerConfig: { cron: '0 8 * * 1' },
  },
]

// ── Step Execution Simulation ─────────────────────────────────────────────────

export interface StepExecutionResult {
  status: 'completed' | 'failed' | 'skipped' | 'pending_approval'
  output: Record<string, unknown>
  durationMs: number
  error?: string
}

export function simulateStepExecution(
  stepType: StepType,
  config: Record<string, unknown>,
  input: Record<string, unknown>,
): StepExecutionResult {
  const durationMs = 50 + Math.floor(Math.random() * 300)

  switch (stepType) {
    case 'action': {
      const tool = config.tool as string
      return {
        status: 'completed',
        output: { tool, result: 'success', ...input },
        durationMs,
      }
    }
    case 'condition': {
      const field = config.field as string
      const op = config.operator as string
      const value = config.value as number
      const fieldVal = (input[field] as number) ?? 0
      const passed = op === 'gte' ? fieldVal >= value : op === 'lte' ? fieldVal <= value : op === 'eq' ? fieldVal === value : false
      return { status: 'completed', output: { conditionMet: passed, field, fieldVal, operator: op, threshold: value }, durationMs }
    }
    case 'delay': {
      const delayMs = (config.delayMs as number) ?? 1000
      return { status: 'completed', output: { delayed: delayMs }, durationMs }
    }
    case 'human_approval':
      return { status: 'pending_approval', output: { awaitingApproval: true, approverRole: config.approverRole }, durationMs }
    case 'webhook': {
      return { status: 'completed', output: { webhookCalled: true, url: config.url, statusCode: 200 }, durationMs }
    }
    case 'transform': {
      return { status: 'completed', output: { transformed: true, ...input }, durationMs }
    }
    case 'parallel':
      return { status: 'completed', output: { parallelBranches: config.branches ?? 2, allCompleted: true }, durationMs }
    case 'loop':
      return { status: 'completed', output: { iterations: config.maxIterations ?? 3, completed: true }, durationMs }
    default:
      return { status: 'completed', output: { result: 'ok' }, durationMs }
  }
}

// ── Workflow Execution Orchestration ──────────────────────────────────────────

export interface WorkflowExecutionResult {
  status: 'completed' | 'failed' | 'partially_completed'
  stepResults: StepExecutionResult[]
  totalDurationMs: number
  completedSteps: number
  output: Record<string, unknown>
}

export function executeWorkflow(
  steps: Array<{ id: string; name: string; stepType: string; stepOrder: number; config: Record<string, unknown>; isEnabled: boolean }>,
  input: Record<string, unknown>,
): WorkflowExecutionResult {
  const stepResults: StepExecutionResult[] = []
  let context = { ...input }
  let totalDurationMs = 0
  let status: WorkflowExecutionResult['status'] = 'completed'

  const sorted = [...steps].filter(s => s.isEnabled).sort((a, b) => a.stepOrder - b.stepOrder)

  for (const step of sorted) {
    const result = simulateStepExecution(step.stepType as StepType, step.config, context)
    stepResults.push(result)
    totalDurationMs += result.durationMs
    context = { ...context, ...result.output }

    if (result.status === 'failed') {
      status = 'failed'
      break
    }
    if (result.status === 'pending_approval') {
      status = 'partially_completed'
      break
    }
  }

  return {
    status,
    stepResults,
    totalDurationMs,
    completedSteps: stepResults.filter(r => r.status === 'completed').length,
    output: context,
  }
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface WorkflowStats {
  successRate: number
  avgDurationMs: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  recommendation: string
}

export function analyzeWorkflowPerformance(totalRuns: number, successfulRuns: number, avgDurationMs: number): WorkflowStats {
  const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0
  const grade: WorkflowStats['grade'] =
    successRate >= 95 ? 'A' :
    successRate >= 85 ? 'B' :
    successRate >= 75 ? 'C' :
    successRate >= 60 ? 'D' : 'F'

  const recommendation = successRate < 75
    ? 'Review failing steps and add retry policies'
    : avgDurationMs > 5000
    ? 'Consider parallelizing slow steps'
    : 'Workflow is performing well'

  return { successRate, avgDurationMs, grade, recommendation }
}

export function generateDashboardSummary(
  totalWorkflows: number,
  activeWorkflows: number,
  totalExecutions: number,
  runningExecutions: number,
): string {
  if (totalWorkflows === 0) return 'No workflows configured yet. Create your first automation workflow.'
  return `${activeWorkflows}/${totalWorkflows} workflows active · ${runningExecutions} executions in progress · ${totalExecutions} total runs`
}
