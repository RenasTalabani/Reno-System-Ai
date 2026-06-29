-- Phase 63: Supply Chain Management
CREATE TABLE "scm_suppliers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "name" VARCHAR(300) NOT NULL,
  "code" VARCHAR(50) NOT NULL, "contact_name" VARCHAR(200), "email" VARCHAR(300), "phone" VARCHAR(50),
  "address" JSONB NOT NULL DEFAULT '{}', "payment_terms" VARCHAR(100), "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
  "rating" INTEGER NOT NULL DEFAULT 0, "is_active" BOOLEAN NOT NULL DEFAULT true, "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "scm_suppliers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "scm_suppliers_tenant_code_key" UNIQUE ("tenant_id","code"),
  CONSTRAINT "scm_suppliers_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "scm_suppliers_tenant_id_idx" ON "scm_suppliers"("tenant_id");

CREATE TABLE "scm_purchase_orders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "supplier_id" UUID NOT NULL,
  "po_number" VARCHAR(100) NOT NULL, "status" VARCHAR(30) NOT NULL DEFAULT 'draft', "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
  "subtotal" DECIMAL(14,2) NOT NULL, "tax" DECIMAL(14,2) NOT NULL DEFAULT 0, "total" DECIMAL(14,2) NOT NULL,
  "order_date" TIMESTAMPTZ NOT NULL, "expected_date" TIMESTAMPTZ, "received_date" TIMESTAMPTZ, "notes" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}', "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "scm_purchase_orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "scm_purchase_orders_tenant_po_key" UNIQUE ("tenant_id","po_number"),
  CONSTRAINT "scm_purchase_orders_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "scm_purchase_orders_supplier_fkey" FOREIGN KEY ("supplier_id") REFERENCES "scm_suppliers"("id")
);
CREATE INDEX "scm_purchase_orders_tenant_status_idx" ON "scm_purchase_orders"("tenant_id","status");

CREATE TABLE "scm_purchase_order_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "po_id" UUID NOT NULL, "sku" VARCHAR(200) NOT NULL,
  "name" VARCHAR(500) NOT NULL, "quantity" DECIMAL(12,4) NOT NULL, "received" DECIMAL(12,4) NOT NULL DEFAULT 0,
  "unit_price" DECIMAL(12,2) NOT NULL, "amount" DECIMAL(14,2) NOT NULL,
  CONSTRAINT "scm_poi_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "scm_poi_po_fkey" FOREIGN KEY ("po_id") REFERENCES "scm_purchase_orders"("id") ON DELETE CASCADE
);
CREATE INDEX "scm_poi_po_id_idx" ON "scm_purchase_order_items"("po_id");

CREATE TABLE "scm_receipts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "po_id" UUID NOT NULL,
  "reference" VARCHAR(200) NOT NULL, "status" VARCHAR(30) NOT NULL DEFAULT 'draft', "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "scm_receipts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "scm_receipts_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "scm_receipts_po_fkey" FOREIGN KEY ("po_id") REFERENCES "scm_purchase_orders"("id")
);
CREATE INDEX "scm_receipts_tenant_id_idx" ON "scm_receipts"("tenant_id");

CREATE TABLE "scm_receipt_lines" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "receipt_id" UUID NOT NULL, "sku" VARCHAR(200) NOT NULL,
  "expected" DECIMAL(12,4) NOT NULL, "received" DECIMAL(12,4) NOT NULL, "rejected" DECIMAL(12,4) NOT NULL DEFAULT 0, "notes" TEXT,
  CONSTRAINT "scm_rl_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "scm_rl_receipt_fkey" FOREIGN KEY ("receipt_id") REFERENCES "scm_receipts"("id") ON DELETE CASCADE
);
CREATE INDEX "scm_receipt_lines_receipt_id_idx" ON "scm_receipt_lines"("receipt_id");
