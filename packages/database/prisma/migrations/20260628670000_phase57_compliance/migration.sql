-- Phase 57: Compliance & Audit Framework

CREATE TABLE "cmp_frameworks" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "name"        VARCHAR(200) NOT NULL,
  "version"     VARCHAR(50),
  "type"        VARCHAR(50) NOT NULL DEFAULT 'custom',
  "description" TEXT,
  "status"      VARCHAR(20) NOT NULL DEFAULT 'active',
  "due_date"    DATE,
  "owner_id"    UUID,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "cmp_frameworks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cmp_frameworks_tenant_idx" ON "cmp_frameworks"("tenant_id","status");
ALTER TABLE "cmp_frameworks" ADD CONSTRAINT "cmp_frameworks_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "cmp_controls" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID        NOT NULL,
  "framework_id"  UUID        NOT NULL,
  "code"          VARCHAR(50) NOT NULL,
  "title"         VARCHAR(300) NOT NULL,
  "description"   TEXT,
  "category"      VARCHAR(100),
  "status"        VARCHAR(20) NOT NULL DEFAULT 'not_started',
  "risk_level"    VARCHAR(20) NOT NULL DEFAULT 'medium',
  "evidence"      JSONB       NOT NULL DEFAULT '[]',
  "owner_id"      UUID,
  "due_date"      DATE,
  "last_review"   DATE,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "cmp_controls_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cmp_controls_framework_code_idx" ON "cmp_controls"("framework_id","code");
CREATE INDEX "cmp_controls_tenant_status_idx" ON "cmp_controls"("tenant_id","status");
ALTER TABLE "cmp_controls" ADD CONSTRAINT "cmp_controls_framework_fkey"
  FOREIGN KEY ("framework_id") REFERENCES "cmp_frameworks"("id") ON DELETE CASCADE;

CREATE TABLE "cmp_risk_register" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID        NOT NULL,
  "title"         VARCHAR(300) NOT NULL,
  "description"   TEXT,
  "category"      VARCHAR(100),
  "likelihood"    SMALLINT    NOT NULL DEFAULT 3,
  "impact"        SMALLINT    NOT NULL DEFAULT 3,
  "risk_score"    SMALLINT    GENERATED ALWAYS AS ("likelihood" * "impact") STORED,
  "status"        VARCHAR(20) NOT NULL DEFAULT 'open',
  "mitigation"    TEXT,
  "owner_id"      UUID,
  "review_date"   DATE,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "cmp_risk_register_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cmp_risk_register_tenant_idx" ON "cmp_risk_register"("tenant_id","status");
ALTER TABLE "cmp_risk_register" ADD CONSTRAINT "cmp_risk_register_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "cmp_audit_findings" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID        NOT NULL,
  "control_id"    UUID,
  "title"         VARCHAR(300) NOT NULL,
  "description"   TEXT,
  "severity"      VARCHAR(20) NOT NULL DEFAULT 'medium',
  "status"        VARCHAR(20) NOT NULL DEFAULT 'open',
  "remediation"   TEXT,
  "due_date"      DATE,
  "closed_at"     TIMESTAMPTZ,
  "created_by"    UUID,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "cmp_audit_findings_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cmp_audit_findings_tenant_idx" ON "cmp_audit_findings"("tenant_id","status");
ALTER TABLE "cmp_audit_findings" ADD CONSTRAINT "cmp_audit_findings_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "cmp_audit_findings" ADD CONSTRAINT "cmp_audit_findings_control_fkey"
  FOREIGN KEY ("control_id") REFERENCES "cmp_controls"("id") ON DELETE SET NULL;
