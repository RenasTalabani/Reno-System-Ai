-- Phase 88: Task & Sprint Board
CREATE TABLE IF NOT EXISTS "tsk_boards" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "type" VARCHAR(20) NOT NULL DEFAULT 'kanban',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "tsk_boards_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tsk_boards_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "tsk_boards_tenant_id_idx" ON "tsk_boards"("tenant_id");

CREATE TABLE IF NOT EXISTS "tsk_columns" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "board_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "color" VARCHAR(20),
  "is_terminal" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "tsk_columns_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tsk_columns_board_fkey" FOREIGN KEY ("board_id") REFERENCES "tsk_boards"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "tsk_columns_board_idx" ON "tsk_columns"("board_id");

CREATE TABLE IF NOT EXISTS "tsk_sprints" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "board_id" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "goal" VARCHAR(1000),
  "starts_at" DATE NOT NULL,
  "ends_at" DATE NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'planned',
  "velocity" INTEGER,
  CONSTRAINT "tsk_sprints_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tsk_sprints_board_fkey" FOREIGN KEY ("board_id") REFERENCES "tsk_boards"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "tsk_sprints_board_idx" ON "tsk_sprints"("board_id");

CREATE TABLE IF NOT EXISTS "tsk_tasks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "board_id" UUID NOT NULL,
  "column_id" UUID,
  "sprint_id" UUID,
  "title" VARCHAR(500) NOT NULL,
  "description" TEXT,
  "type" VARCHAR(20) NOT NULL DEFAULT 'task',
  "priority" VARCHAR(20) NOT NULL DEFAULT 'medium',
  "story_points" INTEGER,
  "assignee_id" UUID,
  "reporter_id" UUID NOT NULL,
  "due_date" DATE,
  "completed_at" TIMESTAMPTZ,
  "order" INTEGER NOT NULL DEFAULT 0,
  "labels" JSONB NOT NULL DEFAULT '[]',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "tsk_tasks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tsk_tasks_board_fkey" FOREIGN KEY ("board_id") REFERENCES "tsk_boards"("id") ON DELETE CASCADE,
  CONSTRAINT "tsk_tasks_column_fkey" FOREIGN KEY ("column_id") REFERENCES "tsk_columns"("id"),
  CONSTRAINT "tsk_tasks_sprint_fkey" FOREIGN KEY ("sprint_id") REFERENCES "tsk_sprints"("id")
);
CREATE INDEX IF NOT EXISTS "tsk_tasks_board_idx" ON "tsk_tasks"("board_id");
CREATE INDEX IF NOT EXISTS "tsk_tasks_board_column_idx" ON "tsk_tasks"("board_id", "column_id");