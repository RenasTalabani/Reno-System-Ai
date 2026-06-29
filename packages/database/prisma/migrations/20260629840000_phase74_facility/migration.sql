-- Phase 74: Facility Management
CREATE TABLE "facility_properties" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "address" VARCHAR(500) NOT NULL,
  "type" VARCHAR(50) NOT NULL DEFAULT 'office',
  "total_units" INTEGER NOT NULL DEFAULT 1,
  "total_area" DECIMAL(12,2),
  "status" VARCHAR(20) NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "facility_properties_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "facility_properties_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "facility_properties_tenant_id_idx" ON "facility_properties"("tenant_id");

CREATE TABLE "facility_leases" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "property_id" UUID NOT NULL,
  "tenant_name" VARCHAR(200) NOT NULL,
  "unit" VARCHAR(50) NOT NULL,
  "rent_amount" DECIMAL(14,2) NOT NULL,
  "deposit" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "start_date" DATE NOT NULL,
  "end_date" DATE,
  "status" VARCHAR(20) NOT NULL DEFAULT 'active',
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "facility_leases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "facility_leases_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "facility_leases_property_fkey" FOREIGN KEY ("property_id") REFERENCES "facility_properties"("id")
);
CREATE INDEX "facility_leases_tenant_id_idx" ON "facility_leases"("tenant_id");
