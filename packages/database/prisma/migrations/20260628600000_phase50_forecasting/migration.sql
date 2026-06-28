-- Phase 50: AI-Powered Forecasting & Predictive Analytics

CREATE TABLE "fcst_models" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID        NOT NULL,
  "name"          VARCHAR(200) NOT NULL,
  "type"          VARCHAR(50) NOT NULL DEFAULT 'revenue',
  "target_metric" VARCHAR(100) NOT NULL,
  "features"      JSONB       NOT NULL DEFAULT '[]',
  "config"        JSONB       NOT NULL DEFAULT '{}',
  "status"        VARCHAR(20) NOT NULL DEFAULT 'draft',
  "accuracy"      DECIMAL(5,2),
  "last_trained_at" TIMESTAMPTZ,
  "created_by"    UUID,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "fcst_models_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "fcst_models_tenant_idx" ON "fcst_models"("tenant_id", "type");
ALTER TABLE "fcst_models" ADD CONSTRAINT "fcst_models_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "fcst_predictions" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "model_id"    UUID        NOT NULL,
  "period"      VARCHAR(7)  NOT NULL,
  "metric"      VARCHAR(100) NOT NULL,
  "predicted"   DECIMAL(18,4) NOT NULL,
  "actual"      DECIMAL(18,4),
  "lower_bound" DECIMAL(18,4),
  "upper_bound" DECIMAL(18,4),
  "confidence"  DECIMAL(5,2),
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "fcst_predictions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "fcst_predictions_model_period_idx" ON "fcst_predictions"("model_id", "period");
CREATE INDEX "fcst_predictions_tenant_idx" ON "fcst_predictions"("tenant_id", "period" DESC);
ALTER TABLE "fcst_predictions" ADD CONSTRAINT "fcst_predictions_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "fcst_predictions" ADD CONSTRAINT "fcst_predictions_model_fkey"
  FOREIGN KEY ("model_id") REFERENCES "fcst_models"("id") ON DELETE CASCADE;

CREATE TABLE "fcst_anomalies" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "metric"      VARCHAR(100) NOT NULL,
  "period"      VARCHAR(10) NOT NULL,
  "expected"    DECIMAL(18,4) NOT NULL,
  "actual"      DECIMAL(18,4) NOT NULL,
  "deviation"   DECIMAL(8,4) NOT NULL,
  "severity"    VARCHAR(10) NOT NULL DEFAULT 'medium',
  "acknowledged" BOOLEAN    NOT NULL DEFAULT false,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "fcst_anomalies_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "fcst_anomalies_tenant_idx" ON "fcst_anomalies"("tenant_id", "created_at" DESC);
ALTER TABLE "fcst_anomalies" ADD CONSTRAINT "fcst_anomalies_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
