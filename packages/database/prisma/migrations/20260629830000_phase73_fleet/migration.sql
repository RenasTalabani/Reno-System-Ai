-- Phase 73: Fleet Management
CREATE TABLE "fleet_vehicles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "make" VARCHAR(100) NOT NULL,
  "model" VARCHAR(100) NOT NULL,
  "year" INTEGER NOT NULL,
  "license_plate" VARCHAR(50) NOT NULL,
  "vin" VARCHAR(50),
  "status" VARCHAR(20) NOT NULL DEFAULT 'available',
  "fuel_type" VARCHAR(20) NOT NULL DEFAULT 'petrol',
  "mileage" INTEGER NOT NULL DEFAULT 0,
  "last_service" DATE,
  "next_service" DATE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "fleet_vehicles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fleet_vehicles_tenant_plate_key" UNIQUE ("tenant_id", "license_plate"),
  CONSTRAINT "fleet_vehicles_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "fleet_vehicles_tenant_id_idx" ON "fleet_vehicles"("tenant_id");

CREATE TABLE "fleet_drivers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "license_no" VARCHAR(100) NOT NULL,
  "license_expiry" DATE NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'active',
  "rating" DECIMAL(3,2) NOT NULL DEFAULT 5,
  "total_trips" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "fleet_drivers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fleet_drivers_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "fleet_drivers_tenant_id_idx" ON "fleet_drivers"("tenant_id");

CREATE TABLE "fleet_trips" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "vehicle_id" UUID NOT NULL,
  "driver_id" UUID NOT NULL,
  "purpose" VARCHAR(300),
  "origin" VARCHAR(300) NOT NULL,
  "destination" VARCHAR(300) NOT NULL,
  "start_odo" INTEGER NOT NULL,
  "end_odo" INTEGER,
  "started_at" TIMESTAMPTZ NOT NULL,
  "ended_at" TIMESTAMPTZ,
  "status" VARCHAR(20) NOT NULL DEFAULT 'active',
  "fuel_cost" DECIMAL(10,2),
  CONSTRAINT "fleet_trips_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fleet_trips_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "fleet_trips_vehicle_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "fleet_vehicles"("id"),
  CONSTRAINT "fleet_trips_driver_fkey" FOREIGN KEY ("driver_id") REFERENCES "fleet_drivers"("id")
);
CREATE INDEX "fleet_trips_tenant_id_idx" ON "fleet_trips"("tenant_id");
CREATE INDEX "fleet_trips_vehicle_idx" ON "fleet_trips"("tenant_id", "vehicle_id");
