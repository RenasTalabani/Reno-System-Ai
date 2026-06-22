-- CreateTable
CREATE TABLE "pm_projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'planning',
    "priority" VARCHAR(50) NOT NULL DEFAULT 'medium',
    "visibility" VARCHAR(50) NOT NULL DEFAULT 'internal',
    "owner_id" UUID NOT NULL,
    "start_date" DATE,
    "end_date" DATE,
    "target_date" DATE,
    "actual_end_date" DATE,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "color" VARCHAR(20) NOT NULL DEFAULT '#6366f1',
    "icon" VARCHAR(50),
    "tags" JSONB NOT NULL DEFAULT '[]',
    "budget" DECIMAL(15,2),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "estimated_hours" DECIMAL(10,2),
    "actual_hours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ai_insights" JSONB,
    "predicted_end_date" DATE,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pm_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_project_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(50) NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pm_project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_milestones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "due_date" DATE NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'open',
    "completed_at" TIMESTAMP(3),
    "color" VARCHAR(20) NOT NULL DEFAULT '#6366f1',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pm_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "milestone_id" UUID,
    "parent_id" UUID,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'todo',
    "priority" VARCHAR(50) NOT NULL DEFAULT 'medium',
    "task_type" VARCHAR(50) NOT NULL DEFAULT 'task',
    "assignee_id" UUID,
    "reporter_id" UUID,
    "start_date" DATE,
    "due_date" DATE,
    "completed_at" TIMESTAMP(3),
    "estimated_hours" DECIMAL(8,2),
    "actual_hours" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "story_points" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,
    "labels" JSONB NOT NULL DEFAULT '[]',
    "ai_suggestions" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pm_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_task_dependencies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "depends_on_id" UUID NOT NULL,
    "dependency_type" VARCHAR(50) NOT NULL DEFAULT 'finish_to_start',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pm_task_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_task_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "parent_id" UUID,
    "author_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "edited_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pm_task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_task_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_url" VARCHAR(500) NOT NULL,
    "file_mime_type" VARCHAR(100),
    "file_size_bytes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pm_task_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_time_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "task_id" UUID,
    "user_id" UUID NOT NULL,
    "description" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "duration_minutes" INTEGER,
    "is_billable" BOOLEAN NOT NULL DEFAULT false,
    "hourly_rate" DECIMAL(10,2),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pm_time_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_boards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "board_type" VARCHAR(50) NOT NULL DEFAULT 'kanban',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pm_boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_board_columns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "board_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "color" VARCHAR(20) NOT NULL DEFAULT '#6366f1',
    "position" INTEGER NOT NULL DEFAULT 0,
    "wip_limit" INTEGER,
    "task_status" VARCHAR(50),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pm_board_columns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_labels" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "color" VARCHAR(20) NOT NULL DEFAULT '#6366f1',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pm_labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_resource_allocations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "allocated_hours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "allocation_pct" INTEGER NOT NULL DEFAULT 100,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "burnout_risk" DECIMAL(3,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pm_resource_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_activity_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "task_id" UUID,
    "actor_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" UUID NOT NULL,
    "changes" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pm_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pm_projects_tenant_id_idx" ON "pm_projects"("tenant_id");

-- CreateIndex
CREATE INDEX "pm_projects_tenant_id_status_idx" ON "pm_projects"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "pm_projects_tenant_id_owner_id_idx" ON "pm_projects"("tenant_id", "owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "pm_projects_tenant_id_company_id_code_key" ON "pm_projects"("tenant_id", "company_id", "code");

-- CreateIndex
CREATE INDEX "pm_project_members_tenant_id_project_id_idx" ON "pm_project_members"("tenant_id", "project_id");

-- CreateIndex
CREATE INDEX "pm_project_members_tenant_id_user_id_idx" ON "pm_project_members"("tenant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "pm_project_members_tenant_id_project_id_user_id_key" ON "pm_project_members"("tenant_id", "project_id", "user_id");

-- CreateIndex
CREATE INDEX "pm_milestones_tenant_id_project_id_idx" ON "pm_milestones"("tenant_id", "project_id");

-- CreateIndex
CREATE INDEX "pm_milestones_tenant_id_status_idx" ON "pm_milestones"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "pm_tasks_tenant_id_project_id_idx" ON "pm_tasks"("tenant_id", "project_id");

-- CreateIndex
CREATE INDEX "pm_tasks_tenant_id_assignee_id_idx" ON "pm_tasks"("tenant_id", "assignee_id");

-- CreateIndex
CREATE INDEX "pm_tasks_tenant_id_status_idx" ON "pm_tasks"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "pm_tasks_tenant_id_parent_id_idx" ON "pm_tasks"("tenant_id", "parent_id");

-- CreateIndex
CREATE INDEX "pm_tasks_tenant_id_milestone_id_idx" ON "pm_tasks"("tenant_id", "milestone_id");

-- CreateIndex
CREATE INDEX "pm_task_dependencies_tenant_id_task_id_idx" ON "pm_task_dependencies"("tenant_id", "task_id");

-- CreateIndex
CREATE UNIQUE INDEX "pm_task_dependencies_tenant_id_task_id_depends_on_id_key" ON "pm_task_dependencies"("tenant_id", "task_id", "depends_on_id");

-- CreateIndex
CREATE INDEX "pm_task_comments_tenant_id_task_id_idx" ON "pm_task_comments"("tenant_id", "task_id");

-- CreateIndex
CREATE INDEX "pm_task_attachments_tenant_id_task_id_idx" ON "pm_task_attachments"("tenant_id", "task_id");

-- CreateIndex
CREATE INDEX "pm_time_logs_tenant_id_project_id_idx" ON "pm_time_logs"("tenant_id", "project_id");

-- CreateIndex
CREATE INDEX "pm_time_logs_tenant_id_task_id_idx" ON "pm_time_logs"("tenant_id", "task_id");

-- CreateIndex
CREATE INDEX "pm_time_logs_tenant_id_user_id_idx" ON "pm_time_logs"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "pm_boards_tenant_id_project_id_idx" ON "pm_boards"("tenant_id", "project_id");

-- CreateIndex
CREATE INDEX "pm_board_columns_tenant_id_board_id_idx" ON "pm_board_columns"("tenant_id", "board_id");

-- CreateIndex
CREATE INDEX "pm_labels_tenant_id_idx" ON "pm_labels"("tenant_id");

-- CreateIndex
CREATE INDEX "pm_labels_tenant_id_project_id_idx" ON "pm_labels"("tenant_id", "project_id");

-- CreateIndex
CREATE INDEX "pm_resource_allocations_tenant_id_project_id_idx" ON "pm_resource_allocations"("tenant_id", "project_id");

-- CreateIndex
CREATE INDEX "pm_resource_allocations_tenant_id_user_id_idx" ON "pm_resource_allocations"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "pm_activity_logs_tenant_id_project_id_idx" ON "pm_activity_logs"("tenant_id", "project_id");

-- CreateIndex
CREATE INDEX "pm_activity_logs_tenant_id_task_id_idx" ON "pm_activity_logs"("tenant_id", "task_id");

-- CreateIndex
CREATE INDEX "pm_activity_logs_tenant_id_actor_id_idx" ON "pm_activity_logs"("tenant_id", "actor_id");

-- AddForeignKey
ALTER TABLE "pm_projects" ADD CONSTRAINT "pm_projects_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_project_members" ADD CONSTRAINT "pm_project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pm_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_milestones" ADD CONSTRAINT "pm_milestones_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pm_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_tasks" ADD CONSTRAINT "pm_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pm_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_tasks" ADD CONSTRAINT "pm_tasks_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "pm_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_tasks" ADD CONSTRAINT "pm_tasks_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "pm_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_task_dependencies" ADD CONSTRAINT "pm_task_dependencies_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "pm_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_task_dependencies" ADD CONSTRAINT "pm_task_dependencies_depends_on_id_fkey" FOREIGN KEY ("depends_on_id") REFERENCES "pm_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_task_comments" ADD CONSTRAINT "pm_task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "pm_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_task_comments" ADD CONSTRAINT "pm_task_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "pm_task_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_task_attachments" ADD CONSTRAINT "pm_task_attachments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "pm_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_time_logs" ADD CONSTRAINT "pm_time_logs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "pm_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_boards" ADD CONSTRAINT "pm_boards_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_boards" ADD CONSTRAINT "pm_boards_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pm_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_board_columns" ADD CONSTRAINT "pm_board_columns_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "pm_boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_labels" ADD CONSTRAINT "pm_labels_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_labels" ADD CONSTRAINT "pm_labels_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pm_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_resource_allocations" ADD CONSTRAINT "pm_resource_allocations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pm_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_activity_logs" ADD CONSTRAINT "pm_activity_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "pm_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_activity_logs" ADD CONSTRAINT "pm_activity_logs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "pm_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
