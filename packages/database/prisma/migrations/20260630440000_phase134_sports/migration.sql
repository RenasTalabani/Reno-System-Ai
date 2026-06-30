-- Phase 134: Sports & Recreation Management
CREATE TABLE IF NOT EXISTS spt_facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  address VARCHAR(500),
  capacity INT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS spt_facilities_tenant_id_idx ON spt_facilities(tenant_id);

CREATE TABLE IF NOT EXISTS spt_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(30),
  membership_type VARCHAR(50) NOT NULL,
  expires_at DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS spt_members_tenant_id_idx ON spt_members(tenant_id);

CREATE TABLE IF NOT EXISTS spt_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  facility_id UUID NOT NULL REFERENCES spt_facilities(id) ON DELETE CASCADE,
  member_id UUID REFERENCES spt_members(id),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS spt_bookings_tenant_id_idx ON spt_bookings(tenant_id);
CREATE INDEX IF NOT EXISTS spt_bookings_facility_id_idx ON spt_bookings(facility_id);
