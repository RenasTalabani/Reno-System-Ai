-- Phase 38: AI Workspace & Computer Assistant
-- Creates workspace sessions, messages, memory and command tables

CREATE TABLE IF NOT EXISTS "ai_workspace_sessions" (
  "id"            UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID         NOT NULL,
  "user_id"       UUID         NOT NULL,
  "title"         VARCHAR(300),
  "context"       JSONB,
  "total_tokens"  INTEGER      NOT NULL DEFAULT 0,
  "message_count" INTEGER      NOT NULL DEFAULT 0,
  "last_active_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "ai_workspace_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_workspace_sessions_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE INDEX IF NOT EXISTS "ai_workspace_sessions_tenant_user_idx" ON "ai_workspace_sessions"("tenant_id", "user_id", "last_active_at" DESC);

CREATE TABLE IF NOT EXISTS "ai_workspace_messages" (
  "id"                UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"         UUID         NOT NULL,
  "session_id"        UUID         NOT NULL,
  "role"              VARCHAR(20)  NOT NULL,
  "content"           TEXT         NOT NULL,
  "command_type"      VARCHAR(100),
  "result"            JSONB,
  "tokens_used"       INTEGER,
  "provider"          VARCHAR(50)  NOT NULL DEFAULT 'mock',
  "requires_approval" BOOLEAN      NOT NULL DEFAULT FALSE,
  "approved"          BOOLEAN,
  "approved_by"       UUID,
  "created_at"        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "ai_workspace_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_workspace_messages_session_fkey" FOREIGN KEY ("session_id") REFERENCES "ai_workspace_sessions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE INDEX IF NOT EXISTS "ai_workspace_messages_session_idx" ON "ai_workspace_messages"("tenant_id", "session_id", "created_at");

CREATE TABLE IF NOT EXISTS "ai_workspace_memory" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  UUID         NOT NULL,
  "user_id"    UUID         NOT NULL,
  "scope"      VARCHAR(50)  NOT NULL DEFAULT 'user',
  "mem_key"    VARCHAR(200) NOT NULL,
  "mem_value"  JSONB        NOT NULL,
  "source"     VARCHAR(100),
  "expires_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "ai_workspace_memory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_workspace_memory_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "ai_workspace_memory_unique" UNIQUE ("tenant_id", "user_id", "scope", "mem_key")
);
CREATE INDEX IF NOT EXISTS "ai_workspace_memory_user_idx" ON "ai_workspace_memory"("tenant_id", "user_id");

CREATE TABLE IF NOT EXISTS "ai_workspace_commands" (
  "id"                UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"         UUID        NOT NULL,
  "user_id"           UUID        NOT NULL,
  "session_id"        UUID,
  "prompt"            TEXT        NOT NULL,
  "command_type"      VARCHAR(100) NOT NULL,
  "status"            VARCHAR(30) NOT NULL DEFAULT 'pending',
  "result"            JSONB,
  "requires_approval" BOOLEAN     NOT NULL DEFAULT FALSE,
  "approved_by"       UUID,
  "approved_at"       TIMESTAMPTZ,
  "executed_at"       TIMESTAMPTZ,
  "error"             TEXT,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ai_workspace_commands_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_workspace_commands_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE INDEX IF NOT EXISTS "ai_workspace_commands_user_idx" ON "ai_workspace_commands"("tenant_id", "user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "ai_workspace_commands_status_idx" ON "ai_workspace_commands"("tenant_id", "status");
