import type Anthropic from '@anthropic-ai/sdk'

export function getAnthropicToolDefinitions(): Anthropic.Tool[] {
  return [
    {
      name: 'read_dashboard_summary',
      description: 'Read a real-time business overview: revenue, orders, employees, inventory, projects, support tickets. Use this for executive summaries or when the user asks about overall business health.',
      input_schema: {
        type: 'object' as const,
        properties: {},
        required: [],
      },
    },
    {
      name: 'read_customer',
      description: 'Look up a CRM contact or company. Returns name, email, phone, status, assigned deals, and notes. Never returns passwords or payment card data.',
      input_schema: {
        type: 'object' as const,
        properties: {
          identifier: {
            type: 'string',
            description: 'Customer name, email, company name, or UUID. Use partial names if unsure.',
          },
        },
        required: ['identifier'],
      },
    },
    {
      name: 'read_employee',
      description: 'Look up an employee record. Returns name, job title, department, hire date, and status. Does NOT return salary, payroll, or private HR data.',
      input_schema: {
        type: 'object' as const,
        properties: {
          identifier: {
            type: 'string',
            description: 'Employee name, email, or UUID.',
          },
        },
        required: ['identifier'],
      },
    },
    {
      name: 'read_invoice',
      description: 'Look up a sales invoice. Returns invoice number, customer, line items, total, status, and due date.',
      input_schema: {
        type: 'object' as const,
        properties: {
          identifier: {
            type: 'string',
            description: 'Invoice number (e.g. INV-2024-001) or UUID.',
          },
        },
        required: ['identifier'],
      },
    },
    {
      name: 'read_inventory_stock',
      description: 'Check current stock levels for a product. Returns on-hand quantity, reserved, available, and reorder threshold.',
      input_schema: {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string',
            description: 'Product name, SKU, or partial match.',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'read_project',
      description: 'Look up a project. Returns name, status, start/end dates, budget, task counts, and milestone summary.',
      input_schema: {
        type: 'object' as const,
        properties: {
          identifier: {
            type: 'string',
            description: 'Project name or UUID.',
          },
        },
        required: ['identifier'],
      },
    },
    {
      name: 'read_ticket',
      description: 'Look up a helpdesk support ticket. Returns subject, priority, status, assignee, SLA status, and recent comments.',
      input_schema: {
        type: 'object' as const,
        properties: {
          identifier: {
            type: 'string',
            description: 'Ticket number (e.g. TKT-001) or UUID.',
          },
        },
        required: ['identifier'],
      },
    },
    {
      name: 'generate_report',
      description: 'Generate an aggregated business report. Use for revenue summaries, HR headcount, inventory valuation, support metrics, or project health.',
      input_schema: {
        type: 'object' as const,
        properties: {
          report_type: {
            type: 'string',
            enum: ['revenue', 'hr_headcount', 'inventory', 'support', 'projects', 'procurement'],
            description: 'The type of report to generate.',
          },
          period: {
            type: 'string',
            enum: ['today', 'this_week', 'this_month', 'last_30_days', 'last_90_days', 'this_year'],
            description: 'The time period for the report. Defaults to this_month.',
          },
        },
        required: ['report_type'],
      },
    },
    {
      name: 'create_task_proposal',
      description: 'Propose creating a new task in a project. This does NOT immediately create the task — it creates a pending proposal that a human must approve. Use when the user says "create a task" or "add a task".',
      input_schema: {
        type: 'object' as const,
        properties: {
          title: { type: 'string', description: 'Task title.' },
          description: { type: 'string', description: 'Optional task description.' },
          project_name: { type: 'string', description: 'Project name or partial match to assign the task to.' },
          assignee_name: { type: 'string', description: 'Name of the person to assign the task to (optional).' },
          due_date: { type: 'string', description: 'Due date in ISO 8601 format (YYYY-MM-DD), optional.' },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'Task priority, defaults to medium.',
          },
        },
        required: ['title'],
      },
    },
    {
      name: 'create_workflow_proposal',
      description: 'Propose a new automation workflow. Does NOT immediately create or activate the workflow — a human must approve. Use when the user asks to automate something.',
      input_schema: {
        type: 'object' as const,
        properties: {
          name: { type: 'string', description: 'Workflow name.' },
          description: { type: 'string', description: 'What this workflow does.' },
          trigger: { type: 'string', description: 'What triggers this workflow (e.g. "when a new lead is added", "every Monday at 9am").' },
          steps: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of steps the workflow performs in order.',
          },
        },
        required: ['name', 'trigger', 'steps'],
      },
    },
    {
      name: 'create_invoice_draft',
      description: 'Draft a sales invoice for review. Does NOT post, send, or charge anything — creates a draft that a human must review and approve. Use when the user asks to "create an invoice" or "draft an invoice".',
      input_schema: {
        type: 'object' as const,
        properties: {
          customer_name: { type: 'string', description: 'Customer name or company to invoice.' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                quantity: { type: 'number' },
                unit_price: { type: 'number' },
              },
              required: ['description', 'quantity', 'unit_price'],
            },
            description: 'Line items for the invoice.',
          },
          due_date: { type: 'string', description: 'Payment due date in ISO 8601 format (optional).' },
          notes: { type: 'string', description: 'Internal or customer-facing notes (optional).' },
        },
        required: ['customer_name', 'items'],
      },
    },
    {
      name: 'create_purchase_order_proposal',
      description: 'Propose a purchase order to a supplier. Does NOT send or commit any funds — creates a pending proposal for human review. Use when the user asks to order something from a vendor.',
      input_schema: {
        type: 'object' as const,
        properties: {
          supplier_name: { type: 'string', description: 'Supplier or vendor name.' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                product_name: { type: 'string' },
                quantity: { type: 'number' },
                estimated_unit_price: { type: 'number' },
              },
              required: ['product_name', 'quantity'],
            },
            description: 'Items to order.',
          },
          notes: { type: 'string', description: 'Additional instructions or notes (optional).' },
        },
        required: ['supplier_name', 'items'],
      },
    },
    {
      name: 'create_support_reply_draft',
      description: 'Draft a reply to a helpdesk ticket. Does NOT send the reply — creates a draft for agent review. Use when the user asks Claude to "reply to ticket" or "respond to customer".',
      input_schema: {
        type: 'object' as const,
        properties: {
          ticket_identifier: { type: 'string', description: 'Ticket number or UUID.' },
          message: { type: 'string', description: 'The draft reply message.' },
          internal_note: { type: 'boolean', description: 'If true, this is an internal note (not visible to customer). Default false.' },
        },
        required: ['ticket_identifier', 'message'],
      },
    },
  ]
}
