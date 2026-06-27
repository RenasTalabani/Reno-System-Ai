import { prisma } from '@reno/database'

export interface Capability {
  capabilityId: string
  name: string
  description: string
  category: string
  toolIds: string[]
  providers: string[]
  keywords: string[]
  examples: unknown[] | null
}

export async function listCapabilities(filters?: {
  category?: string
}): Promise<Capability[]> {
  try {
    const where: any = { isEnabled: true }
    if (filters?.category) where.category = filters.category

    const rows = await prisma.aiCapabilityRegistry.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })

    if (rows.length > 0) {
      return rows.map(r => ({
        capabilityId: r.capabilityId,
        name: r.name,
        description: r.description,
        category: r.category,
        toolIds: r.toolIds as string[],
        providers: r.providers as string[],
        keywords: r.keywords as string[],
        examples: r.examples as unknown[] | null,
      }))
    }
  } catch {
    // DB not migrated yet
  }

  // Static fallback (matches Phase 34 spec examples)
  return STATIC_CAPABILITIES
}

export async function getCapabilityById(capabilityId: string): Promise<Capability | null> {
  try {
    const row = await prisma.aiCapabilityRegistry.findUnique({ where: { capabilityId } })
    if (row) {
      return {
        capabilityId: row.capabilityId,
        name: row.name,
        description: row.description,
        category: row.category,
        toolIds: row.toolIds as string[],
        providers: row.providers as string[],
        keywords: row.keywords as string[],
        examples: row.examples as unknown[] | null,
      }
    }
  } catch {
    // ignore
  }
  return STATIC_CAPABILITIES.find(c => c.capabilityId === capabilityId) ?? null
}

// Seeded from Phase 34 spec
const STATIC_CAPABILITIES: Capability[] = [
  {
    capabilityId: 'generate_business_report',
    name: 'Generate Business Report',
    description: 'Produce an aggregated business report across one or more modules',
    category: 'Analytics',
    toolIds: ['generate_report', 'read_dashboard_summary'],
    providers: ['reno_brain', 'claude'],
    keywords: ['report', 'summary', 'overview', 'analysis', 'metrics', 'kpi'],
    examples: [{ request: 'Show me this month\'s revenue report' }],
  },
  {
    capabilityId: 'analyze_customer_inactivity',
    name: 'Analyze Customer Inactivity',
    description: 'Find customers who have not purchased within a given period',
    category: 'CRM',
    toolIds: ['read_customer', 'read_invoice', 'generate_report'],
    providers: ['claude', 'reno_brain'],
    keywords: ['inactive customer', 'no purchase', 'churn', 'retention', 'lapsed'],
    examples: [{ request: 'Show me customers who have not purchased in 90 days' }],
  },
  {
    capabilityId: 'create_workflow_proposal',
    name: 'Create Workflow Proposal',
    description: 'Propose a new automation workflow for human review',
    category: 'Automation',
    toolIds: ['read_dashboard_summary', 'create_workflow_proposal'],
    providers: ['claude', 'reno_brain'],
    keywords: ['automate', 'workflow', 'automation', 'trigger', 'rule'],
    examples: [{ request: 'Create a workflow that sends a reminder when invoices are 7 days overdue' }],
  },
  {
    capabilityId: 'analyze_profit_decline',
    name: 'Analyze Profit Decline',
    description: 'Investigate why profit decreased by analyzing revenue, costs, and trends',
    category: 'Finance',
    toolIds: ['read_dashboard_summary', 'generate_report', 'read_invoice'],
    providers: ['claude', 'reno_brain'],
    keywords: ['profit', 'loss', 'margin decrease', 'revenue down', 'expense up'],
    examples: [{ request: 'Why did profit decrease this month?' }],
  },
  {
    capabilityId: 'restock_low_inventory',
    name: 'Restock Low Inventory',
    description: 'Identify low-stock items and create purchase order proposals',
    category: 'Inventory',
    toolIds: ['read_inventory_stock', 'create_purchase_order_proposal'],
    providers: ['claude', 'reno_brain'],
    keywords: ['low stock', 'reorder', 'out of stock', 'replenish', 'purchase order'],
    examples: [{ request: 'Create purchase orders for all low-stock items' }],
  },
  {
    capabilityId: 'draft_support_reply',
    name: 'Draft Support Reply',
    description: 'Read a helpdesk ticket and draft a reply for agent review',
    category: 'Helpdesk',
    toolIds: ['read_ticket', 'create_support_reply_draft'],
    providers: ['claude', 'reno_brain'],
    keywords: ['reply ticket', 'support response', 'helpdesk reply', 'customer support'],
    examples: [{ request: 'Draft a reply to ticket TKT-0042' }],
  },
  {
    capabilityId: 'employee_lookup',
    name: 'Employee Lookup',
    description: 'Find and return employee information',
    category: 'HR',
    toolIds: ['read_employee'],
    providers: ['reno_brain', 'claude'],
    keywords: ['employee', 'staff', 'who is', 'hr record'],
    examples: [{ request: 'Show me information about John Smith' }],
  },
  {
    capabilityId: 'invoice_draft',
    name: 'Draft Invoice',
    description: 'Create a draft invoice for a customer for human review',
    category: 'Finance',
    toolIds: ['read_customer', 'create_invoice_draft'],
    providers: ['claude', 'reno_brain'],
    keywords: ['create invoice', 'draft invoice', 'bill customer', 'invoice for'],
    examples: [{ request: 'Create an invoice for Acme Corp for 5 consulting days at $1500/day' }],
  },
]
