-- Phase 83: Product Catalog
CREATE TABLE IF NOT EXISTS "pc_categories" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "slug" VARCHAR(200) NOT NULL,
  "parent_id" UUID,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "pc_categories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pc_categories_tenant_slug_key" UNIQUE ("tenant_id", "slug"),
  CONSTRAINT "pc_categories_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "pc_categories_tenant_id_idx" ON "pc_categories"("tenant_id");

CREATE TABLE IF NOT EXISTS "pc_products" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "category_id" UUID,
  "sku" VARCHAR(100) NOT NULL,
  "name" VARCHAR(500) NOT NULL,
  "description" TEXT,
  "base_price" DECIMAL(18,4) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
  "tax_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
  "unit" VARCHAR(30),
  "weight" DECIMAL(10,3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "pc_products_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pc_products_tenant_sku_key" UNIQUE ("tenant_id", "sku"),
  CONSTRAINT "pc_products_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "pc_products_category_fkey" FOREIGN KEY ("category_id") REFERENCES "pc_categories"("id")
);
CREATE INDEX IF NOT EXISTS "pc_products_tenant_id_idx" ON "pc_products"("tenant_id");

CREATE TABLE IF NOT EXISTS "pc_variants" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "product_id" UUID NOT NULL,
  "sku" VARCHAR(100) NOT NULL,
  "name" VARCHAR(300) NOT NULL,
  "attributes" JSONB,
  "price" DECIMAL(18,4),
  "stock_qty" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "pc_variants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pc_variants_product_fkey" FOREIGN KEY ("product_id") REFERENCES "pc_products"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "pc_variants_product_idx" ON "pc_variants"("product_id");