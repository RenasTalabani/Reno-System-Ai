-- Phase 34: Universal AI Skill Engine
-- Creates: ai_tool_registry, ai_capability_registry, ai_skill_executions

CREATE TABLE "ai_tool_registry" (
  "id"                   UUID          NOT NULL DEFAULT gen_random_uuid(),
  "tool_id"              VARCHAR(100)  NOT NULL,
  "name"                 VARCHAR(200)  NOT NULL,
  "description"          TEXT          NOT NULL,
  "category"             VARCHAR(50)   NOT NULL,
  "module"               VARCHAR(50),
  "version"              VARCHAR(20)   NOT NULL DEFAULT '1.0.0',
  "owner"                VARCHAR(100)  NOT NULL DEFAULT 'reno',
  "required_permissions" JSONB         NOT NULL DEFAULT '[]',
  "risk_level"           VARCHAR(20)   NOT NULL DEFAULT 'low',
  "input_schema"         JSONB         NOT NULL DEFAULT '{}',
  "output_schema"        JSONB,
  "is_destructive"       BOOLEAN       NOT NULL DEFAULT false,
  "requires_approval"    BOOLEAN       NOT NULL DEFAULT false,
  "deprecated"           BOOLEAN       NOT NULL DEFAULT false,
  "replacement_tool_id"  VARCHAR(100),
  "is_enabled"           BOOLEAN       NOT NULL DEFAULT true,
  "keywords"             JSONB         NOT NULL DEFAULT '[]',
  "metadata"             JSONB,
  "created_at"           TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"           TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_tool_registry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_tool_registry_tool_id_key" ON "ai_tool_registry"("tool_id");
CREATE INDEX "ai_tool_registry_category_idx"  ON "ai_tool_registry"("category");
CREATE INDEX "ai_tool_registry_module_idx"    ON "ai_tool_registry"("module");
CREATE INDEX "ai_tool_registry_is_enabled_idx" ON "ai_tool_registry"("is_enabled");

CREATE TABLE "ai_capability_registry" (
  "id"            UUID          NOT NULL DEFAULT gen_random_uuid(),
  "capability_id" VARCHAR(100)  NOT NULL,
  "name"          VARCHAR(200)  NOT NULL,
  "description"   TEXT          NOT NULL,
  "category"      VARCHAR(50)   NOT NULL,
  "tool_ids"      JSONB         NOT NULL DEFAULT '[]',
  "providers"     JSONB         NOT NULL DEFAULT '[]',
  "keywords"      JSONB         NOT NULL DEFAULT '[]',
  "examples"      JSONB,
  "is_enabled"    BOOLEAN       NOT NULL DEFAULT true,
  "created_at"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_capability_registry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_capability_registry_capability_id_key" ON "ai_capability_registry"("capability_id");
CREATE INDEX "ai_capability_registry_category_idx" ON "ai_capability_registry"("category");

CREATE TABLE "ai_skill_executions" (
  "id"                  UUID          NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"           UUID          NOT NULL,
  "user_id"             UUID,
  "conversation_id"     UUID,
  "provider"            VARCHAR(50)   NOT NULL,
  "user_request"        TEXT          NOT NULL,
  "skill_plan"          JSONB         NOT NULL DEFAULT '{}',
  "execution_graph"     JSONB         NOT NULL DEFAULT '{}',
  "tools_used"          JSONB         NOT NULL DEFAULT '[]',
  "proposals_created"   JSONB         NOT NULL DEFAULT '[]',
  "context_size_before" INTEGER,
  "context_size_after"  INTEGER,
  "compression_ratio"   DOUBLE PRECISION,
  "estimated_tokens"    INTEGER,
  "actual_tokens"       INTEGER,
  "estimated_cost_usd"  DECIMAL(10,6),
  "actual_cost_usd"     DECIMAL(10,6),
  "budget_action"       VARCHAR(20),
  "status"              VARCHAR(20)   NOT NULL DEFAULT 'success',
  "error_message"       TEXT,
  "duration_ms"         INTEGER,
  "occurred_at"         TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_skill_executions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_skill_executions_tenant_id_occurred_at_idx" ON "ai_skill_executions"("tenant_id", "occurred_at" DESC);
CREATE INDEX "ai_skill_executions_tenant_id_provider_idx"    ON "ai_skill_executions"("tenant_id", "provider");
CREATE INDEX "ai_skill_executions_tenant_id_status_idx"      ON "ai_skill_executions"("tenant_id", "status");

ALTER TABLE "ai_skill_executions"
  ADD CONSTRAINT "ai_skill_executions_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Seed: tool registry (mirrors Phase 33 TOOL_REGISTRY in code)
INSERT INTO "ai_tool_registry" ("tool_id","name","description","category","module","risk_level","is_destructive","requires_approval","keywords","input_schema") VALUES
('read_customer',              'Read Customer',             'Retrieve customer/contact records from CRM',                            'read',     'crm',       'low',    false, false, '["customer","contact","client","crm","lead"]',             '{}'),
('read_employee',              'Read Employee',             'Retrieve HR employee records',                                          'read',     'hr',        'low',    false, false, '["employee","staff","hr","personnel"]',                    '{}'),
('read_invoice',               'Read Invoice',              'Retrieve sales invoice records',                                        'read',     'finance',   'low',    false, false, '["invoice","billing","payment","revenue"]',                '{}'),
('read_inventory_stock',       'Read Inventory Stock',      'Retrieve product stock levels from inventory',                          'read',     'inventory', 'low',    false, false, '["stock","inventory","product","warehouse"]',              '{}'),
('read_project',               'Read Project',              'Retrieve project records from project management',                      'read',     'pm',        'low',    false, false, '["project","milestone","sprint","deadline"]',              '{}'),
('read_ticket',                'Read Ticket',               'Retrieve helpdesk support tickets',                                     'read',     'helpdesk',  'low',    false, false, '["ticket","support","helpdesk","issue"]',                  '{}'),
('generate_report',            'Generate Report',           'Aggregate business data into a structured report',                      'read',     NULL,        'low',    false, false, '["report","summary","analytics","kpi"]',                   '{}'),
('read_dashboard_summary',     'Read Dashboard Summary',    'Return high-level business health metrics',                             'read',     NULL,        'low',    false, false, '["dashboard","health","overview","metrics"]',              '{}'),
('create_task_proposal',       'Create Task Proposal',      'Propose creating a new task (requires human approval)',                  'proposal', 'pm',        'medium', false, true,  '["task","create task","assign"]',                          '{}'),
('create_workflow_proposal',   'Create Workflow Proposal',  'Propose a new automation workflow (requires human approval)',            'proposal', 'automation','medium', false, true,  '["workflow","automate","trigger","rule"]',                 '{}'),
('create_invoice_draft',       'Create Invoice Draft',      'Draft a sales invoice for human review before sending',                 'draft',    'finance',   'medium', false, true,  '["invoice draft","create invoice","bill"]',                '{}'),
('create_purchase_order_proposal','Create PO Proposal',     'Propose a purchase order for replenishment (requires human approval)',  'proposal', 'inventory', 'medium', false, true,  '["purchase order","reorder","supplier","restock"]',        '{}'),
('create_support_reply_draft', 'Draft Support Reply',       'Draft a reply to a helpdesk ticket for agent review',                   'draft',    'helpdesk',  'low',    false, true,  '["reply ticket","support reply","response"]',              '{}');

-- Seed: capability registry (matches STATIC_CAPABILITIES in capability-registry.ts)
INSERT INTO "ai_capability_registry" ("capability_id","name","description","category","tool_ids","providers","keywords") VALUES
('generate_business_report',   'Generate Business Report',    'Produce an aggregated business report across one or more modules', 'Analytics', '["generate_report","read_dashboard_summary"]',                       '["reno_brain","claude"]', '["report","summary","overview","analysis","metrics","kpi"]'),
('analyze_customer_inactivity','Analyze Customer Inactivity', 'Find customers who have not purchased within a given period',       'CRM',       '["read_customer","read_invoice","generate_report"]',                 '["claude","reno_brain"]', '["inactive customer","no purchase","churn","retention","lapsed"]'),
('create_workflow_proposal',   'Create Workflow Proposal',    'Propose a new automation workflow for human review',               'Automation','["read_dashboard_summary","create_workflow_proposal"]',             '["claude","reno_brain"]', '["automate","workflow","automation","trigger","rule"]'),
('analyze_profit_decline',     'Analyze Profit Decline',      'Investigate why profit decreased by analyzing revenue and costs',   'Finance',   '["read_dashboard_summary","generate_report","read_invoice"]',        '["claude","reno_brain"]', '["profit","loss","margin decrease","revenue down","expense up"]'),
('restock_low_inventory',      'Restock Low Inventory',       'Identify low-stock items and create purchase order proposals',      'Inventory', '["read_inventory_stock","create_purchase_order_proposal"]',          '["claude","reno_brain"]', '["low stock","reorder","out of stock","replenish","purchase order"]'),
('draft_support_reply',        'Draft Support Reply',         'Read a helpdesk ticket and draft a reply for agent review',         'Helpdesk',  '["read_ticket","create_support_reply_draft"]',                       '["claude","reno_brain"]', '["reply ticket","support response","helpdesk reply","customer support"]'),
('employee_lookup',            'Employee Lookup',             'Find and return employee information',                              'HR',        '["read_employee"]',                                                  '["reno_brain","claude"]', '["employee","staff","who is","hr record"]'),
('invoice_draft',              'Draft Invoice',               'Create a draft invoice for a customer for human review',           'Finance',   '["read_customer","create_invoice_draft"]',                           '["claude","reno_brain"]', '["create invoice","draft invoice","bill customer","invoice for"]');
