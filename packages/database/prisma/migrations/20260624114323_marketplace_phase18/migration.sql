-- CreateTable
CREATE TABLE "mkt_developer_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "tenant_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "website" VARCHAR(500),
    "description" TEXT,
    "avatar_url" VARCHAR(500),
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "revenue_share_pct" DOUBLE PRECISION NOT NULL DEFAULT 70,
    "total_earnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "payout_email" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "mkt_developer_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mkt_plugins" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "developer_id" UUID NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "short_description" VARCHAR(500) NOT NULL,
    "description" TEXT NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "tags" TEXT[],
    "icon_url" VARCHAR(500),
    "screenshot_urls" TEXT[],
    "pricing_model" VARCHAR(50) NOT NULL DEFAULT 'free',
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "trial_days" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "review_notes" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" UUID,
    "current_version" VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    "min_core_version" VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    "max_core_version" VARCHAR(50),
    "required_modules" TEXT[],
    "permissions" TEXT[],
    "install_count" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "is_official" BOOLEAN NOT NULL DEFAULT false,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "website_url" VARCHAR(500),
    "documentation_url" VARCHAR(500),
    "support_email" VARCHAR(255),
    "license_type" VARCHAR(50) NOT NULL DEFAULT 'proprietary',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "mkt_plugins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mkt_plugin_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "plugin_id" UUID NOT NULL,
    "version" VARCHAR(50) NOT NULL,
    "changelog" TEXT NOT NULL,
    "min_core_version" VARCHAR(50) NOT NULL,
    "max_core_version" VARCHAR(50),
    "download_url" VARCHAR(500),
    "checksum" VARCHAR(255),
    "is_stable" BOOLEAN NOT NULL DEFAULT true,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mkt_plugin_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mkt_themes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "developer_id" UUID,
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "category" VARCHAR(100) NOT NULL DEFAULT 'general',
    "preview_url" VARCHAR(500),
    "thumbnail_url" VARCHAR(500),
    "screenshot_urls" TEXT[],
    "primary_color" VARCHAR(20) NOT NULL,
    "secondary_color" VARCHAR(20) NOT NULL,
    "accent_color" VARCHAR(20),
    "font_family" VARCHAR(100) NOT NULL DEFAULT 'Inter',
    "dark_mode_support" BOOLEAN NOT NULL DEFAULT true,
    "pricing_model" VARCHAR(50) NOT NULL DEFAULT 'free',
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "status" VARCHAR(50) NOT NULL DEFAULT 'approved',
    "is_official" BOOLEAN NOT NULL DEFAULT false,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "install_count" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "config_schema" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "mkt_themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mkt_workflow_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "tags" TEXT[],
    "icon_url" VARCHAR(500),
    "preview_image_url" VARCHAR(500),
    "trigger_type" VARCHAR(100) NOT NULL,
    "definition" JSONB NOT NULL,
    "pricing_model" VARCHAR(50) NOT NULL DEFAULT 'free',
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" VARCHAR(50) NOT NULL DEFAULT 'approved',
    "is_official" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "install_count" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "mkt_workflow_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mkt_ai_agent_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "tags" TEXT[],
    "icon_url" VARCHAR(500),
    "system_prompt" TEXT NOT NULL,
    "capabilities" TEXT[],
    "tools" TEXT[],
    "model_preference" VARCHAR(100) NOT NULL DEFAULT 'claude-sonnet-4-6',
    "pricing_model" VARCHAR(50) NOT NULL DEFAULT 'free',
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" VARCHAR(50) NOT NULL DEFAULT 'approved',
    "is_official" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "install_count" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "mkt_ai_agent_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mkt_industry_packs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "industry" VARCHAR(100) NOT NULL,
    "icon_url" VARCHAR(500),
    "screenshot_urls" TEXT[],
    "included_plugins" TEXT[],
    "included_themes" TEXT[],
    "included_workflows" TEXT[],
    "pricing_model" VARCHAR(50) NOT NULL DEFAULT 'free',
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "status" VARCHAR(50) NOT NULL DEFAULT 'approved',
    "is_official" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "install_count" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "mkt_industry_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mkt_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "listing_type" VARCHAR(50) NOT NULL,
    "plugin_id" UUID,
    "theme_id" UUID,
    "workflow_template_id" UUID,
    "ai_agent_template_id" UUID,
    "industry_pack_id" UUID,
    "rating" INTEGER NOT NULL,
    "title" VARCHAR(255),
    "body" TEXT,
    "is_verified_purchase" BOOLEAN NOT NULL DEFAULT false,
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mkt_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mkt_tenant_plugins" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "plugin_id" UUID NOT NULL,
    "installed_version" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "config" JSONB,
    "granted_permissions" TEXT[],
    "installed_by" UUID NOT NULL,
    "installed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_upgraded_at" TIMESTAMP(3),
    "upgraded_from_version" VARCHAR(50),

    CONSTRAINT "mkt_tenant_plugins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mkt_tenant_themes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "theme_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "custom_config" JSONB,
    "installed_by" UUID NOT NULL,
    "installed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activated_at" TIMESTAMP(3),

    CONSTRAINT "mkt_tenant_themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mkt_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "listing_type" VARCHAR(50) NOT NULL,
    "plugin_id" UUID,
    "listing_name" VARCHAR(255) NOT NULL,
    "from_version" VARCHAR(50),
    "to_version" VARCHAR(50),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mkt_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mkt_developer_accounts_user_id_idx" ON "mkt_developer_accounts"("user_id");

