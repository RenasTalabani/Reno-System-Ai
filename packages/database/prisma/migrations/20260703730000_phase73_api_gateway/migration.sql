-- Phase 73: API Gateway & Management
-- Models: AgwApi, AgwRoute, AgwConsumer, AgwKey, AgwLog, AgwPolicy

CREATE TABLE "agw_apis" (
  "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID         NOT NULL,
  "created_by"   UUID         NOT NULL,
  "name"         VARCHAR(255) NOT NULL,
  "description"  TEXT,
  "base_path"    VARCHAR(255) NOT NULL,
  "version"      VARCHAR(20)  NOT NULL DEFAULT 'v1',
  "upstream_url" VARCHAR(500) NOT NULL,
  "auth_type"    VARCHAR(50)  NOT NULL DEFAULT 'api_key',
  "rate_limit"   INTEGER      NOT NULL DEFAULT 1000,
  "rate_period"  VARCHAR(20)  NOT NULL DEFAULT 'hour',
  "is_active"    BOOLEAN      NOT NULL DEFAULT TRUE,
  "tags"         JSONB        NOT NULL DEFAULT '[]',
  "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "agw_apis_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agw_apis_tenant_fk" FOREIGN KEY ("tenant_id")
    REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "agw_apis_tenant_idx" ON "agw_apis" ("tenant_id");

CREATE TABLE "agw_routes" (
  "id"            UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID         NOT NULL,
  "api_id"        UUID         NOT NULL,
  "method"        VARCHAR(10)  NOT NULL,
  "path"          VARCHAR(500) NOT NULL,
  "upstream"      VARCHAR(500) NOT NULL,
  "strip_path"    BOOLEAN      NOT NULL DEFAULT FALSE,
  "cache_enabled" BOOLEAN      NOT NULL DEFAULT FALSE,
  "cache_ttl"     INTEGER      NOT NULL DEFAULT 300,
  "timeout"       INTEGER      NOT NULL DEFAULT 30000,
  "is_active"     BOOLEAN      NOT NULL DEFAULT TRUE,
  "hit_count"     INTEGER      NOT NULL DEFAULT 0,
  "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "agw_routes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agw_routes_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "agw_routes_api_fk"    FOREIGN KEY ("api_id")    REFERENCES "agw_apis"("id")     ON DELETE CASCADE
);
CREATE INDEX "agw_routes_tenant_idx" ON "agw_routes" ("tenant_id");
CREATE INDEX "agw_routes_api_idx"    ON "agw_routes" ("api_id");

CREATE TABLE "agw_consumers" (
  "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID         NOT NULL,
  "api_id"       UUID         NOT NULL,
  "name"         VARCHAR(255) NOT NULL,
  "description"  TEXT,
  "quota"        INTEGER      NOT NULL DEFAULT 10000,
  "quota_period" VARCHAR(20)  NOT NULL DEFAULT 'month',
  "usage_count"  INTEGER      NOT NULL DEFAULT 0,
  "is_active"    BOOLEAN      NOT NULL DEFAULT TRUE,
  "last_used_at" TIMESTAMPTZ,
  "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "agw_consumers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agw_consumers_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "agw_consumers_api_fk"    FOREIGN KEY ("api_id")    REFERENCES "agw_apis"("id")     ON DELETE CASCADE
);
CREATE INDEX "agw_consumers_tenant_idx" ON "agw_consumers" ("tenant_id");
CREATE INDEX "agw_consumers_api_idx"    ON "agw_consumers" ("api_id");

CREATE TABLE "agw_keys" (
  "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID         NOT NULL,
  "consumer_id"  UUID         NOT NULL,
  "key_hash"     VARCHAR(128) NOT NULL UNIQUE,
  "key_prefix"   VARCHAR(12)  NOT NULL,
  "name"         VARCHAR(255) NOT NULL,
  "scopes"       JSONB        NOT NULL DEFAULT '[]',
  "expires_at"   TIMESTAMPTZ,
  "last_used_at" TIMESTAMPTZ,
  "hit_count"    INTEGER      NOT NULL DEFAULT 0,
  "is_active"    BOOLEAN      NOT NULL DEFAULT TRUE,
  "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "agw_keys_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agw_keys_tenant_fk"   FOREIGN KEY ("tenant_id")   REFERENCES "core_tenants"("id")   ON DELETE CASCADE,
  CONSTRAINT "agw_keys_consumer_fk" FOREIGN KEY ("consumer_id") REFERENCES "agw_consumers"("id")  ON DELETE CASCADE
);
CREATE INDEX "agw_keys_tenant_idx"  ON "agw_keys" ("tenant_id");
CREATE INDEX "agw_keys_hash_idx"    ON "agw_keys" ("key_hash");

CREATE TABLE "agw_logs" (
  "id"            UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID         NOT NULL,
  "api_id"        UUID         NOT NULL,
  "consumer_id"   UUID,
  "method"        VARCHAR(10)  NOT NULL,
  "path"          VARCHAR(500) NOT NULL,
  "status_code"   INTEGER      NOT NULL,
  "duration_ms"   INTEGER      NOT NULL,
  "request_size"  INTEGER      NOT NULL DEFAULT 0,
  "response_size" INTEGER      NOT NULL DEFAULT 0,
  "ip"            VARCHAR(45),
  "user_agent"    TEXT,
  "error"         TEXT,
  "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "agw_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agw_logs_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "agw_logs_tenant_idx"     ON "agw_logs" ("tenant_id");
CREATE INDEX "agw_logs_tenant_api_idx" ON "agw_logs" ("tenant_id", "api_id");

CREATE TABLE "agw_policies" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID         NOT NULL,
  "api_id"      UUID         NOT NULL,
  "name"        VARCHAR(255) NOT NULL,
  "policy_type" VARCHAR(50)  NOT NULL,
  "config"      JSONB        NOT NULL DEFAULT '{}',
  "order"       INTEGER      NOT NULL DEFAULT 0,
  "is_active"   BOOLEAN      NOT NULL DEFAULT TRUE,
  "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "agw_policies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agw_policies_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "agw_policies_api_fk"    FOREIGN KEY ("api_id")    REFERENCES "agw_apis"("id")     ON DELETE CASCADE
);
CREATE INDEX "agw_policies_tenant_idx" ON "agw_policies" ("tenant_id");
CREATE INDEX "agw_policies_api_idx"    ON "agw_policies" ("api_id");