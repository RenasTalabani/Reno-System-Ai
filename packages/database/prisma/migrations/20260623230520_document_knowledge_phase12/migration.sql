-- CreateTable
CREATE TABLE "doc_folders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "parent_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "color" VARCHAR(50),
    "icon" VARCHAR(100),
    "path" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "doc_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "folder_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "mime_type" VARCHAR(200) NOT NULL,
    "extension" VARCHAR(20),
    "size_bytes" BIGINT NOT NULL DEFAULT 0,
    "storage_key" VARCHAR(500) NOT NULL,
    "storage_provider" VARCHAR(50) NOT NULL DEFAULT 'minio',
    "ocr_status" VARCHAR(50) DEFAULT 'pending',
    "ocr_text" TEXT,
    "ocr_processed_at" TIMESTAMP(3),
    "ai_summary" TEXT,
    "ai_tags" TEXT[],
    "ai_analyzed_at" TIMESTAMP(3),
    "tags" TEXT[],
    "is_template" BOOLEAN NOT NULL DEFAULT false,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "current_version" INTEGER NOT NULL DEFAULT 1,
    "checksum" VARCHAR(64),
    "approval_status" VARCHAR(50),
    "approved_at" TIMESTAMP(3),
    "approved_by" UUID,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "doc_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_file_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "storage_key" VARCHAR(500) NOT NULL,
    "size_bytes" BIGINT NOT NULL DEFAULT 0,
    "checksum" VARCHAR(64),
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,

    CONSTRAINT "doc_file_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "folder_id" UUID,
    "file_id" UUID,
    "user_id" UUID,
    "role_id" UUID,
    "can_view" BOOLEAN NOT NULL DEFAULT true,
    "can_edit" BOOLEAN NOT NULL DEFAULT false,
    "can_delete" BOOLEAN NOT NULL DEFAULT false,
    "can_share" BOOLEAN NOT NULL DEFAULT false,
    "can_approve" BOOLEAN NOT NULL DEFAULT false,
    "granted_by" UUID NOT NULL,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doc_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(100) NOT NULL,
    "file_id" UUID,
    "variables" JSONB,
    "tags" TEXT[],
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doc_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "file_id" UUID,
    "folder_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_name" VARCHAR(255) NOT NULL,
    "metadata" JSONB,
    "ip_address" VARCHAR(45),
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doc_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kb_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "parent_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "slug" VARCHAR(255) NOT NULL,
    "icon" VARCHAR(100),
    "color" VARCHAR(50),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "kb_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kb_articles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "category_id" UUID,
    "title" VARCHAR(500) NOT NULL,
    "slug" VARCHAR(500) NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "tags" TEXT[],
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "ai_summary" TEXT,
    "ai_keywords" TEXT[],
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "current_version" INTEGER NOT NULL DEFAULT 1,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "kb_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kb_article_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "article_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "content" TEXT NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,

    CONSTRAINT "kb_article_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "doc_folders_tenant_id_idx" ON "doc_folders"("tenant_id");

-- CreateIndex
CREATE INDEX "doc_folders_tenant_id_parent_id_idx" ON "doc_folders"("tenant_id", "parent_id");

-- CreateIndex
CREATE INDEX "doc_files_tenant_id_idx" ON "doc_files"("tenant_id");

-- CreateIndex
CREATE INDEX "doc_files_tenant_id_folder_id_idx" ON "doc_files"("tenant_id", "folder_id");

-- CreateIndex
CREATE INDEX "doc_files_tenant_id_mime_type_idx" ON "doc_files"("tenant_id", "mime_type");

-- CreateIndex
CREATE INDEX "doc_files_tenant_id_is_template_idx" ON "doc_files"("tenant_id", "is_template");

-- CreateIndex
CREATE INDEX "doc_file_versions_file_id_idx" ON "doc_file_versions"("file_id");

-- CreateIndex
CREATE INDEX "doc_file_versions_tenant_id_idx" ON "doc_file_versions"("tenant_id");

-- CreateIndex
CREATE INDEX "doc_permissions_tenant_id_idx" ON "doc_permissions"("tenant_id");

-- CreateIndex
CREATE INDEX "doc_permissions_folder_id_idx" ON "doc_permissions"("folder_id");

-- CreateIndex
CREATE INDEX "doc_permissions_file_id_idx" ON "doc_permissions"("file_id");

-- CreateIndex
CREATE INDEX "doc_permissions_user_id_idx" ON "doc_permissions"("user_id");

-- CreateIndex
CREATE INDEX "doc_templates_tenant_id_idx" ON "doc_templates"("tenant_id");

-- CreateIndex
CREATE INDEX "doc_templates_category_idx" ON "doc_templates"("category");

-- CreateIndex
CREATE INDEX "doc_audit_logs_tenant_id_occurred_at_idx" ON "doc_audit_logs"("tenant_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "doc_audit_logs_file_id_idx" ON "doc_audit_logs"("file_id");

-- CreateIndex
CREATE INDEX "doc_audit_logs_tenant_id_action_idx" ON "doc_audit_logs"("tenant_id", "action");

-- CreateIndex
CREATE INDEX "kb_categories_tenant_id_idx" ON "kb_categories"("tenant_id");

-- CreateIndex
CREATE INDEX "kb_categories_tenant_id_parent_id_idx" ON "kb_categories"("tenant_id", "parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "kb_categories_tenant_id_slug_key" ON "kb_categories"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "kb_articles_tenant_id_idx" ON "kb_articles"("tenant_id");

-- CreateIndex
CREATE INDEX "kb_articles_tenant_id_category_id_idx" ON "kb_articles"("tenant_id", "category_id");

-- CreateIndex
CREATE INDEX "kb_articles_tenant_id_status_idx" ON "kb_articles"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "kb_articles_tenant_id_slug_key" ON "kb_articles"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "kb_article_versions_article_id_idx" ON "kb_article_versions"("article_id");

-- CreateIndex
CREATE INDEX "kb_article_versions_tenant_id_idx" ON "kb_article_versions"("tenant_id");

-- AddForeignKey
ALTER TABLE "doc_folders" ADD CONSTRAINT "doc_folders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_folders" ADD CONSTRAINT "doc_folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "doc_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_files" ADD CONSTRAINT "doc_files_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_files" ADD CONSTRAINT "doc_files_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "doc_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_file_versions" ADD CONSTRAINT "doc_file_versions_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "doc_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_permissions" ADD CONSTRAINT "doc_permissions_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "doc_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_permissions" ADD CONSTRAINT "doc_permissions_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "doc_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_audit_logs" ADD CONSTRAINT "doc_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_audit_logs" ADD CONSTRAINT "doc_audit_logs_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "doc_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_categories" ADD CONSTRAINT "kb_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_categories" ADD CONSTRAINT "kb_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "kb_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_articles" ADD CONSTRAINT "kb_articles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_articles" ADD CONSTRAINT "kb_articles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "kb_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_article_versions" ADD CONSTRAINT "kb_article_versions_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "kb_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
