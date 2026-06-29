-- Phase 77: Order Management System
CREATE TABLE "oms_orders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "order_no" VARCHAR(50) NOT NULL,
  "customer_id" UUID,
  "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
  "channel" VARCHAR(30) NOT NULL DEFAULT 'web',
  "subtotal" DECIMAL(14,2) NOT NULL,
  "tax" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "shipping" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(14,2) NOT NULL,
  "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
  "shipping_addr" JSONB NOT NULL DEFAULT '{}',
  "billing_addr" JSONB NOT NULL DEFAULT '{}',
  "notes" TEXT,
  "placed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "oms_orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "oms_orders_tenant_orderno_key" UNIQUE ("tenant_id", "order_no"),
  CONSTRAINT "oms_orders_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "oms_orders_tenant_id_idx" ON "oms_orders"("tenant_id");

CREATE TABLE "oms_order_lines" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL,
  "product_id" UUID,
  "sku" VARCHAR(100),
  "name" VARCHAR(300) NOT NULL,
  "qty" INTEGER NOT NULL,
  "unit_price" DECIMAL(14,4) NOT NULL,
  "discount" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "total" DECIMAL(14,2) NOT NULL,
  CONSTRAINT "oms_order_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "oms_order_lines_order_fkey" FOREIGN KEY ("order_id") REFERENCES "oms_orders"("id") ON DELETE CASCADE
);
CREATE INDEX "oms_order_lines_order_id_idx" ON "oms_order_lines"("order_id");

CREATE TABLE "oms_shipments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "carrier" VARCHAR(100),
  "tracking_no" VARCHAR(200),
  "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
  "shipped_at" TIMESTAMPTZ,
  "delivered_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "oms_shipments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "oms_shipments_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "oms_shipments_order_fkey" FOREIGN KEY ("order_id") REFERENCES "oms_orders"("id")
);
CREATE INDEX "oms_shipments_tenant_id_idx" ON "oms_shipments"("tenant_id");
