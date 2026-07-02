-- Phase 59: AI HR Intelligence & Workforce Analytics

CREATE TABLE "public"."hri_employees" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "employee_id" TEXT,
  "full_name" TEXT NOT NULL,
  "email" TEXT,
  "department" TEXT,
  "role" TEXT,
  "level" TEXT NOT NULL DEFAULT 'mid',
  "hire_date" TIMESTAMPTZ,
  "salary" DOUBLE PRECISION,
  "location" TEXT,
  "manager_id" UUID,
  "status" TEXT NOT NULL DEFAULT 'active',
  "ai_profile_score" INTEGER,
  "retention_risk" TEXT,
  "potential_level" TEXT,
  "ai_insights" JSONB NOT NULL DEFAULT '[]',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "hri_employees_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "hri_employees_tenant_id_idx" ON "public"."hri_employees"("tenant_id");
ALTER TABLE "public"."hri_employees" ADD CONSTRAINT "hri_employees_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "public"."hri_performances" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "period" TEXT NOT NULL,
  "performance_score" INTEGER NOT NULL DEFAULT 70,
  "goals_score" INTEGER NOT NULL DEFAULT 70,
  "skills_score" INTEGER NOT NULL DEFAULT 70,
  "culture_score" INTEGER NOT NULL DEFAULT 70,
  "overall_rating" TEXT NOT NULL DEFAULT 'meets',
  "ai_prediction" TEXT,
  "manager_notes" TEXT,
  "reviewed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "hri_performances_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hri_performances_tenant_employee_period_key" UNIQUE ("tenant_id", "employee_id", "period")
);
CREATE INDEX "hri_performances_tenant_id_idx" ON "public"."hri_performances"("tenant_id");
ALTER TABLE "public"."hri_performances" ADD CONSTRAINT "hri_performances_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "public"."hri_performances" ADD CONSTRAINT "hri_performances_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "public"."hri_employees"("id") ON DELETE CASCADE;

CREATE TABLE "public"."hri_succession_plans" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "role_title" TEXT NOT NULL,
  "department" TEXT,
  "criticality" TEXT NOT NULL DEFAULT 'medium',
  "readiness_gap" INTEGER NOT NULL DEFAULT 0,
  "candidate_ids" JSONB NOT NULL DEFAULT '[]',
  "ai_recommended" JSONB NOT NULL DEFAULT '[]',
  "timeline" TEXT,
  "ai_summary" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "hri_succession_plans_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "hri_succession_plans_tenant_id_idx" ON "public"."hri_succession_plans"("tenant_id");
ALTER TABLE "public"."hri_succession_plans" ADD CONSTRAINT "hri_succession_plans_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "public"."hri_workforce_insights" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "data" JSONB NOT NULL DEFAULT '{}',
  "severity" TEXT NOT NULL DEFAULT 'info',
  "action_items" JSONB NOT NULL DEFAULT '[]',
  "generated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "hri_workforce_insights_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "hri_workforce_insights_tenant_id_idx" ON "public"."hri_workforce_insights"("tenant_id");
ALTER TABLE "public"."hri_workforce_insights" ADD CONSTRAINT "hri_workforce_insights_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."core_tenants"("id") ON DELETE CASCADE;