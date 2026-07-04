-- Phase 99: Documentation Hub

CREATE TABLE "dh_spaces" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "slug" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "audience" VARCHAR(30) NOT NULL DEFAULT 'all',
  "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "dh_spaces_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "dh_spaces_tenant_id_slug_key" ON "dh_spaces"("tenant_id","slug");
CREATE INDEX "dh_spaces_tenant_id_idx" ON "dh_spaces"("tenant_id");
ALTER TABLE "dh_spaces" ADD CONSTRAINT "dh_spaces_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "dh_articles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "space_id" UUID NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "slug" VARCHAR(255) NOT NULL,
  "content" TEXT NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'draft',
  "current_version" INTEGER NOT NULL DEFAULT 1,
  "view_count" INTEGER NOT NULL DEFAULT 0,
  "helpful_yes" INTEGER NOT NULL DEFAULT 0,
  "helpful_no" INTEGER NOT NULL DEFAULT 0,
  "tags" JSONB,
  "published_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "dh_articles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "dh_articles_tenant_id_space_id_slug_key" ON "dh_articles"("tenant_id","space_id","slug");
CREATE INDEX "dh_articles_tenant_id_space_id_idx" ON "dh_articles"("tenant_id","space_id");
ALTER TABLE "dh_articles" ADD CONSTRAINT "dh_articles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "dh_articles" ADD CONSTRAINT "dh_articles_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "dh_spaces"("id") ON DELETE CASCADE;

CREATE TABLE "dh_article_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "article_id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "content" TEXT NOT NULL,
  "edited_by" VARCHAR(100),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "dh_article_versions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "dh_article_versions_article_id_version_key" ON "dh_article_versions"("article_id","version");
CREATE INDEX "dh_article_versions_tenant_id_article_id_idx" ON "dh_article_versions"("tenant_id","article_id");
ALTER TABLE "dh_article_versions" ADD CONSTRAINT "dh_article_versions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "dh_article_versions" ADD CONSTRAINT "dh_article_versions_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "dh_articles"("id") ON DELETE CASCADE;

CREATE TABLE "dh_feedbacks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "article_id" UUID NOT NULL,
  "helpful" BOOLEAN NOT NULL,
  "comment" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "dh_feedbacks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "dh_feedbacks_tenant_id_article_id_idx" ON "dh_feedbacks"("tenant_id","article_id");
ALTER TABLE "dh_feedbacks" ADD CONSTRAINT "dh_feedbacks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "dh_feedbacks" ADD CONSTRAINT "dh_feedbacks_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "dh_articles"("id") ON DELETE CASCADE;

CREATE TABLE "dh_glossary_terms" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "term" VARCHAR(100) NOT NULL,
  "definition" TEXT NOT NULL,
  "category" VARCHAR(50),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "dh_glossary_terms_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "dh_glossary_terms_tenant_id_term_key" ON "dh_glossary_terms"("tenant_id","term");
CREATE INDEX "dh_glossary_terms_tenant_id_idx" ON "dh_glossary_terms"("tenant_id");
ALTER TABLE "dh_glossary_terms" ADD CONSTRAINT "dh_glossary_terms_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "dh_search_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "query" VARCHAR(255) NOT NULL,
  "result_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "dh_search_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "dh_search_logs_tenant_id_idx" ON "dh_search_logs"("tenant_id");
ALTER TABLE "dh_search_logs" ADD CONSTRAINT "dh_search_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;