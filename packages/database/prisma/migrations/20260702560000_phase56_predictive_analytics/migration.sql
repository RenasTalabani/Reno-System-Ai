-- Phase 56: AI Predictive Analytics & Forecasting Engine

CREATE TABLE "public"."apa_datasets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "data_type" TEXT NOT NULL DEFAULT 'timeseries',
  "source" TEXT NOT NULL DEFAULT 'manual',
  "row_count" INTEGER NOT NULL DEFAULT 0,
  "columns" JSONB NOT NULL DEFAULT '[]',
  "sample_data" JSONB NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'ready',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "apa_datasets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "apa_datasets_tenant_id_slug_key" UNIQUE ("tenant_id", "slug")
);
CREATE INDEX "apa_datasets_tenant_id_idx" ON "public"."apa_datasets"("tenant_id");
ALTER TABLE "public"."apa_datasets" ADD CONSTRAINT "apa_datasets_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "public"."apa_models" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "dataset_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "algorithm_type" TEXT NOT NULL,
  "target_column" TEXT NOT NULL,
  "feature_columns" JSONB NOT NULL DEFAULT '[]',
  "hyperparams" JSONB NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'untrained',
  "accuracy" DOUBLE PRECISION,
  "mae_score" DOUBLE PRECISION,
  "rmse_score" DOUBLE PRECISION,
  "r2_score" DOUBLE PRECISION,
  "trained_at" TIMESTAMPTZ,
  "training_ms" INTEGER,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "apa_models_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "apa_models_tenant_id_idx" ON "public"."apa_models"("tenant_id");
ALTER TABLE "public"."apa_models" ADD CONSTRAINT "apa_models_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "public"."apa_models" ADD CONSTRAINT "apa_models_dataset_id_fkey"
  FOREIGN KEY ("dataset_id") REFERENCES "public"."apa_datasets"("id") ON DELETE CASCADE;

CREATE TABLE "public"."apa_forecasts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "model_id" UUID NOT NULL,
  "dataset_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "horizon" INTEGER NOT NULL DEFAULT 30,
  "granularity" TEXT NOT NULL DEFAULT 'daily',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "predictions" JSONB NOT NULL DEFAULT '[]',
  "confidence_low" JSONB NOT NULL DEFAULT '[]',
  "confidence_high" JSONB NOT NULL DEFAULT '[]',
  "insights" JSONB NOT NULL DEFAULT '[]',
  "ai_summary" TEXT,
  "run_at" TIMESTAMPTZ,
  "run_ms" INTEGER,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "apa_forecasts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "apa_forecasts_tenant_id_idx" ON "public"."apa_forecasts"("tenant_id");
ALTER TABLE "public"."apa_forecasts" ADD CONSTRAINT "apa_forecasts_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "public"."apa_forecasts" ADD CONSTRAINT "apa_forecasts_model_id_fkey"
  FOREIGN KEY ("model_id") REFERENCES "public"."apa_models"("id") ON DELETE CASCADE;
ALTER TABLE "public"."apa_forecasts" ADD CONSTRAINT "apa_forecasts_dataset_id_fkey"
  FOREIGN KEY ("dataset_id") REFERENCES "public"."apa_datasets"("id") ON DELETE CASCADE;

CREATE TABLE "public"."apa_predictions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "forecast_id" UUID NOT NULL,
  "period" TEXT NOT NULL,
  "predicted_at" TIMESTAMPTZ NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "lower_bound" DOUBLE PRECISION NOT NULL,
  "upper_bound" DOUBLE PRECISION NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.95,
  "is_anomaly" BOOLEAN NOT NULL DEFAULT false,
  "anomaly_score" DOUBLE PRECISION,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "apa_predictions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "apa_predictions_tenant_id_idx" ON "public"."apa_predictions"("tenant_id");
ALTER TABLE "public"."apa_predictions" ADD CONSTRAINT "apa_predictions_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "public"."apa_predictions" ADD CONSTRAINT "apa_predictions_forecast_id_fkey"
  FOREIGN KEY ("forecast_id") REFERENCES "public"."apa_forecasts"("id") ON DELETE CASCADE;