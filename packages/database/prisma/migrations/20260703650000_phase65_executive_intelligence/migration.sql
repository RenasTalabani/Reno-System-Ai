CREATE TABLE "ei_strategic_goals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'growth',
  "owner" TEXT,
  "target_date" TIMESTAMPTZ,
  "target_value" DOUBLE PRECISION,
  "current_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'on_track',
  "ai_probability" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "ai_projected_date" TIMESTAMPTZ,
  "ai_insights" JSONB NOT NULL DEFAULT '[]',
  "key_results" JSONB NOT NULL DEFAULT '[]',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ei_strategic_goals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ei_strategic_goals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "ei_strategic_goals_tenant_id_idx" ON "ei_strategic_goals"("tenant_id");

CREATE TABLE "ei_board_metrics" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "metric_code" TEXT NOT NULL,
  "metric_name" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "actual" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "target" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "benchmark" DOUBLE PRECISION,
  "ai_predicted" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ai_trend" TEXT NOT NULL DEFAULT 'stable',
  "ai_comment" TEXT,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ei_board_metrics_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ei_board_metrics_tenant_metric_period_key" UNIQUE ("tenant_id", "metric_code", "period"),
  CONSTRAINT "ei_board_metrics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "ei_board_metrics_tenant_id_idx" ON "ei_board_metrics"("tenant_id");

CREATE TABLE "ei_executive_insights" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "urgency" TEXT NOT NULL DEFAULT 'medium',
  "impact" TEXT NOT NULL DEFAULT 'medium',
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
  "action_items" JSONB NOT NULL DEFAULT '[]',
  "data" JSONB NOT NULL DEFAULT '{}',
  "generated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ei_executive_insights_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ei_executive_insights_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "ei_executive_insights_tenant_id_idx" ON "ei_executive_insights"("tenant_id");

CREATE TABLE "ei_competitor_signals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "competitor" TEXT NOT NULL,
  "signal_type" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "impact" TEXT NOT NULL DEFAULT 'medium',
  "ai_response" TEXT,
  "source" TEXT,
  "signal_date" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ei_competitor_signals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ei_competitor_signals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "ei_competitor_signals_tenant_id_idx" ON "ei_competitor_signals"("tenant_id");