-- Phase 65: Project Portfolio Management
CREATE TABLE "ppm_portfolios" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "name" VARCHAR(300) NOT NULL,
  "description" TEXT, "owner_id" UUID NOT NULL, "budget" DECIMAL(16,2), "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
  "status" VARCHAR(30) NOT NULL DEFAULT 'active', "start_date" DATE, "end_date" DATE,
  "metadata" JSONB NOT NULL DEFAULT '{}', "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ppm_portfolios_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ppm_portfolios_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "ppm_portfolios_tenant_id_idx" ON "ppm_portfolios"("tenant_id");

CREATE TABLE "ppm_projects" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "portfolio_id" UUID,
  "name" VARCHAR(300) NOT NULL, "description" TEXT, "manager_id" UUID NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'planning', "priority" VARCHAR(20) NOT NULL DEFAULT 'medium',
  "budget" DECIMAL(16,2), "spent" DECIMAL(16,2) NOT NULL DEFAULT 0, "progress" INTEGER NOT NULL DEFAULT 0,
  "start_date" DATE, "end_date" DATE, "completed_at" TIMESTAMPTZ, "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ppm_projects_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ppm_projects_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "ppm_projects_portfolio_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "ppm_portfolios"("id")
);
CREATE INDEX "ppm_projects_tenant_status_idx" ON "ppm_projects"("tenant_id","status");

CREATE TABLE "ppm_milestones" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "project_id" UUID NOT NULL, "name" VARCHAR(300) NOT NULL,
  "due_date" DATE NOT NULL, "status" VARCHAR(30) NOT NULL DEFAULT 'pending', "progress" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ppm_milestones_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ppm_milestones_project_fkey" FOREIGN KEY ("project_id") REFERENCES "ppm_projects"("id") ON DELETE CASCADE
);
CREATE INDEX "ppm_milestones_project_id_idx" ON "ppm_milestones"("project_id");

CREATE TABLE "ppm_project_members" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "project_id" UUID NOT NULL, "user_id" UUID NOT NULL,
  "role" VARCHAR(50) NOT NULL DEFAULT 'member', "allocation" INTEGER NOT NULL DEFAULT 100,
  "joined_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ppm_project_members_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ppm_project_members_unique" UNIQUE ("project_id","user_id"),
  CONSTRAINT "ppm_project_members_project_fkey" FOREIGN KEY ("project_id") REFERENCES "ppm_projects"("id") ON DELETE CASCADE
);
