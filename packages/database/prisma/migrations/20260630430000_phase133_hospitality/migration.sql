-- Phase 133: Hospitality & Hotel Management
CREATE TABLE IF NOT EXISTS hotel_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(500) NOT NULL,
  stars INT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hotel_properties_tenant_id_idx ON hotel_properties(tenant_id);

CREATE TABLE IF NOT EXISTS hotel_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES hotel_properties(id) ON DELETE CASCADE,
  room_number VARCHAR(20) NOT NULL,
  type VARCHAR(30) NOT NULL,
  floor INT,
  capacity INT NOT NULL DEFAULT 2,
  rate_per_night DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hotel_rooms_property_id_idx ON hotel_rooms(property_id);

CREATE TABLE IF NOT EXISTS hotel_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  room_id UUID NOT NULL REFERENCES hotel_rooms(id) ON DELETE CASCADE,
  guest_name VARCHAR(255) NOT NULL,
  guest_email VARCHAR(255),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hotel_reservations_tenant_id_idx ON hotel_reservations(tenant_id);
CREATE INDEX IF NOT EXISTS hotel_reservations_room_id_idx ON hotel_reservations(room_id);
