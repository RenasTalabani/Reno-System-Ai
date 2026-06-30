CREATE TABLE IF NOT EXISTS msc_artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  genre VARCHAR(100),
  bio TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS msc_artists_tenant_id_idx ON msc_artists(tenant_id);

CREATE TABLE IF NOT EXISTS msc_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES msc_artists(id) ON DELETE CASCADE,
  event_name VARCHAR(255) NOT NULL,
  venue VARCHAR(255),
  event_date TIMESTAMPTZ NOT NULL,
  fee NUMERIC(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS msc_bookings_tenant_id_idx ON msc_bookings(tenant_id);
CREATE INDEX IF NOT EXISTS msc_bookings_artist_id_idx ON msc_bookings(artist_id);
