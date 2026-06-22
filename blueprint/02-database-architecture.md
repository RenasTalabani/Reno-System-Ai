# Reno System — Master Blueprint v1
## Document 2: Database Architecture

**Project:** Reno System  
**Owner:** Renas Talabani  
**Status:** DRAFT — Awaiting Owner Approval  
**Version:** 1.0.0  
**Date:** 2026-06-22  

---

## 1. Database Engine

**PostgreSQL 15+**

Chosen for:
- ACID compliance (mandatory for financial, HR, and legal data)
- JSONB columns (flexible metadata without schema migration per row)
- Row Level Security (RLS) — database-enforced tenant isolation
- Full-text search (reduces external search infrastructure need in early phases)
- UUID generation (`gen_random_uuid()`) — no sequential IDs exposed
- Excellent Prisma ORM support

---

## 2. Universal Row Standard

**Every single table** in every module must include these 8 columns with no exceptions:

```sql
id           UUID          PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id    UUID          NOT NULL REFERENCES core_tenants(id) ON DELETE RESTRICT
created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
created_by   UUID          REFERENCES core_users(id) ON DELETE SET NULL
updated_by   UUID          REFERENCES core_users(id) ON DELETE SET NULL
deleted_at   TIMESTAMPTZ   NULL
is_active    BOOLEAN       NOT NULL DEFAULT true
```

**Soft Delete Policy:** `deleted_at IS NULL` = active record. `deleted_at IS NOT NULL` = deleted.  
All standard queries must include `WHERE deleted_at IS NULL` unless explicitly querying history.

**Auto-update `updated_at`:** A PostgreSQL trigger is applied to all tables:
```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 3. Table Naming Convention

Every table is prefixed by its module to avoid collisions and make the schema self-documenting:

| Prefix | Module |
|---|---|
| `core_` | Identity, Auth, Users, Roles, Permissions |
| `hr_` | Human Resources |
| `crm_` | Customer Relationship Management |
| `proj_` | Project Management |
| `sales_` | Sales |
| `proc_` | Procurement |
| `inv_` | Inventory |
| `fin_` | Finance / Accounting |
| `doc_` | Documents |
| `asset_` | Assets |
| `svc_` | Service Desk |
| `comm_` | Communication |
| `bi_` | Business Intelligence (saved configs) |
| `auto_` | Automation Engine |
| `ai_` | AI / Reno Brain |
| `sys_` | System-wide (audit logs, notifications, settings, jobs) |
| `mkt_` | Marketplace |

---

## 4. Core Module Schema (Phase 0)

### 4.1 core_tenants
```sql
id              UUID          PK
name            VARCHAR(255)  NOT NULL
slug            VARCHAR(100)  NOT NULL UNIQUE          -- subdomain: acme.reno-system.com
plan            VARCHAR(50)   NOT NULL DEFAULT 'starter' -- starter|professional|business|enterprise
status          VARCHAR(50)   NOT NULL DEFAULT 'active'  -- active|suspended|cancelled|trial
trial_ends_at   TIMESTAMPTZ   NULL
settings        JSONB         NOT NULL DEFAULT '{}'
metadata        JSONB         NOT NULL DEFAULT '{}'
-- standard 8 columns (no tenant_id on this table — it IS the tenant root)
```

### 4.2 core_companies
```sql
id              UUID          PK
tenant_id       UUID          NOT NULL FK → core_tenants
name            VARCHAR(255)  NOT NULL
legal_name      VARCHAR(255)  NULL
logo_url        VARCHAR(500)  NULL
registration_no VARCHAR(100)  NULL
tax_id          VARCHAR(100)  NULL
currency        VARCHAR(10)   NOT NULL DEFAULT 'USD'
timezone        VARCHAR(100)  NOT NULL DEFAULT 'UTC'
date_format     VARCHAR(50)   NOT NULL DEFAULT 'YYYY-MM-DD'
fiscal_year_start INT         NOT NULL DEFAULT 1        -- month number
address         JSONB         NULL                       -- { street, city, state, country, zip }
contact         JSONB         NULL                       -- { phone, email, website }
settings        JSONB         NOT NULL DEFAULT '{}'
-- + standard 8 columns
```

### 4.3 core_branches
```sql
id              UUID          PK
tenant_id       UUID          NOT NULL FK → core_tenants
company_id      UUID          NOT NULL FK → core_companies
name            VARCHAR(255)  NOT NULL
code            VARCHAR(50)   NULL
branch_type     VARCHAR(50)   NULL                       -- head_office|branch|warehouse|satellite
address         JSONB         NULL
contact         JSONB         NULL
manager_id      UUID          NULL FK → core_users
settings        JSONB         NOT NULL DEFAULT '{}'
-- + standard 8 columns
```

### 4.4 core_departments
```sql
id              UUID          PK
tenant_id       UUID          NOT NULL FK → core_tenants
company_id      UUID          NOT NULL FK → core_companies
branch_id       UUID          NULL FK → core_branches
parent_id       UUID          NULL FK → core_departments  -- tree structure
name            VARCHAR(255)  NOT NULL
code            VARCHAR(50)   NULL
description     TEXT          NULL
head_id         UUID          NULL FK → core_users        -- department head
settings        JSONB         NOT NULL DEFAULT '{}'
-- + standard 8 columns
```

### 4.5 core_teams
```sql
id              UUID          PK
tenant_id       UUID          NOT NULL FK → core_tenants
department_id   UUID          NULL FK → core_departments
name            VARCHAR(255)  NOT NULL
description     TEXT          NULL
lead_id         UUID          NULL FK → core_users
settings        JSONB         NOT NULL DEFAULT '{}'
-- + standard 8 columns
```

### 4.6 core_users
```sql
id              UUID          PK
tenant_id       UUID          NOT NULL FK → core_tenants
email           VARCHAR(255)  NOT NULL
email_verified  BOOLEAN       NOT NULL DEFAULT false
phone           VARCHAR(50)   NULL
phone_verified  BOOLEAN       NOT NULL DEFAULT false
password_hash   VARCHAR(255)  NOT NULL
status          VARCHAR(50)   NOT NULL DEFAULT 'active'   -- active|inactive|suspended|pending
mfa_enabled     BOOLEAN       NOT NULL DEFAULT false
mfa_secret      VARCHAR(255)  NULL                        -- encrypted TOTP secret
last_login_at   TIMESTAMPTZ   NULL
last_login_ip   VARCHAR(50)   NULL
password_changed_at TIMESTAMPTZ NULL
must_change_password BOOLEAN  NOT NULL DEFAULT false
locale          VARCHAR(20)   NOT NULL DEFAULT 'en'
timezone        VARCHAR(100)  NULL
metadata        JSONB         NOT NULL DEFAULT '{}'
-- + standard 8 columns

