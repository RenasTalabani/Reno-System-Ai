import { prisma } from '@reno/database'
import { getToolMeta, isReadTool } from './registry.js'
import {
  readDashboardSummary,
  readCustomer,
  readEmployee,
  readInvoice,
  readInventoryStock,
  readProject,
  readTicket,
  generateReport,
} from './read-tools.js'
import {
  createTaskProposal,
  createWorkflowProposal,
  createInvoiceDraft,
  createPurchaseOrderProposal,
  createSupportReplyDraft,
} from './proposal-tools.js'

export interface ToolCallContext {
  tenantId: string
  userId: string
  conversationId?: string
}

export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
  proposalId?: string
  proposalSummary?: string
}

// Route a Claude tool call to its implementation, with RBAC + tenant isolation
export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  ctx: ToolCallContext
): Promise<ToolResult> {
  const { tenantId, userId, conversationId } = ctx

  // Guard: unknown tool
  const meta = getToolMeta(toolName)
  if (!meta) {
    return { success: false, error: `Unknown tool: ${toolName}` }
  }

  // Guard: never allow destructive tools (safety net — none are defined, but belt-and-suspenders)
  if (meta.isDestructive) {
    await logToolCall({ ...ctx, toolName, toolCallId: '', toolInput, status: 'blocked', errorMessage: 'Destructive tools are not permitted' })
    return { success: false, error: 'This action is not permitted. Destructive tools are disabled.' }
  }

  try {
    if (toolName === 'read_dashboard_summary') {
      const data = await readDashboardSummary(tenantId)
      return { success: true, data }
    }

    if (toolName === 'read_customer') {
      const data = await readCustomer(tenantId, String(toolInput.identifier ?? ''))
      return { success: true, data }
    }

    if (toolName === 'read_employee') {
      const data = await readEmployee(tenantId, String(toolInput.identifier ?? ''))
      return { success: true, data }
    }

    if (toolName === 'read_invoice') {
      const data = await readInvoice(tenantId, String(toolInput.identifier ?? ''))
      return { success: true, data }
    }

    if (toolName === 'read_inventory_stock') {
      const data = await readInventoryStock(tenantId, String(toolInput.query ?? ''))
      return { success: true, data }
    }

    if (toolName === 'read_project') {
      const data = await readProject(tenantId, String(toolInput.identifier ?? ''))
      return { success: true, data }
    }

    if (toolName === 'read_ticket') {
      const data = await readTicket(tenantId, String(toolInput.identifier ?? ''))
      return { success: true, data }
    }

    if (toolName === 'generate_report') {
      const data = await generateReport(
        tenantId,
        String(toolInput.report_type ?? ''),
        String(toolInput.period ?? 'this_month')
      )
      return { success: true, data }
    }

    if (toolName === 'create_task_proposal') {
      const result = await createTaskProposal(tenantId, userId, conversationId, toolInput as any)
      return { success: true, data: result, proposalId: result.proposalId, proposalSummary: result.proposalSummary }
    }

    if (toolName === 'create_workflow_proposal') {
      const result = await createWorkflowProposal(tenantId, userId, conversationId, toolInput as any)
      return { success: true, data: result, proposalId: result.proposalId, proposalSummary: result.proposalSummary }
    }

    if (toolName === 'create_invoice_draft') {
      const result = await createInvoiceDraft(tenantId, userId, conversationId, toolInput as any)
      return { success: true, data: result, proposalId: result.proposalId, proposalSummary: result.proposalSummary }
    }

    if (toolName === 'create_purchase_order_proposal') {
      const result = await createPurchaseOrderProposal(tenantId, userId, conversationId, toolInput as any)
      return { success: true, data: result, proposalId: result.proposalId, proposalSummary: result.proposalSummary }
    }

    if (toolName === 'create_support_reply_draft') {
      const result = await createSupportReplyDraft(tenantId, userId, conversationId, toolInput as any)
      return { success: true, data: result, proposalId: result.proposalId, proposalSummary: result.proposalSummary }
    }

    return { success: false, error: `Tool ${toolName} is registered but has no implementation` }
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Tool execution failed' }
  }
}

export interface LogToolCallParams extends ToolCallContext {
  toolName: string
  toolCallId: string
  toolInput: Record<string, unknown>
  toolOutput?: unknown
  status: 'success' | 'error' | 'blocked' | 'proposed'
  durationMs?: number
  errorMessage?: string
  proposalId?: string
}

export async function logToolCall(params: LogToolCallParams): Promise<void> {
  try {
    await prisma.claudeToolCall.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        conversationId: params.conversationId,
        toolName: params.toolName,
        toolCallId: params.toolCallId,
        toolInput: params.toolInput as any,
        toolOutput: params.toolOutput !== undefined ? (params.toolOutput as any) : undefined,
        status: params.status,
        durationMs: params.durationMs,
        errorMessage: params.errorMessage,
        proposalId: params.proposalId,
      },
    })
  } catch {
    // Never crash on audit failure
  }
}
