-- Phase 45: AI Enterprise Strategy Orchestrator

CREATE TABLE "aso_initiatives" (
  "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        UUID         NOT NULL,
  "user_id"          UUID         NOT NULL,
  "title"            VARCHAR(500) NOT NULL,
  "description"      TEXT,
  "type"             VARCHAR(50)  NOT NULL,
  "department"       VARCHAR(50)  NOT NULL,
  "status"           VARCHAR(20)  NOT NULL DEFAULT 'draft',
  "priority"         VARCHAR(20)  NOT NULL DEFAULT 'medium',
  "estimated_budget" FLOAT,
  "estimated_roi"    FLOAT,
  "risk_score"       FLOAT,
  "urgency_score"    FLOAT,
  "strategic_score"  FLOAT,
  "portfolio_score"  FLOAT,
  "linked_goal_ids"  TEXT[]       NOT NULL DEFAULT '{}',
  "linked_signal_ids" TEXT[]      NOT NULL DEFAULT '{}',
  "time_horizon"     VARCHAR(10)  NOT NULL DEFAULT '90d',
  "start_date"       TIMESTAMPTZ,
  "end_date"         TIMESTAMPTZ,
  "ai_plan"          JSONB,
  "kpi_cascade"      JSONB,
  "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "aso_initiatives_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "aso_initiatives_tenant_fk" FOREIGN KEY ("tenant_id")
    REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "aso_initiatives_tenant_idx"     ON "aso_initiatives"("tenant_id");
CREATE INDEX "aso_initiatives_status_idx"     ON "aso_initiatives"("tenant_id","status");
CREATE INDEX "aso_initiatives_department_idx" ON "aso_initiatives"("tenant_id","department");

CREATE TABLE "aso_portfolio_items" (
  "id"             UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"      UUID        NOT NULL,
  "initiative_id"  UUID        NOT NULL,
  "rank"           INT         NOT NULL,
  "roi_score"      FLOAT       NOT NULL DEFAULT 0,
  "risk_score"     FLOAT       NOT NULL DEFAULT 0,
  "urgency_score"  FLOAT       NOT NULL DEFAULT 0,
  "strategic_score" FLOAT      NOT NULL DEFAULT 0,
  "total_score"    FLOAT       NOT NULL DEFAULT 0,
  "rationale"      TEXT,
  "scored_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "aso_portfolio_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "aso_portfolio_items_tenant_fk" FOREIGN KEY ("tenant_id")
    REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "aso_portfolio_items_initiative_fk" FOREIGN KEY ("initiative_id")
    REFERENCES "aso_initiatives"("id") ON DELETE CASCADE
);
CREATE INDEX "aso_portfolio_items_tenant_idx" ON "aso_portfolio_items"("tenant_id");
CREATE INDEX "aso_portfolio_items_rank_idx"   ON "aso_portfolio_items"("tenant_id","rank");

CREATE TABLE "aso_conflicts" (
  "id"               UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        UUID        NOT NULL,
  "initiative_a_id"  UUID        NOT NULL,
  "initiative_b_id"  UUID        NOT NULL,
  "type"             VARCHAR(50) NOT NULL,
  "description"      TEXT        NOT NULL,
  "severity"         VARCHAR(20) NOT NULL,
  "resolution"       TEXT,
  "resolved"         BOOLEAN     NOT NULL DEFAULT FALSE,
  "resolved_at"      TIMESTAMPTZ,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "aso_conflicts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "aso_conflicts_tenant_fk" FOREIGN KEY ("tenant_id")
    REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "aso_conflicts_a_fk" FOREIGN KEY ("initiative_a_id")
    REFERENCES "aso_initiatives"("id") ON DELETE CASCADE,
  CONSTRAINT "aso_conflicts_b_fk" FOREIGN KEY ("initiative_b_id")
    REFERENCES "aso_initiatives"("id") ON DELETE CASCADE
);
CREATE INDEX "aso_conflicts_tenant_idx"   ON "aso_conflicts"("tenant_id");
CREATE INDEX "aso_conflicts_resolved_idx" ON "aso_conflicts"("tenant_id","resolved");

CREATE TABLE "aso_strategy_reviews" (
  "id"                UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"         UUID        NOT NULL,
  "user_id"           UUID        NOT NULL,
  "week_of"           TIMESTAMPTZ NOT NULL,
  "summary"           TEXT        NOT NULL,
  "on_track_count"    INT         NOT NULL DEFAULT 0,
  "at_risk_count"     INT         NOT NULL DEFAULT 0,
  "completed_count"   INT         NOT NULL DEFAULT 0,
  "recommendations"   JSONB       NOT NULL DEFAULT '[]',
  "initiative_updates" JSONB      NOT NULL DEFAULT '[]',
  "generated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "aso_strategy_reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "aso_strategy_reviews_tenant_fk" FOREIGN KEY ("tenant_id")
    REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "aso_strategy_reviews_tenant_idx" ON "aso_strategy_reviews"("tenant_id");
CREATE INDEX "aso_strategy_reviews_week_idx"   ON "aso_strategy_reviews"("tenant_id","week_of");