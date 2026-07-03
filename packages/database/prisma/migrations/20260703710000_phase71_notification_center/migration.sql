-- Phase 71: Advanced Notification Center
-- Models: NtcTemplate, NtcRule, NtcPreference, NtcBroadcast, NtcChannel, NtcDigest

CREATE TABLE "ntc_templates" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID         NOT NULL,
  "name"        VARCHAR(255) NOT NULL,
  "description" TEXT,
  "event_type"  VARCHAR(100) NOT NULL,
  "channels"    JSONB        NOT NULL DEFAULT '["in_app"]',
  "title_tpl"   VARCHAR(500) NOT NULL,
  "body_tpl"    TEXT         NOT NULL,
  "variables"   JSONB        NOT NULL DEFAULT '[]',
  "priority"    VARCHAR(20)  NOT NULL DEFAULT 'normal',
  "is_active"   BOOLEAN      NOT NULL DEFAULT TRUE,
  "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ntc_templates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ntc_templates_tenant_fk" FOREIGN KEY ("tenant_id")
    REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "ntc_templates_tenant_idx"       ON "ntc_templates" ("tenant_id");
CREATE INDEX "ntc_templates_tenant_event_idx" ON "ntc_templates" ("tenant_id", "event_type");

CREATE TABLE "ntc_rules" (
  "id"                  UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"           UUID         NOT NULL,
  "template_id"         UUID         NOT NULL,
  "name"                VARCHAR(255) NOT NULL,
  "trigger_type"        VARCHAR(100) NOT NULL,
  "conditions"          JSONB        NOT NULL DEFAULT '{}',
  "target_type"         VARCHAR(50)  NOT NULL,
  "target_ids"          JSONB        NOT NULL DEFAULT '[]',
  "is_active"           BOOLEAN      NOT NULL DEFAULT TRUE,
  "run_count"           INTEGER      NOT NULL DEFAULT 0,
  "last_triggered_at"   TIMESTAMPTZ,
  "created_at"          TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ntc_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ntc_rules_tenant_fk"   FOREIGN KEY ("tenant_id")   REFERENCES "core_tenants"("id")  ON DELETE CASCADE,
  CONSTRAINT "ntc_rules_template_fk" FOREIGN KEY ("template_id") REFERENCES "ntc_templates"("id") ON DELETE CASCADE
);
CREATE INDEX "ntc_rules_tenant_idx"         ON "ntc_rules" ("tenant_id");
CREATE INDEX "ntc_rules_tenant_trigger_idx" ON "ntc_rules" ("tenant_id", "trigger_type");

CREATE TABLE "ntc_preferences" (
  "id"                UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"         UUID        NOT NULL,
  "user_id"           UUID        NOT NULL,
  "in_app"            BOOLEAN     NOT NULL DEFAULT TRUE,
  "email"             BOOLEAN     NOT NULL DEFAULT TRUE,
  "push"              BOOLEAN     NOT NULL DEFAULT FALSE,
  "sms"               BOOLEAN     NOT NULL DEFAULT FALSE,
  "digest_mode"       BOOLEAN     NOT NULL DEFAULT FALSE,
  "digest_frequency"  VARCHAR(20) NOT NULL DEFAULT 'daily',
  "quiet_hours_start" INTEGER,
  "quiet_hours_end"   INTEGER,
  "muted_types"       JSONB       NOT NULL DEFAULT '[]',
  "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ntc_preferences_pkey"    PRIMARY KEY ("id"),
  CONSTRAINT "ntc_preferences_unique"  UNIQUE ("tenant_id", "user_id"),
  CONSTRAINT "ntc_preferences_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "ntc_preferences_tenant_idx" ON "ntc_preferences" ("tenant_id");

CREATE TABLE "ntc_broadcasts" (
  "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID         NOT NULL,
  "created_by"   UUID         NOT NULL,
  "title"        VARCHAR(500) NOT NULL,
  "body"         TEXT         NOT NULL,
  "priority"     VARCHAR(20)  NOT NULL DEFAULT 'normal',
  "channels"     JSONB        NOT NULL DEFAULT '["in_app"]',
  "target_type"  VARCHAR(50)  NOT NULL DEFAULT 'all',
  "target_ids"   JSONB        NOT NULL DEFAULT '[]',
  "sent_count"   INTEGER      NOT NULL DEFAULT 0,
  "scheduled_at" TIMESTAMPTZ,
  "sent_at"      TIMESTAMPTZ,
  "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ntc_broadcasts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ntc_broadcasts_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "ntc_broadcasts_tenant_idx" ON "ntc_broadcasts" ("tenant_id");

CREATE TABLE "ntc_channels" (
  "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID         NOT NULL,
  "channel_type" VARCHAR(50)  NOT NULL,
  "name"         VARCHAR(255) NOT NULL,
  "config"       JSONB        NOT NULL DEFAULT '{}',
  "is_active"    BOOLEAN      NOT NULL DEFAULT TRUE,
  "test_sent_at" TIMESTAMPTZ,
  "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ntc_channels_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ntc_channels_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "ntc_channels_tenant_idx" ON "ntc_channels" ("tenant_id");

CREATE TABLE "ntc_digests" (
  "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID        NOT NULL,
  "user_id"      UUID        NOT NULL,
  "frequency"    VARCHAR(20) NOT NULL,
  "items"        JSONB       NOT NULL DEFAULT '[]',
  "status"       VARCHAR(20) NOT NULL DEFAULT 'pending',
  "scheduled_at" TIMESTAMPTZ NOT NULL,
  "sent_at"      TIMESTAMPTZ,
  "item_count"   INTEGER     NOT NULL DEFAULT 0,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ntc_digests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ntc_digests_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "ntc_digests_tenant_user_idx"   ON "ntc_digests" ("tenant_id", "user_id");
CREATE INDEX "ntc_digests_tenant_status_idx" ON "ntc_digests" ("tenant_id", "status");
