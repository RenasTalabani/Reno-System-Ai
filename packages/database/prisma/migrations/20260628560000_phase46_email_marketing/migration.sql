-- Phase 46: Email Marketing & Campaigns

CREATE TABLE "mkt_email_templates" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID         NOT NULL,
  "name"        VARCHAR(200) NOT NULL,
  "subject"     VARCHAR(500) NOT NULL,
  "html_body"   TEXT         NOT NULL DEFAULT '',
  "text_body"   TEXT,
  "category"    VARCHAR(50)  NOT NULL DEFAULT 'general',
  "tags"        JSONB        NOT NULL DEFAULT '[]',
  "created_by"  UUID,
  "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT "mkt_email_templates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "mkt_email_templates_tenant_idx" ON "mkt_email_templates"("tenant_id");
ALTER TABLE "mkt_email_templates" ADD CONSTRAINT "mkt_email_templates_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "mkt_campaigns" (
  "id"              UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       UUID         NOT NULL,
  "name"            VARCHAR(200) NOT NULL,
  "subject"         VARCHAR(500) NOT NULL,
  "template_id"     UUID,
  "from_name"       VARCHAR(200) NOT NULL DEFAULT 'Reno',
  "from_email"      VARCHAR(255) NOT NULL DEFAULT 'noreply@reno.app',
  "reply_to"        VARCHAR(255),
  "html_body"       TEXT,
  "text_body"       TEXT,
  "segment_ids"     JSONB        NOT NULL DEFAULT '[]',
  "status"          VARCHAR(30)  NOT NULL DEFAULT 'draft',
  "scheduled_at"    TIMESTAMPTZ,
  "sent_at"         TIMESTAMPTZ,
  "total_recipients" INTEGER     NOT NULL DEFAULT 0,
  "sent_count"      INTEGER      NOT NULL DEFAULT 0,
  "open_count"      INTEGER      NOT NULL DEFAULT 0,
  "click_count"     INTEGER      NOT NULL DEFAULT 0,
  "bounce_count"    INTEGER      NOT NULL DEFAULT 0,
  "unsubscribe_count" INTEGER    NOT NULL DEFAULT 0,
  "created_by"      UUID,
  "created_at"      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT "mkt_campaigns_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "mkt_campaigns_tenant_status_idx" ON "mkt_campaigns"("tenant_id", "status");
ALTER TABLE "mkt_campaigns" ADD CONSTRAINT "mkt_campaigns_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "mkt_campaign_sends" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID        NOT NULL,
  "campaign_id"   UUID        NOT NULL,
  "customer_id"   UUID,
  "email"         VARCHAR(255) NOT NULL,
  "status"        VARCHAR(30) NOT NULL DEFAULT 'pending',
  "opened_at"     TIMESTAMPTZ,
  "clicked_at"    TIMESTAMPTZ,
  "bounced_at"    TIMESTAMPTZ,
  "unsubscribed_at" TIMESTAMPTZ,
  "sent_at"       TIMESTAMPTZ,
  "error"         TEXT,
  CONSTRAINT "mkt_campaign_sends_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "mkt_campaign_sends_campaign_idx" ON "mkt_campaign_sends"("campaign_id");
CREATE INDEX "mkt_campaign_sends_email_idx" ON "mkt_campaign_sends"("tenant_id", "email");
ALTER TABLE "mkt_campaign_sends" ADD CONSTRAINT "mkt_campaign_sends_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "mkt_campaign_sends" ADD CONSTRAINT "mkt_campaign_sends_campaign_fkey"
  FOREIGN KEY ("campaign_id") REFERENCES "mkt_campaigns"("id") ON DELETE CASCADE;

CREATE TABLE "mkt_unsubscribes" (
  "tenant_id"   UUID        NOT NULL,
  "email"       VARCHAR(255) NOT NULL,
  "reason"      TEXT,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "mkt_unsubscribes_pkey" PRIMARY KEY ("tenant_id", "email")
);
