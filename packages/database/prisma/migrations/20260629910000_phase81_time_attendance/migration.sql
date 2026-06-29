-- Phase 81: Time & Attendance
CREATE TABLE IF NOT EXISTS "att_shifts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "start_time" VARCHAR(5) NOT NULL,
  "end_time" VARCHAR(5) NOT NULL,
  "break_mins" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "att_shifts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "att_shifts_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "att_shifts_tenant_id_idx" ON "att_shifts"("tenant_id");

CREATE TABLE IF NOT EXISTS "att_timesheets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "shift_id" UUID,
  "period_start" DATE NOT NULL,
  "period_end" DATE NOT NULL,
  "total_hours" DECIMAL(8,2) NOT NULL DEFAULT 0,
  "overtime_hrs" DECIMAL(8,2) NOT NULL DEFAULT 0,
  "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
  "approved_by" UUID,
  "approved_at" TIMESTAMPTZ,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "att_timesheets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "att_timesheets_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "att_timesheets_shift_fkey" FOREIGN KEY ("shift_id") REFERENCES "att_shifts"("id")
);
CREATE INDEX IF NOT EXISTS "att_timesheets_tenant_id_idx" ON "att_timesheets"("tenant_id");
CREATE INDEX IF NOT EXISTS "att_timesheets_employee_idx" ON "att_timesheets"("tenant_id", "employee_id");

CREATE TABLE IF NOT EXISTS "att_clock_entries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "timesheet_id" UUID NOT NULL,
  "clock_in" TIMESTAMPTZ NOT NULL,
  "clock_out" TIMESTAMPTZ,
  "break_start" TIMESTAMPTZ,
  "break_end" TIMESTAMPTZ,
  "location" VARCHAR(200),
  "note" VARCHAR(500),
  CONSTRAINT "att_clock_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "att_clock_entries_timesheet_fkey" FOREIGN KEY ("timesheet_id") REFERENCES "att_timesheets"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "att_clock_entries_timesheet_idx" ON "att_clock_entries"("timesheet_id");