-- Phase 47: AI Enterprise Knowledge Graph & Semantic Memory

CREATE TABLE "kg_entities" (
  "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID NOT NULL,
  "type"          TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "external_id"   TEXT,
  "external_type" TEXT,
  "summary"       TEXT,
  "importance"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "properties"    JSONB,
  "tags"          TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "is_deleted"    BOOLEAN NOT NULL DEFAULT false,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "kg_entities_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "kg_entities_tenant_id_idx"       ON "kg_entities"("tenant_id");
CREATE INDEX "kg_entities_tenant_type_idx"     ON "kg_entities"("tenant_id", "type");
CREATE INDEX "kg_entities_tenant_external_idx" ON "kg_entities"("tenant_id", "external_id");

CREATE TABLE "kg_relations" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  UUID NOT NULL,
  "from_id"    UUID NOT NULL,
  "to_id"      UUID NOT NULL,
  "type"       TEXT NOT NULL,
  "label"      TEXT,
  "weight"     DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "properties" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "kg_relations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "kg_relations_tenant_id_idx" ON "kg_relations"("tenant_id");
CREATE INDEX "kg_relations_from_id_idx"   ON "kg_relations"("from_id");
CREATE INDEX "kg_relations_to_id_idx"     ON "kg_relations"("to_id");

CREATE TABLE "kg_facts" (
  "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID NOT NULL,
  "content"       TEXT NOT NULL,
  "importance"    TEXT NOT NULL DEFAULT 'medium',
  "source"        TEXT,
  "source_module" TEXT,
  "entity_ids"    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "verified_at"   TIMESTAMPTZ,
  "expires_at"    TIMESTAMPTZ,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "kg_facts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "kg_facts_tenant_id_idx"            ON "kg_facts"("tenant_id");
CREATE INDEX "kg_facts_tenant_importance_idx"    ON "kg_facts"("tenant_id", "importance");

CREATE TABLE "kg_queries" (
  "id"                  UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"           UUID NOT NULL,
  "user_id"             UUID NOT NULL,
  "question"            TEXT NOT NULL,
  "answer"              TEXT,
  "entities_found"      INTEGER NOT NULL DEFAULT 0,
  "relations_traversed" INTEGER NOT NULL DEFAULT 0,
  "duration_ms"         INTEGER,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "kg_queries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "kg_queries_tenant_id_idx" ON "kg_queries"("tenant_id");

ALTER TABLE "kg_entities"  ADD CONSTRAINT "kg_entities_tenant_id_fkey"  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kg_relations" ADD CONSTRAINT "kg_relations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kg_relations" ADD CONSTRAINT "kg_relations_from_id_fkey"   FOREIGN KEY ("from_id")   REFERENCES "kg_entities"("id")  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kg_relations" ADD CONSTRAINT "kg_relations_to_id_fkey"     FOREIGN KEY ("to_id")     REFERENCES "kg_entities"("id")  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kg_facts"     ADD CONSTRAINT "kg_facts_tenant_id_fkey"     FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kg_queries"   ADD CONSTRAINT "kg_queries_tenant_id_fkey"   FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;