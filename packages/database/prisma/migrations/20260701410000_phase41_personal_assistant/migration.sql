-- Phase 41: AI Personal Working Assistant
-- Personal profile, memory, daily briefing, habit learning, weekly review.

CREATE TABLE "apa_profiles" (
  "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        UUID         NOT NULL,
  "user_id"          UUID         NOT NULL,
  "display_name"     VARCHAR(255),
  "timezone"         VARCHAR(50)  NOT NULL DEFAULT 'UTC',
  "work_start_hour"  INTEGER      NOT NULL DEFAULT 9,
  "work_end_hour"    INTEGER      NOT NULL DEFAULT 18,
  "reporting_style"  VARCHAR(30)  NOT NULL DEFAULT 'brief',
  "focus_areas"      TEXT[]       NOT NULL DEFAULT '{}',
  "preferred_modules" TEXT[]      NOT NULL DEFAULT '{}',
  "coaching_enabled" BOOLEAN      NOT NULL DEFAULT true,
  "team_coach_enabled" BOOLEAN    NOT NULL DEFAULT false,
  "weekly_review_day" INTEGER     NOT NULL DEFAULT 5,
  "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "apa_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "apa_profiles_tenant_fk" FOREIGN KEY ("tenant_id")
    REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "apa_profiles_unique" UNIQUE ("tenant_id", "user_id")
);
CREATE INDEX "apa_profiles_tenant_idx" ON "apa_profiles"("tenant_id");

CREATE TABLE "apa_memories" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  UUID         NOT NULL,
  "user_id"    UUID         NOT NULL,
  "category"   VARCHAR(50)  NOT NULL,
  "key"        VARCHAR(255) NOT NULL,
  "value"      JSONB        NOT NULL,
  "confidence" FLOAT        NOT NULL DEFAULT 1.0,
  "learned_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "apa_memories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "apa_memories_tenant_fk" FOREIGN KEY ("tenant_id")
    REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "apa_memories_unique" UNIQUE ("tenant_id", "user_id", "category", "key")
);
CREATE INDEX "apa_memories_tenant_idx" ON "apa_memories"("tenant_id");
CREATE INDEX "apa_memories_user_idx" ON "apa_memories"("tenant_id", "user_id");

CREATE TABLE "apa_daily_briefings" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  UUID         NOT NULL,
  "user_id"    UUID         NOT NULL,
  "date"       VARCHAR(10)  NOT NULL,
  "greeting"   TEXT         NOT NULL,
  "focus_item" VARCHAR(500),
  "summary"    JSONB        NOT NULL,
  "ai_plan"    JSONB,
  "viewed"     BOOLEAN      NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "apa_daily_briefings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "apa_daily_briefings_tenant_fk" FOREIGN KEY ("tenant_id")
    REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "apa_daily_briefings_unique" UNIQUE ("tenant_id", "user_id", "date")
);
CREATE INDEX "apa_daily_briefings_tenant_idx" ON "apa_daily_briefings"("tenant_id");

CREATE TABLE "apa_habits" (
  "id"            UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID         NOT NULL,
  "user_id"       UUID         NOT NULL,
  "name"          VARCHAR(255) NOT NULL,
  "description"   TEXT,
  "trigger"       VARCHAR(50)  NOT NULL,
  "trigger_value" VARCHAR(100),
  "module"        VARCHAR(50),
  "action"        VARCHAR(500) NOT NULL,
  "active"        BOOLEAN      NOT NULL DEFAULT true,
  "trigger_count" INTEGER      NOT NULL DEFAULT 0,
  "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "apa_habits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "apa_habits_tenant_fk" FOREIGN KEY ("tenant_id")
    REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "apa_habits_tenant_idx" ON "apa_habits"("tenant_id");
CREATE INDEX "apa_habits_user_idx" ON "apa_habits"("tenant_id", "user_id");

CREATE TABLE "apa_weekly_reviews" (
  "id"                 UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"          UUID         NOT NULL,
  "user_id"            UUID         NOT NULL,
  "week_start"         VARCHAR(10)  NOT NULL,
  "week_end"           VARCHAR(10)  NOT NULL,
  "accomplished"       JSONB        NOT NULL,
  "delayed"            JSONB        NOT NULL,
  "improvements"       JSONB        NOT NULL,
  "highlights"         TEXT[]       NOT NULL DEFAULT '{}',
  "next_week_focus"    TEXT,
  "productivity_score" INTEGER,
  "created_at"         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "apa_weekly_reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "apa_weekly_reviews_tenant_fk" FOREIGN KEY ("tenant_id")
    REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "apa_weekly_reviews_unique" UNIQUE ("tenant_id", "user_id", "week_start")
);
CREATE INDEX "apa_weekly_reviews_tenant_idx" ON "apa_weekly_reviews"("tenant_id");
