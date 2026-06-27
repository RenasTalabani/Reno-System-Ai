export type ToolCategory = 'read' | 'proposal' | 'draft'

export interface ToolMeta {
  name: string
  label: string
  description: string
  category: ToolCategory
  isDestructive: boolean
  requiresApproval: boolean
  requiredModules: string[]
}

export const TOOL_REGISTRY: ToolMeta[] = [
  {
    name: 'read_dashboard_summary',
    label: 'Dashboard Summary',
    description: 'Read a high-level business overview across all modules',
    category: 'read',
    isDestructive: false,
    requiresApproval: false,
    requiredModules: [],
  },
  {
    name: 'read_customer',
    label: 'Read Customer',
    description: 'Look up a CRM contact or company by ID, name, or email',
    category: 'read',
    isDestructive: false,
    requiresApproval: false,
    requiredModules: ['crm'],
  },
  {
    name: 'read_employee',
    label: 'Read Employee',
    description: 'Look up an employee record by ID, name, or email',
    category: 'read',
    isDestructive: false,
    requiresApproval: false,
    requiredModules: ['hr'],
  },
  {
    name: 'read_invoice',
    label: 'Read Invoice',
    description: 'Look up a sales invoice by ID or invoice number',
    category: 'read',
    isDestructive: false,
    requiresApproval: false,
    requiredModules: ['finance'],
  },
  {
    name: 'read_inventory_stock',
    label: 'Read Inventory Stock',
    description: 'Check stock levels for a product by name or SKU',
    category: 'read',
    isDestructive: false,
    requiresApproval: false,
    requiredModules: ['inventory'],
  },
  {
    name: 'read_project',
    label: 'Read Project',
    description: 'Look up a project by ID or name, including task counts and status',
    category: 'read',
    isDestructive: false,
    requiresApproval: false,
    requiredModules: ['projects'],
  },
  {
    name: 'read_ticket',
    label: 'Read Support Ticket',
    description: 'Look up a helpdesk ticket by ID or ticket number',
    category: 'read',
    isDestructive: false,
    requiresApproval: false,
    requiredModules: [],
  },
  {
    name: 'generate_report',
    label: 'Generate Report',
    description: 'Generate an aggregated business report for a given type and period',
    category: 'read',
    isDestructive: false,
    requiresApproval: false,
    requiredModules: [],
  },
  {
    name: 'create_task_proposal',
    label: 'Create Task Proposal',
    description: 'Propose creating a new project task (requires human approval)',
    category: 'proposal',
    isDestructive: false,
    requiresApproval: true,
    requiredModules: ['projects'],
  },
  {
    name: 'create_workflow_proposal',
    label: 'Create Workflow Proposal',
    description: 'Propose a new automation workflow (requires human approval)',
    category: 'proposal',
    isDestructive: false,
    requiresApproval: true,
    requiredModules: [],
  },
  {
    name: 'create_invoice_draft',
    label: 'Create Invoice Draft',
    description: 'Draft a sales invoice for review (does not send or post)',
    category: 'draft',
    isDestructive: false,
    requiresApproval: true,
    requiredModules: ['finance'],
  },
  {
    name: 'create_purchase_order_proposal',
    label: 'Create Purchase Order Proposal',
    description: 'Propose a purchase order for a supplier (requires human approval)',
    category: 'proposal',
    isDestructive: false,
    requiresApproval: true,
    requiredModules: ['procurement'],
  },
  {
    name: 'create_support_reply_draft',
    label: 'Create Support Reply Draft',
    description: 'Draft a reply to a helpdesk ticket (does not send)',
    category: 'draft',
    isDestructive: false,
    requiresApproval: true,
    requiredModules: [],
  },
]

export function getToolMeta(name: string): ToolMeta | undefined {
  return TOOL_REGISTRY.find(t => t.name === name)
}

export function isReadTool(name: string): boolean {
  return getToolMeta(name)?.category === 'read'
}

export function requiresApproval(name: string): boolean {
  return getToolMeta(name)?.requiresApproval === true
}

export function isDestructiveTool(name: string): boolean {
  return getToolMeta(name)?.isDestructive === true
}
