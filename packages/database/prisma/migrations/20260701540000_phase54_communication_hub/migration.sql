-- Phase 54: AI Multi-Channel Communication Hub

CREATE TABLE "mch_channels" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID NOT NULL,
  "name"         TEXT NOT NULL,
  "channel_type" TEXT NOT NULL,
  "config"       JSONB NOT NULL DEFAULT '{}',
  "is_active"    BOOLEAN NOT NULL DEFAULT TRUE,
  "total_sent"   INTEGER NOT NULL DEFAULT 0,
  "total_failed" INTEGER NOT NULL DEFAULT 0,
  "last_used_at" TIMESTAMPTZ,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "mch_channels_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "mch_channels_tenant_id_idx" ON "mch_channels"("tenant_id");
ALTER TABLE "mch_channels" ADD CONSTRAINT "mch_channels_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "mch_conversations" (
  "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        UUID NOT NULL,
  "channel_type"     TEXT NOT NULL,
  "external_ref"     TEXT,
  "participant_ref"  TEXT NOT NULL,
  "status"           TEXT NOT NULL DEFAULT 'active',
  "subject"          TEXT,
  "last_message_at"  TIMESTAMPTZ,
  "message_count"    INTEGER NOT NULL DEFAULT 0,
  "metadata"         JSONB NOT NULL DEFAULT '{}',
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "mch_conversations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "mch_conversations_tenant_id_idx" ON "mch_conversations"("tenant_id");
ALTER TABLE "mch_conversations" ADD CONSTRAINT "mch_conversations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "mch_messages" (
  "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        UUID NOT NULL,
  "channel_id"       UUID,
  "conversation_id"  UUID,
  "campaign_id"      UUID,
  "direction"        TEXT NOT NULL DEFAULT 'outbound',
  "channel_type"     TEXT NOT NULL,
  "from_address"     TEXT NOT NULL,
  "to_address"       TEXT NOT NULL,
  "subject"          TEXT,
  "body"             TEXT NOT NULL,
  "body_html"        TEXT,
  "status"           TEXT NOT NULL DEFAULT 'queued',
  "delivered_at"     TIMESTAMPTZ,
  "opened_at"        TIMESTAMPTZ,
  "clicked_at"       TIMESTAMPTZ,
  "failure_reason"   TEXT,
  "ai_generated"     BOOLEAN NOT NULL DEFAULT FALSE,
  "template_id"      UUID,
  "metadata"         JSONB NOT NULL DEFAULT '{}',
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "mch_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "mch_messages_tenant_id_idx" ON "mch_messages"("tenant_id");
CREATE INDEX "mch_messages_channel_id_idx" ON "mch_messages"("channel_id");
CREATE INDEX "mch_messages_conversation_id_idx" ON "mch_messages"("conversation_id");
ALTER TABLE "mch_messages" ADD CONSTRAINT "mch_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "mch_messages" ADD CONSTRAINT "mch_messages_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "mch_channels"("id") ON DELETE SET NULL;
ALTER TABLE "mch_messages" ADD CONSTRAINT "mch_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "mch_conversations"("id") ON DELETE SET NULL;

CREATE TABLE "mch_campaigns" (
  "id"                UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"         UUID NOT NULL,
  "name"              TEXT NOT NULL,
  "slug"              TEXT NOT NULL,
  "channel_type"      TEXT NOT NULL,
  "status"            TEXT NOT NULL DEFAULT 'draft',
  "subject"           TEXT,
  "body_template"     TEXT NOT NULL,
  "audience"          JSONB NOT NULL DEFAULT '{}',
  "scheduled_at"      TIMESTAMPTZ,
  "sent_at"           TIMESTAMPTZ,
  "total_recipients"  INTEGER NOT NULL DEFAULT 0,
  "total_sent"        INTEGER NOT NULL DEFAULT 0,
  "total_delivered"   INTEGER NOT NULL DEFAULT 0,
  "total_opened"      INTEGER NOT NULL DEFAULT 0,
  "total_clicked"     INTEGER NOT NULL DEFAULT 0,
  "total_failed"      INTEGER NOT NULL DEFAULT 0,
  "ai_optimized"      BOOLEAN NOT NULL DEFAULT FALSE,
  "created_by"        UUID NOT NULL,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "mch_campaigns_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "mch_campaigns_tenant_slug_key" ON "mch_campaigns"("tenant_id","slug");
CREATE INDEX "mch_campaigns_tenant_id_idx" ON "mch_campaigns"("tenant_id");
ALTER TABLE "mch_campaigns" ADD CONSTRAINT "mch_campaigns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "mch_templates" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID NOT NULL,
  "name"         TEXT NOT NULL,
  "slug"         TEXT NOT NULL,
  "channel_type" TEXT NOT NULL,
  "category"     TEXT NOT NULL DEFAULT 'general',
  "subject"      TEXT,
  "body"         TEXT NOT NULL,
  "body_html"    TEXT,
  "variables"    JSONB NOT NULL DEFAULT '[]',
  "is_active"    BOOLEAN NOT NULL DEFAULT TRUE,
  "times_used"   INTEGER NOT NULL DEFAULT 0,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "mch_templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "mch_templates_tenant_slug_key" ON "mch_templates"("tenant_id","slug");
CREATE INDEX "mch_templates_tenant_id_idx" ON "mch_templates"("tenant_id");
ALTER TABLE "mch_templates" ADD CONSTRAINT "mch_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;