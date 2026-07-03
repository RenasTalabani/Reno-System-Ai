-- Phase 81: Zero Trust Security

CREATE TABLE "zt_policies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "policy_type" VARCHAR(30) NOT NULL DEFAULT 'access',
  "resource" VARCHAR(255) NOT NULL,
  "conditions" JSONB,
  "action" VARCHAR(20) NOT NULL DEFAULT 'allow',
  "priority" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "zt_policies_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "zt_policies_tenant_id_idx" ON "zt_policies"("tenant_id");
ALTER TABLE "zt_policies" ADD CONSTRAINT "zt_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "zt_devices" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "user_id" UUID,
  "name" VARCHAR(100) NOT NULL,
  "device_type" VARCHAR(30) NOT NULL DEFAULT 'laptop',
  "os" VARCHAR(50),
  "trust_level" VARCHAR(30) NOT NULL DEFAULT 'unverified',
  "is_compliant" BOOLEAN NOT NULL DEFAULT false,
  "last_check_at" TIMESTAMPTZ,
  "fingerprint" VARCHAR(255),
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "zt_devices_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "zt_devices_tenant_id_idx" ON "zt_devices"("tenant_id");
ALTER TABLE "zt_devices" ADD CONSTRAINT "zt_devices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "zt_access_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "user_id" UUID,
  "device_id" UUID,
  "policy_id" UUID,
  "resource" VARCHAR(255) NOT NULL,
  "decision" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "risk_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "reason" VARCHAR(500),
  "context" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "zt_access_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "zt_access_requests_tenant_id_idx" ON "zt_access_requests"("tenant_id");
ALTER TABLE "zt_access_requests" ADD CONSTRAINT "zt_access_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "zt_access_requests" ADD CONSTRAINT "zt_access_requests_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "zt_devices"("id") ON DELETE SET NULL;
ALTER TABLE "zt_access_requests" ADD CONSTRAINT "zt_access_requests_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "zt_policies"("id") ON DELETE SET NULL;

CREATE TABLE "zt_segments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "segment_type" VARCHAR(30) NOT NULL DEFAULT 'network',
  "cidr" VARCHAR(50),
  "services" JSONB,
  "isolation" VARCHAR(30) NOT NULL DEFAULT 'strict',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "zt_segments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "zt_segments_tenant_id_idx" ON "zt_segments"("tenant_id");
ALTER TABLE "zt_segments" ADD CONSTRAINT "zt_segments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "zt_session_risks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "user_id" UUID,
  "session_ref" VARCHAR(255),
  "risk_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "risk_level" VARCHAR(20) NOT NULL DEFAULT 'low',
  "factors" JSONB,
  "action" VARCHAR(30) NOT NULL DEFAULT 'none',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "zt_session_risks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "zt_session_risks_tenant_id_idx" ON "zt_session_risks"("tenant_id");
ALTER TABLE "zt_session_risks" ADD CONSTRAINT "zt_session_risks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "zt_violations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "user_id" UUID,
  "violation_type" VARCHAR(50) NOT NULL,
  "severity" VARCHAR(20) NOT NULL DEFAULT 'medium',
  "description" TEXT NOT NULL,
  "is_resolved" BOOLEAN NOT NULL DEFAULT false,
  "resolved_at" TIMESTAMPTZ,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "zt_violations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "zt_violations_tenant_id_idx" ON "zt_violations"("tenant_id");
ALTER TABLE "zt_violations" ADD CONSTRAINT "zt_violations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;