UNIQUE(tenant_id, email)
```

### 4.7 core_user_profiles
```sql
id              UUID          PK
tenant_id       UUID          NOT NULL FK → core_tenants
user_id         UUID          NOT NULL FK → core_users
first_name      VARCHAR(100)  NOT NULL
last_name       VARCHAR(100)  NOT NULL
display_name    VARCHAR(200)  NULL
avatar_url      VARCHAR(500)  NULL
date_of_birth   DATE          NULL
gender          VARCHAR(20)   NULL
nationality     VARCHAR(100)  NULL
bio             TEXT          NULL
social_links    JSONB         NOT NULL DEFAULT '{}'       -- { linkedin, twitter, github }
preferences     JSONB         NOT NULL DEFAULT '{}'       -- UI preferences
-- + standard 8 columns

UNIQUE(tenant_id, user_id)
```

### 4.8 core_user_memberships
```sql
id              UUID          PK
tenant_id       UUID          NOT NULL FK → core_tenants
user_id         UUID          NOT NULL FK → core_users
company_id      UUID          NOT NULL FK → core_companies
branch_id       UUID          NULL FK → core_branches
department_id   UUID          NULL FK → core_departments
team_id         UUID          NULL FK → core_teams
job_title       VARCHAR(200)  NULL
employee_id     VARCHAR(100)  NULL                        -- HR employee number
is_primary      BOOLEAN       NOT NULL DEFAULT true       -- primary membership
-- + standard 8 columns
```

### 4.9 core_roles
```sql
id              UUID          PK
tenant_id       UUID          NOT NULL FK → core_tenants
name            VARCHAR(100)  NOT NULL
slug            VARCHAR(100)  NOT NULL                    -- hr_manager, finance_viewer
description     TEXT          NULL
is_system       BOOLEAN       NOT NULL DEFAULT false      -- system roles cannot be deleted
color           VARCHAR(20)   NULL                        -- UI color for the role badge
scope           VARCHAR(50)   NOT NULL DEFAULT 'company'  -- tenant|company|branch|department
-- + standard 8 columns

