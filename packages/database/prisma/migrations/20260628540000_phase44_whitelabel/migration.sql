-- Phase 44: White-Label & Theme Studio

CREATE TABLE "wl_themes" (
  "id"              UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       UUID        NOT NULL,
  "name"            VARCHAR(100) NOT NULL,
  "is_active"       BOOLEAN     NOT NULL DEFAULT false,
  "colors"          JSONB       NOT NULL DEFAULT '{}',
  "typography"      JSONB       NOT NULL DEFAULT '{}',
  "radius"          JSONB       NOT NULL DEFAULT '{}',
  "custom_css"      TEXT,
  "logo_url"        TEXT,
  "favicon_url"     TEXT,
  "created_by"      UUID,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "wl_themes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "wl_themes_tenant_id_idx" ON "wl_themes"("tenant_id");

ALTER TABLE "wl_themes" ADD CONSTRAINT "wl_themes_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "wl_domain_mappings" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "domain"      VARCHAR(255) NOT NULL,
  "is_primary"  BOOLEAN     NOT NULL DEFAULT false,
  "ssl_status"  VARCHAR(30) NOT NULL DEFAULT 'pending',
  "verified_at" TIMESTAMPTZ,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "wl_domain_mappings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wl_domain_mappings_domain_key" UNIQUE ("domain")
);
CREATE INDEX "wl_domain_mappings_tenant_idx" ON "wl_domain_mappings"("tenant_id");
ALTER TABLE "wl_domain_mappings" ADD CONSTRAINT "wl_domain_mappings_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

-- Seed a default theme for demo tenant
INSERT INTO "wl_themes" ("tenant_id", "name", "is_active", "colors", "typography", "radius")
SELECT id,
  'Reno Default', true,
  '{"primary":"#6366f1","background":"#09090b","card":"#18181b","border":"#27272a","foreground":"#fafafa","muted":"#27272a","mutedForeground":"#a1a1aa","accent":"#6366f1","destructive":"#ef4444","success":"#22c55e"}'::jsonb,
  '{"fontFamily":"Inter, sans-serif","fontSize":"14px"}'::jsonb,
  '{"sm":"4px","md":"8px","lg":"12px","xl":"16px","full":"9999px"}'::jsonb
FROM core_tenants WHERE slug = 'demo';