-- CreateIndex
CREATE INDEX "mkt_developer_accounts_status_idx" ON "mkt_developer_accounts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "mkt_plugins_slug_key" ON "mkt_plugins"("slug");

-- CreateIndex
CREATE INDEX "mkt_plugins_slug_idx" ON "mkt_plugins"("slug");

-- CreateIndex
CREATE INDEX "mkt_plugins_category_idx" ON "mkt_plugins"("category");

-- CreateIndex
CREATE INDEX "mkt_plugins_status_idx" ON "mkt_plugins"("status");

-- CreateIndex
CREATE INDEX "mkt_plugins_is_featured_idx" ON "mkt_plugins"("is_featured");

-- CreateIndex
CREATE INDEX "mkt_plugin_versions_plugin_id_idx" ON "mkt_plugin_versions"("plugin_id");

-- CreateIndex
CREATE UNIQUE INDEX "mkt_plugin_versions_plugin_id_version_key" ON "mkt_plugin_versions"("plugin_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "mkt_themes_slug_key" ON "mkt_themes"("slug");

-- CreateIndex
CREATE INDEX "mkt_themes_category_idx" ON "mkt_themes"("category");

-- CreateIndex
CREATE INDEX "mkt_themes_status_idx" ON "mkt_themes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "mkt_workflow_templates_slug_key" ON "mkt_workflow_templates"("slug");

-- CreateIndex
CREATE INDEX "mkt_workflow_templates_category_idx" ON "mkt_workflow_templates"("category");

-- CreateIndex
CREATE INDEX "mkt_workflow_templates_status_idx" ON "mkt_workflow_templates"("status");

-- CreateIndex
CREATE UNIQUE INDEX "mkt_ai_agent_templates_slug_key" ON "mkt_ai_agent_templates"("slug");

-- CreateIndex
CREATE INDEX "mkt_ai_agent_templates_category_idx" ON "mkt_ai_agent_templates"("category");

-- CreateIndex
CREATE INDEX "mkt_ai_agent_templates_status_idx" ON "mkt_ai_agent_templates"("status");

-- CreateIndex
CREATE UNIQUE INDEX "mkt_industry_packs_slug_key" ON "mkt_industry_packs"("slug");

-- CreateIndex
CREATE INDEX "mkt_industry_packs_industry_idx" ON "mkt_industry_packs"("industry");

-- CreateIndex
CREATE INDEX "mkt_industry_packs_status_idx" ON "mkt_industry_packs"("status");

-- CreateIndex
CREATE INDEX "mkt_reviews_tenant_id_idx" ON "mkt_reviews"("tenant_id");

-- CreateIndex
CREATE INDEX "mkt_reviews_listing_type_idx" ON "mkt_reviews"("listing_type");

-- CreateIndex
CREATE UNIQUE INDEX "mkt_reviews_tenant_id_user_id_listing_type_plugin_id_key" ON "mkt_reviews"("tenant_id", "user_id", "listing_type", "plugin_id");

-- CreateIndex
CREATE INDEX "mkt_tenant_plugins_tenant_id_idx" ON "mkt_tenant_plugins"("tenant_id");

-- CreateIndex
CREATE INDEX "mkt_tenant_plugins_status_idx" ON "mkt_tenant_plugins"("status");

-- CreateIndex
CREATE UNIQUE INDEX "mkt_tenant_plugins_tenant_id_plugin_id_key" ON "mkt_tenant_plugins"("tenant_id", "plugin_id");

-- CreateIndex
CREATE INDEX "mkt_tenant_themes_tenant_id_idx" ON "mkt_tenant_themes"("tenant_id");

-- CreateIndex
CREATE INDEX "mkt_tenant_themes_tenant_id_is_active_idx" ON "mkt_tenant_themes"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "mkt_tenant_themes_tenant_id_theme_id_key" ON "mkt_tenant_themes"("tenant_id", "theme_id");

-- CreateIndex
CREATE INDEX "mkt_audit_logs_tenant_id_idx" ON "mkt_audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "mkt_audit_logs_action_idx" ON "mkt_audit_logs"("action");

-- CreateIndex
CREATE INDEX "mkt_audit_logs_listing_type_idx" ON "mkt_audit_logs"("listing_type");

-- AddForeignKey
ALTER TABLE "mkt_plugins" ADD CONSTRAINT "mkt_plugins_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "mkt_developer_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_plugin_versions" ADD CONSTRAINT "mkt_plugin_versions_plugin_id_fkey" FOREIGN KEY ("plugin_id") REFERENCES "mkt_plugins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_themes" ADD CONSTRAINT "mkt_themes_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "mkt_developer_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_reviews" ADD CONSTRAINT "mkt_reviews_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_reviews" ADD CONSTRAINT "mkt_reviews_plugin_id_fkey" FOREIGN KEY ("plugin_id") REFERENCES "mkt_plugins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_reviews" ADD CONSTRAINT "mkt_reviews_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "mkt_themes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_reviews" ADD CONSTRAINT "mkt_reviews_workflow_template_id_fkey" FOREIGN KEY ("workflow_template_id") REFERENCES "mkt_workflow_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_reviews" ADD CONSTRAINT "mkt_reviews_ai_agent_template_id_fkey" FOREIGN KEY ("ai_agent_template_id") REFERENCES "mkt_ai_agent_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_reviews" ADD CONSTRAINT "mkt_reviews_industry_pack_id_fkey" FOREIGN KEY ("industry_pack_id") REFERENCES "mkt_industry_packs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_tenant_plugins" ADD CONSTRAINT "mkt_tenant_plugins_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_tenant_plugins" ADD CONSTRAINT "mkt_tenant_plugins_plugin_id_fkey" FOREIGN KEY ("plugin_id") REFERENCES "mkt_plugins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_tenant_themes" ADD CONSTRAINT "mkt_tenant_themes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_tenant_themes" ADD CONSTRAINT "mkt_tenant_themes_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "mkt_themes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_audit_logs" ADD CONSTRAINT "mkt_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_audit_logs" ADD CONSTRAINT "mkt_audit_logs_plugin_id_fkey" FOREIGN KEY ("plugin_id") REFERENCES "mkt_plugins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
