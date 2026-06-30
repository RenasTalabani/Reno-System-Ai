-- Phase 131: Media & Broadcasting
CREATE TABLE IF NOT EXISTS mbr_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  language VARCHAR(10),
  timezone VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mbr_channels_tenant_id_idx ON mbr_channels(tenant_id);

CREATE TABLE IF NOT EXISTS mbr_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES mbr_channels(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  type VARCHAR(30) NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_min INT NOT NULL DEFAULT 30,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mbr_programs_channel_id_idx ON mbr_programs(channel_id);

CREATE TABLE IF NOT EXISTS mbr_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  type VARCHAR(30) NOT NULL,
  file_url VARCHAR(1000),
  duration INT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mbr_content_tenant_id_idx ON mbr_content(tenant_id);
