-- Phase 42: AI Life & Business Goals Engine

CREATE TABLE "age_goals" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID         NOT NULL,
  "user_id"     UUID         NOT NULL,
  "parent_id"   UUID,
  "title"       VARCHAR(500) NOT NULL,
  "description" TEXT,
  "type"        VARCHAR(50)  NOT NULL,
  "category"    VARCHAR(50)  NOT NULL,
  "target_date" TIMESTAMPTZ,
  "status"      VARCHAR(30)  NOT NULL DEFAULT 'active',
  "progress"    FLOAT        NOT NULL DEFAULT 0,
  "priority"    VARCHAR(20)  NOT NULL DEFAULT 'medium',
  "success_prob" FLOAT,
  "ai_insight"  TEXT,
  "risks"       JSONB,
  "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "age_goals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "age_goals_tenant_fk" FOREIGN KEY ("tenant_id")
    REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "age_goals_parent_fk" FOREIGN KEY ("parent_id")
    REFERENCES "age_goals"("id") ON DELETE SET NULL
);
CREATE INDEX "age_goals_tenant_idx" ON "age_goals"("tenant_id");
CREATE INDEX "age_goals_user_idx" ON "age_goals"("tenant_id", "user_id");
CREATE INDEX "age_goals_status_idx" ON "age_goals"("tenant_id", "status");

CREATE TABLE "age_kpis" (
  "id"        UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID         NOT NULL,
  "goal_id"   UUID         NOT NULL,
  "name"      VARCHAR(255) NOT NULL,
  "unit"      VARCHAR(50)  NOT NULL,
  "baseline"  FLOAT        NOT NULL DEFAULT 0,
  "target"    FLOAT        NOT NULL,
  "current"   FLOAT        NOT NULL DEFAULT 0,
  "frequency" VARCHAR(20)  NOT NULL DEFAULT 'weekly',
  "trend"     VARCHAR(20)  NOT NULL DEFAULT 'stable',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "age_kpis_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "age_kpis_tenant_fk" FOREIGN KEY ("tenant_id")
    REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "age_kpis_goal_fk" FOREIGN KEY ("goal_id")
    REFERENCES "age_goals"("id") ON DELETE CASCADE
);
CREATE INDEX "age_kpis_tenant_idx" ON "age_kpis"("tenant_id");
CREATE INDEX "age_kpis_goal_idx" ON "age_kpis"("goal_id");

CREATE TABLE "age_milestones" (
  "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID         NOT NULL,
  "goal_id"      UUID         NOT NULL,
  "title"        VARCHAR(500) NOT NULL,
  "due_date"     TIMESTAMPTZ,
  "status"       VARCHAR(20)  NOT NULL DEFAULT 'pending',
  "completed_at" TIMESTAMPTZ,
  "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "age_milestones_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "age_milestones_tenant_fk" FOREIGN KEY ("tenant_id")
    REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "age_milestones_goal_fk" FOREIGN KEY ("goal_id")
    REFERENCES "age_goals"("id") ON DELETE CASCADE
);
CREATE INDEX "age_milestones_tenant_idx" ON "age_milestones"("tenant_id");
CREATE INDEX "age_milestones_goal_idx" ON "age_milestones"("goal_id");

CREATE TABLE "age_roadmaps" (
  "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID         NOT NULL,
  "user_id"      UUID         NOT NULL,
  "title"        VARCHAR(255) NOT NULL,
  "horizon"      VARCHAR(20)  NOT NULL,
  "plan"         JSONB        NOT NULL,
  "generated_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "age_roadmaps_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "age_roadmaps_tenant_fk" FOREIGN KEY ("tenant_id")
    REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "age_roadmaps_tenant_idx" ON "age_roadmaps"("tenant_id");
CREATE INDEX "age_roadmaps_horizon_idx" ON "age_roadmaps"("tenant_id", "horizon");
