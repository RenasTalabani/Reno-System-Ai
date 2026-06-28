-- Phase 39: Reno HR Module — New tables only
-- Tables already exist from earlier phases:
--   hr_employees, hr_attendance, hr_leave_types, hr_leave_balances,
--   hr_leave_requests, hr_payslips, hr_payroll_grades, hr_documents,
--   hr_holidays, hr_job_positions, hr_shifts, hr_employee_positions
-- New tables added in Phase 39:
--   hr_departments, hr_job_titles, hr_payroll_runs

CREATE TABLE "hr_departments" (
  "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID        NOT NULL,
  "name"         VARCHAR(200) NOT NULL,
  "code"         VARCHAR(50),
  "parent_id"    UUID,
  "head_user_id" UUID,
  "is_active"    BOOLEAN     NOT NULL DEFAULT true,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "deleted_at"   TIMESTAMPTZ,
  CONSTRAINT "hr_departments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "hr_departments_tenant_id_code_key" ON "hr_departments"("tenant_id", "code") WHERE "code" IS NOT NULL;
CREATE INDEX "hr_departments_tenant_id_is_active_idx" ON "hr_departments"("tenant_id", "is_active");
ALTER TABLE "hr_departments" ADD CONSTRAINT "hr_departments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "hr_departments" ADD CONSTRAINT "hr_departments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "hr_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "hr_job_titles" (
  "id"        UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID        NOT NULL,
  "name"      VARCHAR(200) NOT NULL,
  "grade"     VARCHAR(50),
  "is_active" BOOLEAN     NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "hr_job_titles_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "hr_job_titles_tenant_id_idx" ON "hr_job_titles"("tenant_id");
ALTER TABLE "hr_job_titles" ADD CONSTRAINT "hr_job_titles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "hr_payroll_runs" (
  "id"                UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"         UUID        NOT NULL,
  "period"            VARCHAR(7)  NOT NULL,
  "status"            VARCHAR(30) NOT NULL DEFAULT 'draft',
  "total_gross"       DECIMAL(15,2) NOT NULL DEFAULT 0,
  "total_net"         DECIMAL(15,2) NOT NULL DEFAULT 0,
  "total_deductions"  DECIMAL(15,2) NOT NULL DEFAULT 0,
  "currency"          VARCHAR(10) NOT NULL DEFAULT 'USD',
  "processed_by"      UUID,
  "processed_at"      TIMESTAMPTZ,
  "notes"             TEXT,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "hr_payroll_runs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "hr_payroll_runs_tenant_period_key" ON "hr_payroll_runs"("tenant_id", "period");
CREATE INDEX "hr_payroll_runs_tenant_status_idx" ON "hr_payroll_runs"("tenant_id", "status");
ALTER TABLE "hr_payroll_runs" ADD CONSTRAINT "hr_payroll_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed default departments for demo tenant
INSERT INTO "hr_departments" ("tenant_id", "name", "code")
SELECT id, 'Engineering',    'ENG'   FROM core_tenants WHERE slug = 'demo'
UNION ALL
SELECT id, 'Human Resources','HR'    FROM core_tenants WHERE slug = 'demo'
UNION ALL
SELECT id, 'Sales',          'SALES' FROM core_tenants WHERE slug = 'demo'
UNION ALL
SELECT id, 'Finance',        'FIN'   FROM core_tenants WHERE slug = 'demo'
UNION ALL
SELECT id, 'Operations',     'OPS'   FROM core_tenants WHERE slug = 'demo';

-- Seed default job titles for demo tenant
INSERT INTO "hr_job_titles" ("tenant_id", "name", "grade")
SELECT id, 'Software Engineer',      'L3' FROM core_tenants WHERE slug = 'demo'
UNION ALL
SELECT id, 'Senior Engineer',        'L4' FROM core_tenants WHERE slug = 'demo'
UNION ALL
SELECT id, 'Engineering Manager',    'M1' FROM core_tenants WHERE slug = 'demo'
UNION ALL
SELECT id, 'HR Specialist',          'L3' FROM core_tenants WHERE slug = 'demo'
UNION ALL
SELECT id, 'Sales Executive',        'L3' FROM core_tenants WHERE slug = 'demo'
UNION ALL
SELECT id, 'Accountant',             'L3' FROM core_tenants WHERE slug = 'demo'
UNION ALL
SELECT id, 'Operations Manager',     'M1' FROM core_tenants WHERE slug = 'demo';