UNIQUE(tenant_id, slug)
```

### 4.10 core_permissions
```sql
id              UUID          PK
module          VARCHAR(100)  NOT NULL                    -- hr, crm, finance
resource        VARCHAR(100)  NOT NULL                    -- employees, invoices
action          VARCHAR(50)   NOT NULL                    -- read, create, update, delete, export, approve
scope           VARCHAR(50)   NOT NULL DEFAULT 'all'      -- own|team|department|branch|company|all
description     TEXT          NULL
-- NO tenant_id — permissions are global system definitions
-- + created_at, updated_at only

UNIQUE(module, resource, action, scope)
```

### 4.11 core_role_permissions
```sql
id              UUID          PK
tenant_id       UUID          NOT NULL FK → core_tenants
role_id         UUID          NOT NULL FK → core_roles
permission_id   UUID          NOT NULL FK → core_permissions
granted         BOOLEAN       NOT NULL DEFAULT true       -- false = explicit deny
-- + standard 8 columns

UNIQUE(tenant_id, role_id, permission_id)
```

### 4.12 core_user_roles
```sql
id              UUID          PK
tenant_id       UUID          NOT NULL FK → core_tenants
user_id         UUID          NOT NULL FK → core_users
role_id         UUID          NOT NULL FK → core_roles
company_id      UUID          NULL FK → core_companies    -- scope this role to a company
branch_id       UUID          NULL FK → core_branches     -- scope this role to a branch
expires_at      TIMESTAMPTZ   NULL
-- + standard 8 columns

UNIQUE(tenant_id, user_id, role_id, company_id, branch_id)
```

### 4.13 core_user_permission_overrides
```sql
id              UUID          PK
tenant_id       UUID          NOT NULL FK → core_tenants
user_id         UUID          NOT NULL FK → core_users
permission_id   UUID          NOT NULL FK → core_permissions
granted         BOOLEAN       NOT NULL DEFAULT true       -- explicit grant or deny
reason          TEXT          NULL
expires_at      TIMESTAMPTZ   NULL
granted_by      UUID          FK → core_users
-- + standard 8 columns
```

### 4.14 core_sessions
```sql
id              UUID          PK
tenant_id       UUID          NOT NULL FK → core_tenants
user_id         UUID          NOT NULL FK → core_users
refresh_token_hash VARCHAR(255) NOT NULL
device_name     VARCHAR(255)  NULL                        -- "iPhone 15", "Chrome on Windows"
device_type     VARCHAR(50)   NULL                        -- web|mobile|desktop|api
ip_address      VARCHAR(50)   NULL
user_agent      TEXT          NULL
last_active_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
expires_at      TIMESTAMPTZ   NOT NULL
revoked_at      TIMESTAMPTZ   NULL
-- + standard 8 columns
```

### 4.15 sys_audit_logs
```sql
id              UUID          PK
tenant_id       UUID          NOT NULL FK → core_tenants
user_id         UUID          NULL FK → core_users        -- NULL = system action
session_id      UUID          NULL FK → core_sessions
action          VARCHAR(100)  NOT NULL                    -- "employee.salary.updated"
module          VARCHAR(100)  NOT NULL
entity_type     VARCHAR(100)  NOT NULL                    -- "hr_employees"
entity_id       UUID          NULL
old_values      JSONB         NULL
new_values      JSONB         NULL
ip_address      VARCHAR(50)   NULL
user_agent      TEXT          NULL
request_id      UUID          NULL                        -- correlation ID
metadata        JSONB         NULL
occurred_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
-- NO updated_at, deleted_at, is_active — audit logs are immutable
-- INDEX ON: tenant_id, user_id, entity_type, entity_id, occurred_at
```

### 4.16 sys_notifications
```sql
id              UUID          PK
tenant_id       UUID          NOT NULL FK → core_tenants
user_id         UUID          NOT NULL FK → core_users
type            VARCHAR(100)  NOT NULL                    -- "leave.approved", "invoice.paid"
title           VARCHAR(255)  NOT NULL
body            TEXT          NULL
data            JSONB         NULL                        -- link, entity_id, etc.
channel         VARCHAR(50)   NOT NULL DEFAULT 'in_app'  -- in_app|email|push|sms
read_at         TIMESTAMPTZ   NULL
sent_at         TIMESTAMPTZ   NULL
failed_at       TIMESTAMPTZ   NULL
-- + standard 8 columns
```

### 4.17 sys_settings
```sql
id              UUID          PK
tenant_id       UUID          NOT NULL FK → core_tenants
company_id      UUID          NULL FK → core_companies    -- NULL = tenant-wide
module          VARCHAR(100)  NOT NULL                    -- "hr", "finance", "system"
key             VARCHAR(255)  NOT NULL
value           JSONB         NOT NULL
data_type       VARCHAR(50)   NOT NULL DEFAULT 'string'  -- string|number|boolean|json|array
description     TEXT          NULL
-- + standard 8 columns

