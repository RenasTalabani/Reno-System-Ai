-- Phase 29: AI Evolution / Business Memory / Learning Engine

-- Business Memory Engine
CREATE TABLE "ai_business_memories" (
  "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID NOT NULL,
  "memory_type" VARCHAR(50) NOT NULL,
  "entity_type" VARCHAR(50),
  "entity_id"   UUID,
  "entity_name" VARCHAR(255),
  "title"       VARCHAR(255) NOT NULL,
  "content"     TEXT NOT NULL,
  "evidence"    JSONB NOT NULL DEFAULT '[]',
  "importance"  DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "confidence"  DOUBLE PRECISION NOT NULL DEFAULT 0.8,
  "tags"        TEXT[] NOT NULL DEFAULT '{}',
  "learned_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "valid_until" TIMESTAMPTZ,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "is_active"   BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT "ai_business_memories_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ai_business_memories_tenant_type" ON "ai_business_memories" ("tenant_id", "memory_type");
CREATE INDEX "ai_business_memories_entity" ON "ai_business_memories" ("tenant_id", "entity_type", "entity_id");

-- AI Accuracy Metrics (per tenant, per period)
CREATE TABLE "ai_accuracy_metrics" (
  "id"                       UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"                UUID NOT NULL,
  "period"                   VARCHAR(20) NOT NULL,
  "period_date"              DATE NOT NULL,
  "category"                 VARCHAR(50),
  "total_recommendations"    INTEGER NOT NULL DEFAULT 0,
  "accepted_recommendations" INTEGER NOT NULL DEFAULT 0,
  "rejected_recommendations" INTEGER NOT NULL DEFAULT 0,
  "ignored_recommendations"  INTEGER NOT NULL DEFAULT 0,
  "implemented_recommendations" INTEGER NOT NULL DEFAULT 0,
  "avg_confidence"           DOUBLE PRECISION NOT NULL DEFAULT 0,
  "accuracy_rate"            DOUBLE PRECISION NOT NULL DEFAULT 0,
  "outcome_score"            DOUBLE PRECISION,
  "created_at"               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ai_accuracy_metrics_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_accuracy_metrics_unique" UNIQUE ("tenant_id", "period", "period_date", "category")
);
CREATE INDEX "ai_accuracy_metrics_period" ON "ai_accuracy_metrics" ("tenant_id", "period", "period_date");

-- AI Daily Briefing
CREATE TABLE "ai_daily_briefings" (
  "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        UUID NOT NULL,
  "briefing_date"    DATE NOT NULL,
  "headline"         VARCHAR(500) NOT NULL,
  "summary"          TEXT NOT NULL,
  "key_metrics"      JSONB NOT NULL DEFAULT '{}',
  "top_insights"     JSONB NOT NULL DEFAULT '[]',
  "urgent_items"     JSONB NOT NULL DEFAULT '[]',
  "opportunities"    JSONB NOT NULL DEFAULT '[]',
  "risks"            JSONB NOT NULL DEFAULT '[]',
  "today_priorities" JSONB NOT NULL DEFAULT '[]',
  "business_mood"    VARCHAR(30) NOT NULL DEFAULT 'stable',
  "generated_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "viewed_by"        JSONB NOT NULL DEFAULT '[]',
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ai_daily_briefings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_daily_briefings_unique" UNIQUE ("tenant_id", "briefing_date")
);
CREATE INDEX "ai_daily_briefings_date" ON "ai_daily_briefings" ("tenant_id", "briefing_date" DESC);

-- AI Board Meeting Simulator
CREATE TABLE "ai_board_simulations" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID NOT NULL,
  "session_name" VARCHAR(255) NOT NULL,
  "agenda"       JSONB NOT NULL DEFAULT '[]',
  "board_members" JSONB NOT NULL DEFAULT '[]',
  "discussion"   JSONB NOT NULL DEFAULT '[]',
  "decisions"    JSONB NOT NULL DEFAULT '[]',
  "action_items" JSONB NOT NULL DEFAULT '[]',
  "key_conflicts" JSONB NOT NULL DEFAULT '[]',
  "consensus"    TEXT,
  "status"       VARCHAR(20) NOT NULL DEFAULT 'draft',
  "conducted_at" TIMESTAMPTZ,
  "created_by"   UUID NOT NULL,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "is_active"    BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT "ai_board_simulations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ai_board_simulations_tenant" ON "ai_board_simulations" ("tenant_id", "status");

-- AI Vector Embeddings (semantic search foundation)
CREATE TABLE "ai_vector_embeddings" (
  "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID NOT NULL,
  "entity_type" VARCHAR(50) NOT NULL,
  "entity_id"   UUID NOT NULL,
  "chunk_index" INTEGER NOT NULL DEFAULT 0,
  "content"     TEXT NOT NULL,
  "embedding"   JSONB NOT NULL,
  "model"       VARCHAR(100) NOT NULL DEFAULT 'text-embedding-3-small',
  "dimensions"  INTEGER NOT NULL DEFAULT 1536,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ai_vector_embeddings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_vector_embeddings_unique" UNIQUE ("tenant_id", "entity_type", "entity_id", "chunk_index")
);
CREATE INDEX "ai_vector_embeddings_entity" ON "ai_vector_embeddings" ("tenant_id", "entity_type");

-- AI Feedback Loop (learning from human responses)
CREATE TABLE "ai_feedback_loops" (
  "id"                  UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"           UUID NOT NULL,
  "source_type"         VARCHAR(50) NOT NULL,
  "source_id"           UUID NOT NULL,
  "rating"              INTEGER NOT NULL,
  "outcome"             VARCHAR(30) NOT NULL,
  "feedback_text"       TEXT,
  "rejection_reason"    VARCHAR(200),
  "implemented_result"  TEXT,
  "confidence_at_time"  DOUBLE PRECISION NOT NULL,
  "actual_accurate"     BOOLEAN,
  "learned_patterns"    JSONB NOT NULL DEFAULT '[]',
  "submitted_by"        UUID NOT NULL,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ai_feedback_loops_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ai_feedback_loops_source" ON "ai_feedback_loops" ("tenant_id", "source_type");
CREATE INDEX "ai_feedback_loops_outcome" ON "ai_feedback_loops" ("tenant_id", "outcome");
