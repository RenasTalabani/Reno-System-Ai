-- Phase 41: pgvector — Semantic Search Infrastructure
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Unified vector embedding store (reuses AiVectorEmbedding from Phase 29 but adds fast IVFFlat index)
-- Check if index already exists before creating
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'ai_vector_embeddings_embedding_ivfflat_idx'
  ) THEN
    -- IVFFlat index for fast approximate nearest-neighbour search
    -- lists=100 is good for up to ~1M vectors
    CREATE INDEX CONCURRENTLY ai_vector_embeddings_embedding_ivfflat_idx
      ON ai_vector_embeddings USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
  END IF;
END
$$;

-- Semantic search cache to avoid re-embedding repeated queries
CREATE TABLE IF NOT EXISTS "semantic_search_cache" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "query_hash"  VARCHAR(64) NOT NULL,
  "query_text"  TEXT        NOT NULL,
  "embedding"   vector(1536),
  "results"     JSONB       NOT NULL DEFAULT '[]',
  "hit_count"   INTEGER     NOT NULL DEFAULT 1,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "expires_at"  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour'),
  CONSTRAINT "semantic_search_cache_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "semantic_search_cache_tenant_hash_key"
  ON "semantic_search_cache"("tenant_id", "query_hash");
CREATE INDEX IF NOT EXISTS "semantic_search_cache_expires_idx"
  ON "semantic_search_cache"("expires_at");
ALTER TABLE "semantic_search_cache"
  ADD CONSTRAINT "semantic_search_cache_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
