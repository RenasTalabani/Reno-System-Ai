-- Phase 139: Event Ticketing Platform
CREATE TABLE IF NOT EXISTS tkt_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(300) NOT NULL,
  venue VARCHAR(300),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  total_capacity INT NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tkt_events_tenant_id_idx ON tkt_events(tenant_id);

CREATE TABLE IF NOT EXISTS tkt_ticket_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES tkt_events(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  sold INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tkt_ticket_types_event_id_idx ON tkt_ticket_types(event_id);

CREATE TABLE IF NOT EXISTS tkt_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  ticket_type_id UUID NOT NULL REFERENCES tkt_ticket_types(id) ON DELETE CASCADE,
  buyer_name VARCHAR(255) NOT NULL,
  buyer_email VARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  qr_code VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tkt_orders_tenant_id_idx ON tkt_orders(tenant_id);
CREATE INDEX IF NOT EXISTS tkt_orders_ticket_type_id_idx ON tkt_orders(ticket_type_id);
