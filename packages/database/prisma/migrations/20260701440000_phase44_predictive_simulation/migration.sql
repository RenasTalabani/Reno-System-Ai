-- Phase 44: AI Predictive Simulation Engine

CREATE TABLE "aps_scenarios" (
  "id"                  UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"           UUID         NOT NULL,
  "user_id"             UUID         NOT NULL,
  "name"                VARCHAR(255) NOT NULL,
  "description"         TEXT,
  "type"                VARCHAR(50)  NOT NULL,
  "parameters"          JSONB        NOT NULL DEFAULT '{}',
  "baseline_revenue"    FLOAT        NOT NULL DEFAULT 0,
  "baseline_cost"       FLOAT        NOT NULL DEFAULT 0,
  "baseline_headcount"  INT          NOT NULL DEFAULT 0,
  "time_horizon"        INT          NOT NULL DEFAULT 12,
  "status"              VARCHAR(20)  NOT NULL DEFAULT 'draft',
  "created_at"          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "aps_scenarios_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "aps_scenarios_tenant_fk" FOREIGN KEY ("tenant_id")
    REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "aps_scenarios_tenant_idx" ON "aps_scenarios"("tenant_id");
CREATE INDEX "aps_scenarios_type_idx"   ON "aps_scenarios"("tenant_id","type");

CREATE TABLE "aps_simulations" (
  "id"                   UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"            UUID        NOT NULL,
  "scenario_id"          UUID        NOT NULL,
  "iterations"           INT         NOT NULL DEFAULT 1000,
  "base_outcome"         JSONB       NOT NULL DEFAULT '{}',
  "pessimistic_outcome"  JSONB       NOT NULL DEFAULT '{}',
  "optimistic_outcome"   JSONB       NOT NULL DEFAULT '{}',
  "monte_carlo_p10"      JSONB,
  "monte_carlo_p50"      JSONB,
  "monte_carlo_p90"      JSONB,
  "success_rate"         FLOAT,
  "sensitivity_data"     JSONB,
  "risks"                JSONB,
  "opportunities"        JSONB,
  "recommendation"       TEXT,
  "executive_summary"    TEXT,
  "break_even_months"    INT,
  "ran_at"               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "aps_simulations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "aps_simulations_tenant_fk" FOREIGN KEY ("tenant_id")
    REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "aps_simulations_scenario_fk" FOREIGN KEY ("scenario_id")
    REFERENCES "aps_scenarios"("id") ON DELETE CASCADE
);
CREATE INDEX "aps_simulations_tenant_idx"   ON "aps_simulations"("tenant_id");
CREATE INDEX "aps_simulations_scenario_idx" ON "aps_simulations"("scenario_id");

CREATE TABLE "aps_comparisons" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  UUID         NOT NULL,
  "user_id"    UUID         NOT NULL,
  "name"       VARCHAR(255) NOT NULL,
  "result"     JSONB,
  "created_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "aps_comparisons_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "aps_comparisons_tenant_fk" FOREIGN KEY ("tenant_id")
    REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "aps_comparisons_tenant_idx" ON "aps_comparisons"("tenant_id");

CREATE TABLE "aps_comparison_items" (
  "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
  "comparison_id" UUID NOT NULL,
  "scenario_id"   UUID NOT NULL,
  "rank"          INT,
  "notes"         TEXT,
  CONSTRAINT "aps_comparison_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "aps_comparison_items_cmp_fk" FOREIGN KEY ("comparison_id")
    REFERENCES "aps_comparisons"("id") ON DELETE CASCADE,
  CONSTRAINT "aps_comparison_items_scn_fk" FOREIGN KEY ("scenario_id")
    REFERENCES "aps_scenarios"("id") ON DELETE CASCADE
);