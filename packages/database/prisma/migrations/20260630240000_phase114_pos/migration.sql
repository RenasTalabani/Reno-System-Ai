-- Phase 114: Restaurant POS
CREATE TABLE IF NOT EXISTS pos_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  table_number VARCHAR(20),
  type VARCHAR(20) NOT NULL DEFAULT 'dine_in',
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax DECIMAL(10,2) NOT NULL DEFAULT 0,
  tip DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  cashier_id UUID NOT NULL,
  paid_at TIMESTAMPTZ,
  payment_method VARCHAR(30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pos_orders_tenant ON pos_orders(tenant_id);

CREATE TABLE IF NOT EXISTS pos_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES pos_orders(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  sku VARCHAR(100),
  qty INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(8,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  notes VARCHAR(300)
);
CREATE INDEX IF NOT EXISTS idx_pos_order_items_order ON pos_order_items(order_id);
