CREATE TABLE "mki_campaigns" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'email',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "impressions" INTEGER NOT NULL DEFAULT 0,
  "clicks" INTEGER NOT NULL DEFAULT 0,
  "conversions" INTEGER NOT NULL DEFAULT 0,
  "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ai_roi_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ai_performance" TEXT NOT NULL DEFAULT 'unknown',
  "ai_recommendations" JSONB NOT NULL DEFAULT '[]',
  "start_date" TIMESTAMPTZ,
  "end_date" TIMESTAMPTZ,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "mki_campaigns_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mki_campaigns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "mki_campaigns_tenant_id_idx" ON "mki_campaigns"("tenant_id");

CREATE TABLE "mki_audiences" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "segment_type" TEXT NOT NULL DEFAULT 'behavioral',
  "size" INTEGER NOT NULL DEFAULT 0,
  "engagement_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "conversion_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ai_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ai_insights" JSONB NOT NULL DEFAULT '[]',
  "criteria" JSONB NOT NULL DEFAULT '{}',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "mki_audiences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mki_audiences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "mki_audiences_tenant_id_idx" ON "mki_audiences"("tenant_id");

CREATE TABLE "mki_content_scores" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "content_type" TEXT NOT NULL DEFAULT 'blog',
  "channel" TEXT NOT NULL DEFAULT 'web',
  "word_count" INTEGER NOT NULL DEFAULT 0,
  "seo_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "readability_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "engagement_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ai_overall_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ai_grade" TEXT NOT NULL DEFAULT 'C',
  "ai_suggestions" JSONB NOT NULL DEFAULT '[]',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "mki_content_scores_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mki_content_scores_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "mki_content_scores_tenant_id_idx" ON "mki_content_scores"("tenant_id");

CREATE TABLE "mki_marketing_insights" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "impact" TEXT NOT NULL DEFAULT 'medium',
  "action_items" JSONB NOT NULL DEFAULT '[]',
  "data" JSONB NOT NULL DEFAULT '{}',
  "generated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "mki_marketing_insights_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mki_marketing_insights_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "mki_marketing_insights_tenant_id_idx" ON "mki_marketing_insights"("tenant_id");