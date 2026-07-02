CREATE TABLE "opi_processes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "department" TEXT,
  "owner" TEXT,
  "cycle_days" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "automation_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "error_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "throughput" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ai_efficiency_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ai_maturity_level" TEXT NOT NULL DEFAULT 'manual',
  "ai_recommendations" JSONB NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'active',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "opi_processes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "opi_processes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "opi_processes_tenant_id_idx" ON "opi_processes"("tenant_id");

CREATE TABLE "opi_bottlenecks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "process_id" UUID NOT NULL,
  "step" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'medium',
  "impact" TEXT,
  "ai_root_cause" TEXT,
  "ai_solution" TEXT,
  "resolved" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "opi_bottlenecks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "opi_bottlenecks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "opi_bottlenecks_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "opi_processes"("id") ON DELETE CASCADE
);
CREATE INDEX "opi_bottlenecks_tenant_id_idx" ON "opi_bottlenecks"("tenant_id");

CREATE TABLE "opi_kpis" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "kpi_code" TEXT NOT NULL,
  "kpi_name" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "actual" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "target" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ai_predicted" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "trend" TEXT NOT NULL DEFAULT 'stable',
  "ai_summary" TEXT,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "opi_kpis_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "opi_kpis_tenant_kpi_period_key" UNIQUE ("tenant_id", "kpi_code", "period"),
  CONSTRAINT "opi_kpis_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "opi_kpis_tenant_id_idx" ON "opi_kpis"("tenant_id");

CREATE TABLE "opi_efficiency_insights" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "savings_est" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "action_items" JSONB NOT NULL DEFAULT '[]',
  "generated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "opi_efficiency_insights_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "opi_efficiency_insights_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "opi_efficiency_insights_tenant_id_idx" ON "opi_efficiency_insights"("tenant_id");