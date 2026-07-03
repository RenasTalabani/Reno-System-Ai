-- Phase 82: SOC Dashboard

CREATE TABLE "soc_incidents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "severity" VARCHAR(20) NOT NULL DEFAULT 'medium',
  "status" VARCHAR(30) NOT NULL DEFAULT 'open',
  "category" VARCHAR(50) NOT NULL DEFAULT 'intrusion',
  "assignee" VARCHAR(100),
  "description" TEXT,
  "mttr_minutes" INTEGER,
  "detected_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "resolved_at" TIMESTAMPTZ,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "soc_incidents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "soc_incidents_tenant_id_status_idx" ON "soc_incidents"("tenant_id","status");
ALTER TABLE "soc_incidents" ADD CONSTRAINT "soc_incidents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "soc_alert_rules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "source" VARCHAR(50) NOT NULL DEFAULT 'logs',
  "condition" VARCHAR(500) NOT NULL,
  "severity" VARCHAR(20) NOT NULL DEFAULT 'medium',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "trigger_count" INTEGER NOT NULL DEFAULT 0,
  "last_triggered_at" TIMESTAMPTZ,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "soc_alert_rules_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "soc_alert_rules_tenant_id_idx" ON "soc_alert_rules"("tenant_id");
ALTER TABLE "soc_alert_rules" ADD CONSTRAINT "soc_alert_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "soc_threat_intel" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "indicator" VARCHAR(500) NOT NULL,
  "indicator_type" VARCHAR(30) NOT NULL,
  "threat_type" VARCHAR(50) NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "source" VARCHAR(100),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "expires_at" TIMESTAMPTZ,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "soc_threat_intel_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "soc_threat_intel_tenant_id_indicator_type_idx" ON "soc_threat_intel"("tenant_id","indicator_type");
ALTER TABLE "soc_threat_intel" ADD CONSTRAINT "soc_threat_intel_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "soc_playbooks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "trigger_type" VARCHAR(30) NOT NULL DEFAULT 'manual',
  "steps" JSONB NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "soc_playbooks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "soc_playbooks_tenant_id_idx" ON "soc_playbooks"("tenant_id");
ALTER TABLE "soc_playbooks" ADD CONSTRAINT "soc_playbooks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "soc_playbook_runs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "playbook_id" UUID NOT NULL,
  "incident_id" UUID,
  "status" VARCHAR(30) NOT NULL DEFAULT 'running',
  "steps_total" INTEGER NOT NULL DEFAULT 0,
  "steps_done" INTEGER NOT NULL DEFAULT 0,
  "log" JSONB,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "finished_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "soc_playbook_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "soc_playbook_runs_tenant_id_playbook_id_idx" ON "soc_playbook_runs"("tenant_id","playbook_id");
ALTER TABLE "soc_playbook_runs" ADD CONSTRAINT "soc_playbook_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "soc_playbook_runs" ADD CONSTRAINT "soc_playbook_runs_playbook_id_fkey" FOREIGN KEY ("playbook_id") REFERENCES "soc_playbooks"("id") ON DELETE CASCADE;
ALTER TABLE "soc_playbook_runs" ADD CONSTRAINT "soc_playbook_runs_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "soc_incidents"("id") ON DELETE SET NULL;

CREATE TABLE "soc_shifts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "analyst_name" VARCHAR(100) NOT NULL,
  "shift_type" VARCHAR(20) NOT NULL DEFAULT 'day',
  "starts_at" TIMESTAMPTZ NOT NULL,
  "ends_at" TIMESTAMPTZ NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'scheduled',
  "handoff_notes" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "soc_shifts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "soc_shifts_tenant_id_idx" ON "soc_shifts"("tenant_id");
ALTER TABLE "soc_shifts" ADD CONSTRAINT "soc_shifts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;