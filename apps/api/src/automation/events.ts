// System event type registry — all events that can trigger automation workflows

export const SYSTEM_EVENTS = {
  // HR
  'hr.employee.hired': { label: 'Employee Hired', module: 'hr', description: 'Fired when a new employee is added' },
  'hr.employee.terminated': { label: 'Employee Terminated', module: 'hr', description: 'Fired when an employee is terminated' },
  'hr.leave.requested': { label: 'Leave Requested', module: 'hr', description: 'Fired when an employee submits a leave request' },
  'hr.leave.approved': { label: 'Leave Approved', module: 'hr', description: 'Fired when a leave request is approved' },
  'hr.leave.rejected': { label: 'Leave Rejected', module: 'hr', description: 'Fired when a leave request is rejected' },
  'hr.payroll.processed': { label: 'Payroll Processed', module: 'hr', description: 'Fired when payroll is processed' },

  // CRM
  'crm.lead.created': { label: 'Lead Created', module: 'crm', description: 'Fired when a new lead is created' },
  'crm.lead.converted': { label: 'Lead Converted', module: 'crm', description: 'Fired when a lead is converted to opportunity' },
  'crm.opportunity.won': { label: 'Opportunity Won', module: 'crm', description: 'Fired when a deal is marked as won' },
  'crm.opportunity.lost': { label: 'Opportunity Lost', module: 'crm', description: 'Fired when a deal is marked as lost' },

  // Sales
  'sales.order.created': { label: 'Sales Order Created', module: 'sales', description: 'Fired when a sales order is created' },
  'sales.order.confirmed': { label: 'Sales Order Confirmed', module: 'sales', description: 'Fired when a sales order is confirmed' },
  'sales.order.shipped': { label: 'Sales Order Shipped', module: 'sales', description: 'Fired when an order is shipped' },
  'sales.invoice.created': { label: 'Invoice Created', module: 'sales', description: 'Fired when a sales invoice is created' },
  'sales.invoice.overdue': { label: 'Invoice Overdue', module: 'sales', description: 'Fired when an invoice becomes overdue' },
  'sales.payment.received': { label: 'Payment Received', module: 'sales', description: 'Fired when a customer payment is received' },

  // Finance
  'finance.bill.created': { label: 'Vendor Bill Created', module: 'finance', description: 'Fired when a vendor bill is created' },
  'finance.bill.overdue': { label: 'Vendor Bill Overdue', module: 'finance', description: 'Fired when a vendor bill becomes overdue' },
  'finance.payment.made': { label: 'Payment Made', module: 'finance', description: 'Fired when a payment is made to a vendor' },

  // Inventory
  'inventory.stock.low': { label: 'Stock Low', module: 'inventory', description: 'Fired when stock falls below minimum level' },
  'inventory.stock.out': { label: 'Out of Stock', module: 'inventory', description: 'Fired when a product reaches zero stock' },
  'inventory.receipt.confirmed': { label: 'Stock Receipt Confirmed', module: 'inventory', description: 'Fired when stock is received and confirmed' },
  'inventory.transfer.completed': { label: 'Transfer Completed', module: 'inventory', description: 'Fired when a warehouse transfer is completed' },

  // Procurement
  'procurement.order.created': { label: 'Purchase Order Created', module: 'procurement', description: 'Fired when a purchase order is created' },
  'procurement.order.approved': { label: 'Purchase Order Approved', module: 'procurement', description: 'Fired when a PO is approved' },
  'procurement.order.received': { label: 'Purchase Order Received', module: 'procurement', description: 'Fired when goods are received against a PO' },
  'procurement.order.overdue': { label: 'Purchase Order Overdue', module: 'procurement', description: 'Fired when a PO expected date is passed' },

  // Manufacturing
  'manufacturing.order.created': { label: 'Manufacturing Order Created', module: 'manufacturing', description: 'Fired when an MO is created' },
  'manufacturing.order.started': { label: 'Manufacturing Order Started', module: 'manufacturing', description: 'Fired when production begins' },
  'manufacturing.order.completed': { label: 'Manufacturing Order Completed', module: 'manufacturing', description: 'Fired when an MO is finished' },
  'manufacturing.order.cancelled': { label: 'Manufacturing Order Cancelled', module: 'manufacturing', description: 'Fired when an MO is cancelled' },

  // Projects
  'projects.project.created': { label: 'Project Created', module: 'projects', description: 'Fired when a new project is created' },
  'projects.task.assigned': { label: 'Task Assigned', module: 'projects', description: 'Fired when a task is assigned to someone' },
  'projects.task.completed': { label: 'Task Completed', module: 'projects', description: 'Fired when a task is marked complete' },
  'projects.task.overdue': { label: 'Task Overdue', module: 'projects', description: 'Fired when a task passes its due date' },

  // Brain
  'brain.action.proposed': { label: 'Brain Action Proposed', module: 'brain', description: 'Fired when Reno Brain proposes an action' },
  'brain.action.approved': { label: 'Brain Action Approved', module: 'brain', description: 'Fired when a Brain-proposed action is approved' },

  // Automation
  'automation.workflow.failed': { label: 'Workflow Failed', module: 'automation', description: 'Fired when a workflow execution fails' },
} as const

export type SystemEventType = keyof typeof SYSTEM_EVENTS

export function getEventMeta(eventType: string) {
  return (SYSTEM_EVENTS as Record<string, { label: string; module: string; description: string }>)[eventType] ?? null
}
