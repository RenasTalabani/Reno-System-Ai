-- Phase 87: Notifications Hub
CREATE TABLE IF NOT EXISTS "ntf_templates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "channel" VARCHAR(20) NOT NULL,
  "subject" VARCHAR(500),
  "body" TEXT NOT NULL,
  "variables" JSONB NOT NULL DEFAULT '[]',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ntf_templates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ntf_templates_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ntf_templates_tenant_id_idx" ON "ntf_templates"("tenant_id");

CREATE TABLE IF NOT EXISTS "ntf_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "template_id" UUID,
  "channel" VARCHAR(20) NOT NULL,
  "recipient" VARCHAR(500) NOT NULL,
  "subject" VARCHAR(500),
  "body" TEXT,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "sent_at" TIMESTAMPTZ,
  "failed_at" TIMESTAMPTZ,
  "error_msg" VARCHAR(1000),
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ntf_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ntf_logs_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "ntf_logs_template_fkey" FOREIGN KEY ("template_id") REFERENCES "ntf_templates"("id")
);
CREATE INDEX IF NOT EXISTS "ntf_logs_tenant_id_idx" ON "ntf_logs"("tenant_id");