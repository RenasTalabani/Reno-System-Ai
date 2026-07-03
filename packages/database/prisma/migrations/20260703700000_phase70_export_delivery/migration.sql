-- Phase 70: Enterprise Export & Document Delivery Engine
-- Models: XpdExportJob, XpdDownloadToken, XpdDelivery, XpdExportSchedule, XpdExportPermission

CREATE TABLE "xpd_export_jobs" (
  "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID        NOT NULL,
  "report_id"    UUID,
  "requested_by" UUID        NOT NULL,
  "format"       VARCHAR(20) NOT NULL,
  "status"       VARCHAR(20) NOT NULL DEFAULT 'pending',
  "file_path"    TEXT,
  "file_name"    TEXT,
  "file_size_kb" INTEGER,
  "mime_type"    VARCHAR(100),
  "error_msg"    TEXT,
  "retry_count"  INTEGER     NOT NULL DEFAULT 0,
  "max_retries"  INTEGER     NOT NULL DEFAULT 3,
  "started_at"   TIMESTAMPTZ,
  "completed_at" TIMESTAMPTZ,
  "expires_at"   TIMESTAMPTZ,
  "metadata"     JSONB       NOT NULL DEFAULT '{}',
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "xpd_export_jobs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "xpd_export_jobs_tenant_fk" FOREIGN KEY ("tenant_id")
    REFERENCES "core_tenants"("id") ON DELETE CASCADE
);

CREATE INDEX "xpd_export_jobs_tenant_idx"        ON "xpd_export_jobs" ("tenant_id");
CREATE INDEX "xpd_export_jobs_tenant_status_idx" ON "xpd_export_jobs" ("tenant_id", "status");
CREATE INDEX "xpd_export_jobs_tenant_report_idx" ON "xpd_export_jobs" ("tenant_id", "report_id");

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TABLE "xpd_download_tokens" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "job_id"      UUID        NOT NULL,
  "token"       VARCHAR(128) NOT NULL,
  "used_at"     TIMESTAMPTZ,
  "used_count"  INTEGER     NOT NULL DEFAULT 0,
  "max_uses"    INTEGER     NOT NULL DEFAULT 10,
  "expires_at"  TIMESTAMPTZ NOT NULL,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "xpd_download_tokens_pkey"  PRIMARY KEY ("id"),
  CONSTRAINT "xpd_download_tokens_token_unique" UNIQUE ("token"),
  CONSTRAINT "xpd_download_tokens_tenant_fk" FOREIGN KEY ("tenant_id")
    REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "xpd_download_tokens_job_fk" FOREIGN KEY ("job_id")
    REFERENCES "xpd_export_jobs"("id") ON DELETE CASCADE
);

CREATE INDEX "xpd_download_tokens_token_idx"  ON "xpd_download_tokens" ("token");
CREATE INDEX "xpd_download_tokens_tenant_idx" ON "xpd_download_tokens" ("tenant_id");

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TABLE "xpd_deliveries" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "job_id"      UUID        NOT NULL,
  "recipient"   VARCHAR(255) NOT NULL,
  "subject"     VARCHAR(500) NOT NULL,
  "status"      VARCHAR(20) NOT NULL DEFAULT 'pending',
  "sent_at"     TIMESTAMPTZ,
  "error_msg"   TEXT,
  "retry_count" INTEGER     NOT NULL DEFAULT 0,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "xpd_deliveries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "xpd_deliveries_tenant_fk" FOREIGN KEY ("tenant_id")
    REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "xpd_deliveries_job_fk" FOREIGN KEY ("job_id")
    REFERENCES "xpd_export_jobs"("id") ON DELETE CASCADE
);

CREATE INDEX "xpd_deliveries_tenant_idx"     ON "xpd_deliveries" ("tenant_id");
CREATE INDEX "xpd_deliveries_tenant_job_idx" ON "xpd_deliveries" ("tenant_id", "job_id");

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TABLE "xpd_export_schedules" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "report_id"   UUID        NOT NULL,
  "created_by"  UUID        NOT NULL,
  "name"        VARCHAR(255) NOT NULL,
  "frequency"   VARCHAR(20) NOT NULL,
  "format"      VARCHAR(20) NOT NULL,
  "recipients"  JSONB       NOT NULL DEFAULT '[]',
  "is_active"   BOOLEAN     NOT NULL DEFAULT TRUE,
  "next_run_at" TIMESTAMPTZ,
  "last_run_at" TIMESTAMPTZ,
  "run_count"   INTEGER     NOT NULL DEFAULT 0,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "xpd_export_schedules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "xpd_export_schedules_tenant_fk" FOREIGN KEY ("tenant_id")
    REFERENCES "core_tenants"("id") ON DELETE CASCADE
);

CREATE INDEX "xpd_export_schedules_tenant_idx"        ON "xpd_export_schedules" ("tenant_id");
CREATE INDEX "xpd_export_schedules_tenant_report_idx" ON "xpd_export_schedules" ("tenant_id", "report_id");

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TABLE "xpd_export_permissions" (
  "id"          UUID    NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID    NOT NULL,
  "report_id"   UUID    NOT NULL,
  "user_id"     UUID,
  "role_id"     UUID,
  "can_export"  BOOLEAN NOT NULL DEFAULT TRUE,
  "can_deliver" BOOLEAN NOT NULL DEFAULT FALSE,
  "formats"     JSONB   NOT NULL DEFAULT '["pdf","excel","csv"]',
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "xpd_export_permissions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "xpd_export_permissions_tenant_fk" FOREIGN KEY ("tenant_id")
    REFERENCES "core_tenants"("id") ON DELETE CASCADE
);

CREATE INDEX "xpd_export_permissions_tenant_report_idx" ON "xpd_export_permissions" ("tenant_id", "report_id");