UNIQUE(tenant_id, company_id, module, key)
```

### 4.18 sys_branding
```sql
id              UUID          PK
tenant_id       UUID          NOT NULL FK → core_tenants
company_id      UUID          NULL FK → core_companies
logo_url        VARCHAR(500)  NULL
favicon_url     VARCHAR(500)  NULL
app_name        VARCHAR(255)  NULL                        -- white-label app name
primary_color   VARCHAR(20)   NULL DEFAULT '#6366f1'
secondary_color VARCHAR(20)   NULL DEFAULT '#8b5cf6'
accent_color    VARCHAR(20)   NULL DEFAULT '#ec4899'
font_family     VARCHAR(100)  NULL DEFAULT 'Inter'
theme           VARCHAR(50)   NULL DEFAULT 'light'       -- light|dark|corporate|glassmorphism
custom_css      TEXT          NULL
custom_domain   VARCHAR(255)  NULL
-- + standard 8 columns

UNIQUE(tenant_id, company_id)
```

### 4.19 sys_jobs (Background Job Queue Metadata)
```sql
id              UUID          PK
tenant_id       UUID          NOT NULL FK → core_tenants
queue           VARCHAR(100)  NOT NULL                    -- payroll, reports, ai, ocr
type            VARCHAR(100)  NOT NULL                    -- "payroll.run", "report.generate"
payload         JSONB         NOT NULL DEFAULT '{}'
status          VARCHAR(50)   NOT NULL DEFAULT 'pending'  -- pending|processing|completed|failed|cancelled
attempts        INT           NOT NULL DEFAULT 0
max_attempts    INT           NOT NULL DEFAULT 3
scheduled_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
started_at      TIMESTAMPTZ   NULL
completed_at    TIMESTAMPTZ   NULL
failed_at       TIMESTAMPTZ   NULL
error           TEXT          NULL
result          JSONB         NULL
triggered_by    UUID          NULL FK → core_users
-- + standard 8 columns
```

### 4.20 sys_feature_flags
```sql
id              UUID          PK
tenant_id       UUID          NOT NULL FK → core_tenants
module          VARCHAR(100)  NOT NULL
feature         VARCHAR(100)  NOT NULL
enabled         BOOLEAN       NOT NULL DEFAULT false
rollout_pct     INT           NOT NULL DEFAULT 100        -- gradual rollout 0–100%
config          JSONB         NOT NULL DEFAULT '{}'
-- + standard 8 columns

