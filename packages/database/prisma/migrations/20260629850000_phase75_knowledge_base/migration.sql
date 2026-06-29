-- Phase 75: Knowledge Base
CREATE TABLE IF NOT EXISTS "kb_categories" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "slug" VARCHAR(100) NOT NULL,
  "icon" VARCHAR(50),
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "parent_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "kb_categories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "kb_categories_tenant_slug_key" UNIQUE ("tenant_id", "slug"),
  CONSTRAINT "kb_categories_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "kb_categories_tenant_id_idx" ON "kb_categories"("tenant_id");

CREATE TABLE IF NOT EXISTS "kb_articles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "category_id" UUID,
  "author_id" UUID NOT NULL,
  "title" VARCHAR(500) NOT NULL,
  "slug" VARCHAR(500) NOT NULL,
  "content" TEXT NOT NULL,
  "excerpt" VARCHAR(1000),
  "tags" JSONB NOT NULL DEFAULT '[]',
  "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
  "views" INTEGER NOT NULL DEFAULT 0,
  "helpful" INTEGER NOT NULL DEFAULT 0,
  "not_helpful" INTEGER NOT NULL DEFAULT 0,
  "published_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "kb_articles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "kb_articles_tenant_slug_key" UNIQUE ("tenant_id", "slug"),
  CONSTRAINT "kb_articles_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "kb_articles_category_fkey" FOREIGN KEY ("category_id") REFERENCES "kb_categories"("id")
);
CREATE INDEX IF NOT EXISTS "kb_articles_tenant_id_idx" ON "kb_articles"("tenant_id");
