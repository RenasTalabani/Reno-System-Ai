-- Phase 54: Vendor / Supplier Portal

CREATE TABLE "vnd_vendors" (
  "id"              UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       UUID        NOT NULL,
  "name"            VARCHAR(200) NOT NULL,
  "code"            VARCHAR(50),
  "category"        VARCHAR(100),
  "status"          VARCHAR(20) NOT NULL DEFAULT 'active',
  "contact_name"    VARCHAR(200),
  "contact_email"   VARCHAR(255),
  "contact_phone"   VARCHAR(50),
  "website"         VARCHAR(500),
  "address"         TEXT,
  "tax_id"          VARCHAR(100),
  "payment_terms"   INTEGER     NOT NULL DEFAULT 30,
  "currency"        VARCHAR(3)  NOT NULL DEFAULT 'USD',
  "rating"          SMALLINT    NOT NULL DEFAULT 3,
  "notes"           TEXT,
  "tags"            JSONB       NOT NULL DEFAULT '[]',
  "created_by"      UUID,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "vnd_vendors_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "vnd_vendors_tenant_code_idx" ON "vnd_vendors"("tenant_id","code") WHERE "code" IS NOT NULL;
CREATE INDEX "vnd_vendors_tenant_status_idx" ON "vnd_vendors"("tenant_id","status");
ALTER TABLE "vnd_vendors" ADD CONSTRAINT "vnd_vendors_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "vnd_quotes" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "vendor_id"   UUID        NOT NULL,
  "title"       VARCHAR(300) NOT NULL,
  "status"      VARCHAR(20) NOT NULL DEFAULT 'requested',
  "items"       JSONB       NOT NULL DEFAULT '[]',
  "total"       DECIMAL(18,2),
  "currency"    VARCHAR(3)  NOT NULL DEFAULT 'USD',
  "valid_until" DATE,
  "notes"       TEXT,
  "created_by"  UUID,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "vnd_quotes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "vnd_quotes_vendor_idx" ON "vnd_quotes"("vendor_id","status");
ALTER TABLE "vnd_quotes" ADD CONSTRAINT "vnd_quotes_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "vnd_quotes" ADD CONSTRAINT "vnd_quotes_vendor_fkey"
  FOREIGN KEY ("vendor_id") REFERENCES "vnd_vendors"("id") ON DELETE CASCADE;

CREATE TABLE "vnd_performance" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID        NOT NULL,
  "vendor_id"     UUID        NOT NULL,
  "period"        VARCHAR(7)  NOT NULL,
  "on_time_rate"  DECIMAL(5,2) NOT NULL DEFAULT 100,
  "quality_score" DECIMAL(5,2) NOT NULL DEFAULT 100,
  "defect_rate"   DECIMAL(5,2) NOT NULL DEFAULT 0,
  "response_hours" DECIMAL(8,2),
  "po_count"      INTEGER     NOT NULL DEFAULT 0,
  "total_spend"   DECIMAL(18,2) NOT NULL DEFAULT 0,
  "notes"         TEXT,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "vnd_performance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "vnd_performance_vendor_period_idx" ON "vnd_performance"("vendor_id","period");
ALTER TABLE "vnd_performance" ADD CONSTRAINT "vnd_performance_vendor_fkey"
  FOREIGN KEY ("vendor_id") REFERENCES "vnd_vendors"("id") ON DELETE CASCADE;
