-- Phase 138: Cemetery & Memorial Management
CREATE TABLE IF NOT EXISTS cem_plots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  plot_number VARCHAR(50) NOT NULL,
  section VARCHAR(50),
  type VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'available',
  price DECIMAL(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cem_plots_tenant_id_idx ON cem_plots(tenant_id);

CREATE TABLE IF NOT EXISTS cem_interments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID NOT NULL REFERENCES cem_plots(id) ON DELETE CASCADE,
  deceased_name VARCHAR(255) NOT NULL,
  date_of_birth DATE,
  date_of_death DATE NOT NULL,
  interment_date DATE NOT NULL,
  family_contact VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cem_interments_plot_id_idx ON cem_interments(plot_id);
