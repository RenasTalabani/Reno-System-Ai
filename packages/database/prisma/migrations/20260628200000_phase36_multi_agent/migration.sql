-- Phase 36: Multi-Agent AI Collaboration Platform
-- Creates: ai_agent_teams, ai_agent_conversations, ai_agent_messages,
--          ai_agent_decisions, ai_agent_votes, ai_shared_workspaces,
--          ai_shared_memory, ai_delegations, ai_meetings, ai_meeting_participants

CREATE TABLE "ai_agent_teams" (
  "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        UUID         NOT NULL,
  "name"             VARCHAR(300) NOT NULL,
  "purpose"          TEXT         NOT NULL,
  "supervisor_slug"  VARCHAR(100) NOT NULL,
  "agent_slugs"      JSONB        NOT NULL DEFAULT '[]',
  "status"           VARCHAR(20)  NOT NULL DEFAULT 'active',
  "task_id"          UUID,
  "created_by"       UUID,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_agent_teams_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ai_agent_teams_tenant_id_idx"        ON "ai_agent_teams"("tenant_id");
CREATE INDEX "ai_agent_teams_tenant_status_idx"    ON "ai_agent_teams"("tenant_id", "status");
ALTER TABLE "ai_agent_teams" ADD CONSTRAINT "ai_agent_teams_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE TABLE "ai_agent_conversations" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID         NOT NULL,
  "team_id"     UUID,
  "task_id"     UUID,
  "title"       VARCHAR(500) NOT NULL,
  "topic"       TEXT         NOT NULL,
  "status"      VARCHAR(20)  NOT NULL DEFAULT 'active',
  "summary"     TEXT,
  "outcome"     TEXT,
  "started_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ended_at"    TIMESTAMP(3),
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_agent_conversations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ai_agent_conversations_tenant_created_idx" ON "ai_agent_conversations"("tenant_id", "created_at" DESC);
CREATE INDEX "ai_agent_conversations_team_id_idx"        ON "ai_agent_conversations"("team_id");
ALTER TABLE "ai_agent_conversations" ADD CONSTRAINT "ai_agent_conversations_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "ai_agent_conversations" ADD CONSTRAINT "ai_agent_conversations_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "ai_agent_teams"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE TABLE "ai_agent_messages" (
  "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        UUID         NOT NULL,
  "conversation_id"  UUID         NOT NULL,
  "from_agent_slug"  VARCHAR(100) NOT NULL,
  "to_agent_slug"    VARCHAR(100),
  "message_type"     VARCHAR(30)  NOT NULL,
  "content"          TEXT         NOT NULL,
  "metadata"         JSONB,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_agent_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ai_agent_messages_conversation_id_idx" ON "ai_agent_messages"("conversation_id");
CREATE INDEX "ai_agent_messages_tenant_created_idx"  ON "ai_agent_messages"("tenant_id", "created_at" DESC);
ALTER TABLE "ai_agent_messages" ADD CONSTRAINT "ai_agent_messages_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "ai_agent_conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE TABLE "ai_agent_decisions" (
  "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        UUID         NOT NULL,
  "conversation_id"  UUID         NOT NULL,
  "title"            VARCHAR(500) NOT NULL,
  "description"      TEXT         NOT NULL,
  "decided_by"       VARCHAR(100) NOT NULL,
  "status"           VARCHAR(20)  NOT NULL DEFAULT 'pending',
  "outcome"          TEXT,
  "evidence"         JSONB,
  "proposal_id"      UUID,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_agent_decisions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ai_agent_decisions_conversation_id_idx" ON "ai_agent_decisions"("conversation_id");
CREATE INDEX "ai_agent_decisions_tenant_id_idx"       ON "ai_agent_decisions"("tenant_id");
ALTER TABLE "ai_agent_decisions" ADD CONSTRAINT "ai_agent_decisions_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "ai_agent_conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE TABLE "ai_agent_votes" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID         NOT NULL,
  "decision_id" UUID         NOT NULL,
  "agent_slug"  VARCHAR(100) NOT NULL,
  "vote"        VARCHAR(10)  NOT NULL,
  "reasoning"   TEXT,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_agent_votes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_agent_votes_decision_agent_unique" UNIQUE ("decision_id", "agent_slug")
);
CREATE INDEX "ai_agent_votes_decision_id_idx" ON "ai_agent_votes"("decision_id");
ALTER TABLE "ai_agent_votes" ADD CONSTRAINT "ai_agent_votes_decision_id_fkey"
  FOREIGN KEY ("decision_id") REFERENCES "ai_agent_decisions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE TABLE "ai_shared_workspaces" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  UUID         NOT NULL,
  "task_id"    UUID,
  "team_id"    UUID,
  "name"       VARCHAR(300) NOT NULL,
  "content"    JSONB        NOT NULL DEFAULT '{}',
  "created_by" VARCHAR(100) NOT NULL,
  "updated_by" VARCHAR(100),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_shared_workspaces_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ai_shared_workspaces_tenant_id_idx" ON "ai_shared_workspaces"("tenant_id");
CREATE INDEX "ai_shared_workspaces_task_id_idx"   ON "ai_shared_workspaces"("task_id");

CREATE TABLE "ai_shared_memory" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID         NOT NULL,
  "scope"       VARCHAR(20)  NOT NULL DEFAULT 'global',
  "key"         VARCHAR(200) NOT NULL,
  "value"       JSONB        NOT NULL,
  "agent_slug"  VARCHAR(100) NOT NULL,
  "expires_at"  TIMESTAMP(3),
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_shared_memory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_shared_memory_tenant_scope_key_unique" UNIQUE ("tenant_id", "scope", "key")
);
CREATE INDEX "ai_shared_memory_tenant_scope_idx" ON "ai_shared_memory"("tenant_id", "scope");
ALTER TABLE "ai_shared_memory" ADD CONSTRAINT "ai_shared_memory_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE TABLE "ai_delegations" (
  "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        UUID         NOT NULL,
  "from_agent_slug"  VARCHAR(100) NOT NULL,
  "to_agent_slug"    VARCHAR(100) NOT NULL,
  "task_id"          UUID,
  "conversation_id"  UUID,
  "delegation_type"  VARCHAR(30)  NOT NULL,
  "request"          TEXT         NOT NULL,
  "response"         TEXT,
  "status"           VARCHAR(20)  NOT NULL DEFAULT 'pending',
  "duration_ms"      INTEGER,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at"     TIMESTAMP(3),
  CONSTRAINT "ai_delegations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ai_delegations_tenant_created_idx" ON "ai_delegations"("tenant_id", "created_at" DESC);
CREATE INDEX "ai_delegations_task_id_idx"        ON "ai_delegations"("task_id");
CREATE INDEX "ai_delegations_to_agent_idx"       ON "ai_delegations"("to_agent_slug");
ALTER TABLE "ai_delegations" ADD CONSTRAINT "ai_delegations_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE TABLE "ai_meetings" (
  "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        UUID         NOT NULL,
  "title"            VARCHAR(500) NOT NULL,
  "agenda"           TEXT         NOT NULL,
  "status"           VARCHAR(20)  NOT NULL DEFAULT 'scheduled',
  "task_id"          UUID,
  "conversation_id"  UUID,
  "summary"          TEXT,
  "decisions_count"  INTEGER      NOT NULL DEFAULT 0,
  "started_at"       TIMESTAMP(3),
  "ended_at"         TIMESTAMP(3),
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_meetings_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ai_meetings_tenant_created_idx" ON "ai_meetings"("tenant_id", "created_at" DESC);
CREATE INDEX "ai_meetings_tenant_status_idx"  ON "ai_meetings"("tenant_id", "status");
ALTER TABLE "ai_meetings" ADD CONSTRAINT "ai_meetings_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE TABLE "ai_meeting_participants" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "meeting_id" UUID         NOT NULL,
  "agent_slug" VARCHAR(100) NOT NULL,
  "role"       VARCHAR(20)  NOT NULL DEFAULT 'member',
  "joined_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "left_at"    TIMESTAMP(3),
  CONSTRAINT "ai_meeting_participants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_meeting_participants_meeting_agent_unique" UNIQUE ("meeting_id", "agent_slug")
);
CREATE INDEX "ai_meeting_participants_meeting_id_idx" ON "ai_meeting_participants"("meeting_id");
ALTER TABLE "ai_meeting_participants" ADD CONSTRAINT "ai_meeting_participants_meeting_id_fkey"
  FOREIGN KEY ("meeting_id") REFERENCES "ai_meetings"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
