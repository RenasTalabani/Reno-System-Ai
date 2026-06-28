-- Phase 45: Customer Data Platform (CDP)

CREATE TABLE "cdp_customers" (
  "id"              UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       UUID        NOT NULL,
  "external_id"     VARCHAR(255),
  "email"           VARCHAR(255),
  "phone"           VARCHAR(50),
  "first_name"      VARCHAR(150),
  "last_name"       VARCHAR(150),
  "company"         VARCHAR(255),
  "lifecycle_stage" VARCHAR(50) NOT NULL DEFAULT 'lead',
  "health_score"    SMALLINT    NOT NULL DEFAULT 50,
  "ltv"             DECIMAL(15,2) NOT NULL DEFAULT 0,
  "tags"            JSONB       NOT NULL DEFAULT '[]',
  "traits"          JSONB       NOT NULL DEFAULT '{}',
  "first_seen_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "last_seen_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "deleted_at"      TIMESTAMPTZ,
  CONSTRAINT "cdp_customers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cdp_customers_tenant_email_idx" ON "cdp_customers"("tenant_id", "email") WHERE "email" IS NOT NULL;
CREATE INDEX "cdp_customers_tenant_stage_idx" ON "cdp_customers"("tenant_id", "lifecycle_stage");
CREATE INDEX "cdp_customers_tenant_health_idx" ON "cdp_customers"("tenant_id", "health_score" DESC);
ALTER TABLE "cdp_customers" ADD CONSTRAINT "cdp_customers_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "cdp_events" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "customer_id" UUID        NOT NULL,
  "event"       VARCHAR(100) NOT NULL,
  "source"      VARCHAR(50) NOT NULL DEFAULT 'web',
  "properties"  JSONB       NOT NULL DEFAULT '{}',
  "session_id"  VARCHAR(255),
  "ip_address"  VARCHAR(45),
  "user_agent"  TEXT,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "cdp_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cdp_events_customer_idx" ON "cdp_events"("customer_id", "created_at" DESC);
CREATE INDEX "cdp_events_tenant_event_idx" ON "cdp_events"("tenant_id", "event", "created_at" DESC);
ALTER TABLE "cdp_events" ADD CONSTRAINT "cdp_events_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "cdp_events" ADD CONSTRAINT "cdp_events_customer_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "cdp_customers"("id") ON DELETE CASCADE;

CREATE TABLE "cdp_segments" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "name"        VARCHAR(100) NOT NULL,
  "description" TEXT,
  "rules"       JSONB       NOT NULL DEFAULT '[]',
  "operator"    VARCHAR(10) NOT NULL DEFAULT 'AND',
  "is_dynamic"  BOOLEAN     NOT NULL DEFAULT true,
  "member_count" INTEGER    NOT NULL DEFAULT 0,
  "last_computed_at" TIMESTAMPTZ,
  "created_by"  UUID,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "cdp_segments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cdp_segments_tenant_idx" ON "cdp_segments"("tenant_id");
ALTER TABLE "cdp_segments" ADD CONSTRAINT "cdp_segments_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "cdp_segment_members" (
  "segment_id"  UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "added_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "cdp_segment_members_pkey" PRIMARY KEY ("segment_id", "customer_id")
);
ALTER TABLE "cdp_segment_members" ADD CONSTRAINT "cdp_seg_members_seg_fkey"
  FOREIGN KEY ("segment_id") REFERENCES "cdp_segments"("id") ON DELETE CASCADE;
ALTER TABLE "cdp_segment_members" ADD CONSTRAINT "cdp_seg_members_cust_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "cdp_customers"("id") ON DELETE CASCADE;