UNIQUE(tenant_id, module, feature)
```

---

## 5. HR Module Schema (Phase 1)

### Key Tables

```sql
hr_employees          -- core employee record
hr_emergency_contacts -- emergency contact info
hr_employment_history -- position history within the company
hr_attendance_logs    -- daily clock in/out records
hr_attendance_configs -- work schedule definitions
hr_leave_types        -- leave categories (annual, sick, etc.)
hr_leave_balances     -- per employee per leave type balance
hr_leave_requests     -- leave applications
hr_payroll_periods    -- pay period definitions
hr_payroll_runs       -- executed payroll runs
hr_payroll_items      -- line items per employee per run
hr_salary_structures  -- salary component templates
hr_salary_components  -- individual salary components (basic, allowances, deductions)
hr_overtime_records   -- overtime logs
hr_shifts             -- shift definitions
hr_shift_assignments  -- employee-to-shift assignments
hr_departments_budget -- headcount and budget per department
hr_job_positions      -- job position catalog
hr_recruitment_jobs   -- open job postings
hr_recruitment_apps   -- applications per job
hr_training_programs  -- training catalog
hr_training_enrollments -- employee training participation
hr_performance_cycles -- review period definitions
hr_performance_reviews -- individual review records
hr_performance_goals  -- goal setting per employee
hr_disciplinary_cases -- disciplinary action records
hr_rewards            -- reward/recognition records
hr_documents          -- HR-specific documents per employee
```

---

## 6. CRM Module Schema (Phase 3)

### Key Tables

```sql
crm_leads             -- inbound leads
crm_contacts          -- individual people
crm_companies         -- business accounts
crm_opportunities     -- deals in the pipeline
crm_pipeline_stages   -- configurable pipeline stages
crm_activities        -- calls, emails, meetings, notes
crm_contracts         -- signed agreements
crm_email_logs        -- email tracking records
```

---

## 7. Project Management Schema (Phase 2)

### Key Tables

```sql
proj_projects         -- project records
proj_milestones       -- project milestones
proj_tasks            -- tasks
proj_subtasks         -- subtasks (self-ref on proj_tasks or separate table)
proj_task_assignments -- user-to-task assignments
proj_time_logs        -- time tracking entries
proj_comments         -- task/project comments
proj_attachments      -- files attached to tasks/projects
proj_sprints          -- sprint definitions
proj_labels           -- tags/labels for tasks
proj_columns          -- Kanban column definitions
```

---

## 8. Sales Module Schema (Phase 4)

### Key Tables

```sql
sales_quotes          -- quotations
sales_quote_items     -- line items on quotes
sales_orders          -- confirmed sales orders
sales_order_items     -- line items on orders
sales_invoices        -- invoices
sales_invoice_items   -- invoice line items
sales_payments        -- payment records
sales_subscriptions   -- recurring subscription records
sales_subscription_items -- subscription line items
sales_price_lists     -- configurable price books
sales_discounts       -- discount rules
```

---

## 9. Inventory Module Schema (Phase 5)

### Key Tables

```sql
inv_products          -- product catalog
inv_product_variants  -- SKU variants (size, color, etc.)
inv_categories        -- product categories (tree)
inv_warehouses        -- warehouse definitions
inv_warehouse_locations -- bin/shelf/zone within warehouse
inv_stock             -- current stock per product per warehouse
inv_stock_movements   -- every stock change (in/out/transfer/adjust)
inv_barcodes          -- barcode/QR assignments
inv_batches           -- batch/lot tracking
inv_expiry_records    -- expiry date tracking
inv_reorder_rules     -- smart reordering configuration
inv_units_of_measure  -- UoM catalog (kg, pcs, box, etc.)
```

---

## 10. Procurement Module Schema (Phase 6)

### Key Tables

```sql
proc_suppliers        -- supplier master
proc_supplier_contacts -- supplier contact persons
proc_purchase_requests -- internal purchase requisitions
proc_purchase_orders  -- purchase orders sent to suppliers
proc_po_items         -- PO line items
proc_receiving_notes  -- goods received notes
proc_receiving_items  -- received line items
proc_supplier_evaluations -- vendor performance scores
```

---

## 11. Finance Module Schema (Phase 7)

### Key Tables

```sql
fin_accounts          -- chart of accounts
fin_journal_entries   -- accounting journal entries
fin_journal_lines     -- debit/credit lines per entry
fin_cost_centers      -- cost center hierarchy
fin_budgets           -- budget periods
fin_budget_lines      -- budget per account per period
fin_tax_rates         -- tax configuration
fin_currencies        -- currency rates
fin_bank_accounts     -- company bank accounts
fin_bank_transactions -- bank transactions / reconciliation
fin_fiscal_years      -- fiscal year periods
```

---

## 12. Finance Module Schema (Phase 8 — Documents)

### Key Tables

```sql
doc_folders           -- folder hierarchy
doc_documents         -- document records
doc_versions          -- version history per document
doc_signatures        -- e-signature requests and records
doc_signature_parties -- signatories per document
doc_ocr_jobs          -- OCR processing jobs
doc_approvals         -- approval workflow instances
doc_approval_steps    -- steps in an approval chain
doc_approval_actions  -- individual approval/rejection actions
doc_tags              -- document tagging
```

---

## 13. AI Module Schema (Phase 10)

### Key Tables

```sql
ai_conversations      -- chat sessions with Reno Brain
ai_messages           -- individual messages in conversations
ai_agent_sessions     -- AI agent (CEO, HR, etc.) sessions
ai_predictions        -- stored prediction results
ai_embeddings         -- vector embeddings cache (for semantic search)
ai_prompt_templates   -- reusable prompts per module
ai_generated_items    -- AI-generated forms, workflows, dashboards
ai_feedback           -- thumbs up/down on AI responses
```

---

## 14. System-Wide Tables

```sql
sys_audit_logs        -- immutable audit trail (see 4.15)
sys_notifications     -- in-app and push notifications (see 4.16)
sys_settings          -- tenant/company settings KV store (see 4.17)
sys_branding          -- white-label branding config (see 4.18)
sys_jobs              -- background job queue (see 4.19)
sys_feature_flags     -- feature flag control (see 4.20)
sys_webhooks          -- outbound webhook configurations
sys_webhook_deliveries -- delivery log per webhook
sys_integrations      -- third-party integration configs
sys_api_keys          -- API key management for external integrations
sys_error_logs        -- application error tracking
sys_rate_limits       -- configurable rate limit rules
```

---

## 15. Indexing Strategy

### Standard Indexes (Applied to Every Table)

```sql
-- These are created by convention on every table:
INDEX ON (tenant_id)
INDEX ON (tenant_id, deleted_at)
INDEX ON (created_at)
INDEX ON (is_active)
```

### Module-Specific Indexes

Applied where queries are expected at high frequency:

```sql
-- Users
INDEX ON core_users (tenant_id, email)
INDEX ON core_users (tenant_id, status)

