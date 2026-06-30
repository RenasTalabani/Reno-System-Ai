-- Phase 129: Conference & Meeting Management
CREATE TABLE IF NOT EXISTS meet_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  capacity INT NOT NULL DEFAULT 10,
  floor VARCHAR(50),
  building VARCHAR(100),
  amenities TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS meet_rooms_tenant_id_idx ON meet_rooms(tenant_id);

CREATE TABLE IF NOT EXISTS meet_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  room_id UUID NOT NULL REFERENCES meet_rooms(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  organizer UUID NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  attendees TEXT[] NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS meet_bookings_tenant_id_idx ON meet_bookings(tenant_id);
CREATE INDEX IF NOT EXISTS meet_bookings_room_id_idx ON meet_bookings(room_id);

CREATE TABLE IF NOT EXISTS meet_catering (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES meet_bookings(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]',
  total_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'requested',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS meet_catering_booking_id_idx ON meet_catering(booking_id);
