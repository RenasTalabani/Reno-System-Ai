CREATE TABLE IF NOT EXISTS fdl_restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  cuisine VARCHAR(100),
  address VARCHAR(500),
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS fdl_restaurants_tenant_id_idx ON fdl_restaurants(tenant_id);

CREATE TABLE IF NOT EXISTS fdl_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES fdl_restaurants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  price NUMERIC(8,2) NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS fdl_menu_items_restaurant_id_idx ON fdl_menu_items(restaurant_id);

CREATE TABLE IF NOT EXISTS fdl_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES fdl_restaurants(id) ON DELETE CASCADE,
  order_ref VARCHAR(50) UNIQUE NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  delivery_addr VARCHAR(500) NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'placed',
  placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS fdl_orders_tenant_id_idx ON fdl_orders(tenant_id);
CREATE INDEX IF NOT EXISTS fdl_orders_restaurant_id_idx ON fdl_orders(restaurant_id);
