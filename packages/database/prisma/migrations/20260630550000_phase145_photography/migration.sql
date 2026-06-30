CREATE TABLE IF NOT EXISTS pho_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255),
  type VARCHAR(50) NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration INT NOT NULL DEFAULT 60,
  status VARCHAR(20) NOT NULL DEFAULT 'booked',
  price NUMERIC(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pho_sessions_tenant_id_idx ON pho_sessions(tenant_id);

CREATE TABLE IF NOT EXISTS pho_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES pho_sessions(id) ON DELETE CASCADE,
  file_url VARCHAR(1000) NOT NULL,
  type VARCHAR(20) NOT NULL,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pho_deliverables_session_id_idx ON pho_deliverables(session_id);
