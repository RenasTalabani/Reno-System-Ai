import { prisma } from '@reno/database'

export interface ProposalResult {
  proposalId: string
  proposalSummary: string
  status: 'pending_approval'
  message: string
}

export async function createTaskProposal(
  tenantId: string,
  userId: string,
  conversationId: string | undefined,
  input: {
    title: string
    description?: string
    project_name?: string
    assignee_name?: string
    due_date?: string
    priority?: string
  }
): Promise<ProposalResult> {
  const summary = [
    `Create task: "${input.title}"`,
    input.project_name ? `Project: ${input.project_name}` : null,
    input.assignee_name ? `Assignee: ${input.assignee_name}` : null,
    input.due_date ? `Due: ${input.due_date}` : null,
    input.priority ? `Priority: ${input.priority}` : null,
  ].filter(Boolean).join(' | ')

  const proposal = await prisma.aiExecProposal.create({
    data: {
      tenantId,
      executiveRole: 'assistant',
      proposalType: 'create_task',
      title: `Create task: ${input.title}`,
      description: summary,
      rationale: `Proposed by Claude based on user request in conversation ${conversationId ?? 'unknown'}`,
      proposedPayload: {
        tool: 'create_task_proposal',
        conversationId,
        ...input,
      } as any,
      priority: (input.priority as any) ?? 'medium',
      status: 'pending_approval',
    },
  })

  return {
    proposalId: proposal.id,
    proposalSummary: summary,
    status: 'pending_approval',
    message: `Task proposal created (ID: ${proposal.id}). A manager must approve this before the task is created.`,
  }
}

export async function createWorkflowProposal(
  tenantId: string,
  userId: string,
  conversationId: string | undefined,
  input: {
    name: string
    description?: string
    trigger: string
    steps: string[]
  }
): Promise<ProposalResult> {
  const summary = `Create workflow: "${input.name}" | Trigger: ${input.trigger} | Steps: ${input.steps.length}`

  const proposal = await prisma.aiExecProposal.create({
    data: {
      tenantId,
      executiveRole: 'assistant',
      proposalType: 'create_workflow',
      title: `Create workflow: ${input.name}`,
      description: `${input.description ?? ''}\nTrigger: ${input.trigger}\nSteps:\n${input.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
      rationale: `Proposed by Claude based on user request in conversation ${conversationId ?? 'unknown'}`,
      proposedPayload: {
        tool: 'create_workflow_proposal',
        conversationId,
        ...input,
      } as any,
      priority: 'medium',
      status: 'pending_approval',
    },
  })

  return {
    proposalId: proposal.id,
    proposalSummary: summary,
    status: 'pending_approval',
    message: `Workflow proposal created (ID: ${proposal.id}). A manager must approve this before the workflow is created.`,
  }
}

export async function createInvoiceDraft(
  tenantId: string,
  userId: string,
  conversationId: string | undefined,
  input: {
    customer_name: string
    items: Array<{ description: string; quantity: number; unit_price: number }>
    due_date?: string
    notes?: string
  }
): Promise<ProposalResult> {
  const total = input.items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)
  const summary = `Invoice draft for ${input.customer_name} | ${input.items.length} line items | Total: ${total.toFixed(2)}`

  const proposal = await prisma.aiExecProposal.create({
    data: {
      tenantId,
      executiveRole: 'assistant',
      proposalType: 'create_invoice_draft',
      title: `Invoice draft: ${input.customer_name}`,
      description: summary,
      rationale: `Draft invoice proposed by Claude in conversation ${conversationId ?? 'unknown'}`,
      proposedPayload: {
        tool: 'create_invoice_draft',
        conversationId,
        estimatedTotal: total,
        ...input,
      } as any,
      priority: 'medium',
      status: 'pending_approval',
    },
  })

  return {
    proposalId: proposal.id,
    proposalSummary: summary,
    status: 'pending_approval',
    message: `Invoice draft proposal created (ID: ${proposal.id}). Estimated total: ${total.toFixed(2)}. A finance team member must review and post this invoice.`,
  }
}

export async function createPurchaseOrderProposal(
  tenantId: string,
  userId: string,
  conversationId: string | undefined,
  input: {
    supplier_name: string
    items: Array<{ product_name: string; quantity: number; estimated_unit_price?: number }>
    notes?: string
  }
): Promise<ProposalResult> {
  const estimatedTotal = input.items.reduce((sum, i) => sum + i.quantity * (i.estimated_unit_price ?? 0), 0)
  const summary = `Purchase order from ${input.supplier_name} | ${input.items.length} items | Est. total: ${estimatedTotal.toFixed(2)}`

  const proposal = await prisma.aiExecProposal.create({
    data: {
      tenantId,
      executiveRole: 'assistant',
      proposalType: 'create_purchase_order',
      title: `PO proposal: ${input.supplier_name}`,
      description: summary,
      rationale: `Proposed by Claude in conversation ${conversationId ?? 'unknown'}`,
      proposedPayload: {
        tool: 'create_purchase_order_proposal',
        conversationId,
        estimatedTotal,
        ...input,
      } as any,
      priority: 'medium',
      status: 'pending_approval',
    },
  })

  return {
    proposalId: proposal.id,
    proposalSummary: summary,
    status: 'pending_approval',
    message: `Purchase order proposal created (ID: ${proposal.id}). Estimated total: ${estimatedTotal.toFixed(2)}. Procurement team must approve before any order is placed.`,
  }
}

export async function createSupportReplyDraft(
  tenantId: string,
  userId: string,
  conversationId: string | undefined,
  input: {
    ticket_identifier: string
    message: string
    internal_note?: boolean
  }
): Promise<ProposalResult> {
  const noteType = input.internal_note ? 'internal note' : 'customer reply'
  const summary = `Support ${noteType} draft for ticket ${input.ticket_identifier} | ${input.message.slice(0, 80)}...`

  const proposal = await prisma.aiExecProposal.create({
    data: {
      tenantId,
      executiveRole: 'assistant',
      proposalType: 'create_support_reply',
      title: `Support reply draft: ${input.ticket_identifier}`,
      description: `${noteType.toUpperCase()}: ${input.message}`,
      rationale: `Drafted by Claude in conversation ${conversationId ?? 'unknown'}`,
      proposedPayload: {
        tool: 'create_support_reply_draft',
        conversationId,
        ...input,
      } as any,
      priority: 'medium',
      status: 'pending_approval',
    },
  })

  return {
    proposalId: proposal.id,
    proposalSummary: summary,
    status: 'pending_approval',
    message: `Support reply draft created (ID: ${proposal.id}). A support agent must review and send this reply.`,
  }
}
