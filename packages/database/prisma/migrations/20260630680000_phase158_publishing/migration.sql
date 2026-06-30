CREATE TABLE IF NOT EXISTS pub_titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  author VARCHAR(255) NOT NULL,
  isbn VARCHAR(20),
  genre VARCHAR(100),
  published_date DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'manuscript',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pub_titles_tenant_id_idx ON pub_titles(tenant_id);

CREATE TABLE IF NOT EXISTS pub_print_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_id UUID NOT NULL REFERENCES pub_titles(id) ON DELETE CASCADE,
  edition INT NOT NULL DEFAULT 1,
  copies INT NOT NULL,
  printed_at DATE,
  unit_cost NUMERIC(8,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pub_print_runs_title_id_idx ON pub_print_runs(title_id);
