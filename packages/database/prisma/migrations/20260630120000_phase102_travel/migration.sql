-- Phase 102: Corporate Travel Management
CREATE TABLE IF NOT EXISTS trv_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  traveler_id UUID NOT NULL,
  purpose VARCHAR(300) NOT NULL,
  destination VARCHAR(300) NOT NULL,
  depart_date DATE NOT NULL,
  return_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  budget DECIMAL(12,2) NOT NULL DEFAULT 0,
  actual_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trv_trips_tenant ON trv_trips(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trv_trips_traveler ON trv_trips(tenant_id, traveler_id);

CREATE TABLE IF NOT EXISTS trv_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trv_trips(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  provider VARCHAR(200),
  reference VARCHAR(100),
  cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  confirmed_at TIMESTAMPTZ,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trv_bookings_trip ON trv_bookings(trip_id);
