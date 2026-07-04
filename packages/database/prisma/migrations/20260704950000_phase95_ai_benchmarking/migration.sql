-- Phase 95: AI Benchmarking

CREATE TABLE "bn_suites" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "category" VARCHAR(30) NOT NULL DEFAULT 'quality',
  "description" TEXT,
  "metric_type" VARCHAR(30) NOT NULL DEFAULT 'accuracy',
  "higher_is_better" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "bn_suites_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "bn_suites_tenant_id_idx" ON "bn_suites"("tenant_id");
ALTER TABLE "bn_suites" ADD CONSTRAINT "bn_suites_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "bn_cases" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "suite_id" UUID NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "input" JSONB NOT NULL,
  "expected" JSONB,
  "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "bn_cases_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "bn_cases_tenant_id_suite_id_idx" ON "bn_cases"("tenant_id","suite_id");
ALTER TABLE "bn_cases" ADD CONSTRAINT "bn_cases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "bn_cases" ADD CONSTRAINT "bn_cases_suite_id_fkey" FOREIGN KEY ("suite_id") REFERENCES "bn_suites"("id") ON DELETE CASCADE;

CREATE TABLE "bn_runs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "suite_id" UUID NOT NULL,
  "model_ref" VARCHAR(100) NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'running',
  "score" DOUBLE PRECISION,
  "pass_rate" DOUBLE PRECISION,
  "latency_ms_avg" INTEGER,
  "total_cases" INTEGER NOT NULL DEFAULT 0,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "finished_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "bn_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "bn_runs_tenant_id_suite_id_model_ref_idx" ON "bn_runs"("tenant_id","suite_id","model_ref");
ALTER TABLE "bn_runs" ADD CONSTRAINT "bn_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "bn_runs" ADD CONSTRAINT "bn_runs_suite_id_fkey" FOREIGN KEY ("suite_id") REFERENCES "bn_suites"("id") ON DELETE CASCADE;

CREATE TABLE "bn_results" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "run_id" UUID NOT NULL,
  "case_id" UUID NOT NULL,
  "passed" BOOLEAN NOT NULL DEFAULT false,
  "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "latency_ms" INTEGER NOT NULL DEFAULT 0,
  "output" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "bn_results_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "bn_results_tenant_id_run_id_idx" ON "bn_results"("tenant_id","run_id");
ALTER TABLE "bn_results" ADD CONSTRAINT "bn_results_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "bn_results" ADD CONSTRAINT "bn_results_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "bn_runs"("id") ON DELETE CASCADE;
ALTER TABLE "bn_results" ADD CONSTRAINT "bn_results_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "bn_cases"("id") ON DELETE CASCADE;

CREATE TABLE "bn_baselines" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "suite_id" UUID NOT NULL,
  "model_ref" VARCHAR(100) NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "pass_rate" DOUBLE PRECISION NOT NULL,
  "set_by" VARCHAR(100),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "bn_baselines_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "bn_baselines_tenant_id_suite_id_model_ref_key" ON "bn_baselines"("tenant_id","suite_id","model_ref");
CREATE INDEX "bn_baselines_tenant_id_suite_id_idx" ON "bn_baselines"("tenant_id","suite_id");
ALTER TABLE "bn_baselines" ADD CONSTRAINT "bn_baselines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "bn_baselines" ADD CONSTRAINT "bn_baselines_suite_id_fkey" FOREIGN KEY ("suite_id") REFERENCES "bn_suites"("id") ON DELETE CASCADE;

CREATE TABLE "bn_regressions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "run_id" UUID NOT NULL,
  "suite_ref" VARCHAR(100) NOT NULL,
  "baseline_score" DOUBLE PRECISION NOT NULL,
  "current_score" DOUBLE PRECISION NOT NULL,
  "delta_pct" DOUBLE PRECISION NOT NULL,
  "severity" VARCHAR(20) NOT NULL DEFAULT 'minor',
  "acknowledged" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "bn_regressions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "bn_regressions_tenant_id_idx" ON "bn_regressions"("tenant_id");
ALTER TABLE "bn_regressions" ADD CONSTRAINT "bn_regressions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "bn_regressions" ADD CONSTRAINT "bn_regressions_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "bn_runs"("id") ON DELETE CASCADE;