-- Audit Logs
INDEX ON sys_audit_logs (tenant_id, entity_type, entity_id)
INDEX ON sys_audit_logs (tenant_id, user_id)
INDEX ON sys_audit_logs (tenant_id, occurred_at DESC)

-- HR
INDEX ON hr_employees (tenant_id, status)
INDEX ON hr_employees (tenant_id, department_id)
INDEX ON hr_attendance_logs (tenant_id, employee_id, check_in_date)

-- CRM
INDEX ON crm_leads (tenant_id, status, assigned_to)
INDEX ON crm_opportunities (tenant_id, stage_id, close_date)

-- Inventory
INDEX ON inv_stock (tenant_id, product_id, warehouse_id)
INDEX ON inv_stock_movements (tenant_id, product_id, created_at)

-- Finance
INDEX ON fin_journal_entries (tenant_id, fiscal_year, period)
INDEX ON fin_journal_lines (tenant_id, account_id)
```

---

## 16. Row Level Security Policy

Applied to every table (defense-in-depth, in addition to application-layer filtering):

```sql
-- Template applied to all tables:
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_{table_name}_tenant ON {table_name}
  FOR ALL
  TO reno_app_role
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

The application sets the tenant context at the start of every transaction:

```sql
SET LOCAL app.current_tenant_id = '{tenant_id}';
```

---

## 17. Migration Policy

| Rule | Detail |
|---|---|
| Tool | Prisma Migrate |
| Naming | `YYYYMMDDHHMMSS_descriptive_action` |
| Immutability | Never edit an existing migration file |
| Down migrations | Every up migration must have a documented down migration |
| Zero-downtime | All schema changes must be backward-compatible during deploy |
| Seed data | Separate seed files per module (`seed.hr.ts`, `seed.crm.ts`) |
| Demo data | Separate demo-data generator for onboarding new tenants |

---

## 18. Prisma Schema Organization

```
packages/database/
├── schema/
│   ├── core.prisma          -- core_* tables
│   ├── hr.prisma            -- hr_* tables
│   ├── crm.prisma           -- crm_* tables
│   ├── projects.prisma      -- proj_* tables
│   ├── sales.prisma         -- sales_* tables
│   ├── procurement.prisma   -- proc_* tables
│   ├── inventory.prisma     -- inv_* tables
│   ├── finance.prisma       -- fin_* tables
│   ├── documents.prisma     -- doc_* tables
│   ├── assets.prisma        -- asset_* tables
│   ├── service.prisma       -- svc_* tables
│   ├── communication.prisma -- comm_* tables
│   ├── ai.prisma            -- ai_* tables
│   └── system.prisma        -- sys_* tables
├── migrations/              -- migration files
├── seed/                    -- seed scripts per module
└── client.ts                -- Prisma client factory (with tenant scoping)
```

---

**AWAITING OWNER APPROVAL BEFORE PROCEEDING TO DOCUMENT 3**
