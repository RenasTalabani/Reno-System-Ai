-- Phase 105: IoT & Digital Twin
CREATE TABLE IF NOT EXISTS iot_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  serial_no VARCHAR(100),
  location VARCHAR(300),
  status VARCHAR(20) NOT NULL DEFAULT 'online',
  firmware VARCHAR(50),
  last_seen_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_iot_devices_tenant ON iot_devices(tenant_id);

CREATE TABLE IF NOT EXISTS iot_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES iot_devices(id) ON DELETE CASCADE,
  metric VARCHAR(100) NOT NULL,
  value DECIMAL(18,6) NOT NULL,
  unit VARCHAR(20),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_iot_telemetry_device ON iot_telemetry(device_id);
CREATE INDEX IF NOT EXISTS idx_iot_telemetry_device_metric ON iot_telemetry(device_id, metric, recorded_at);

CREATE TABLE IF NOT EXISTS iot_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES iot_devices(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'info',
  message VARCHAR(500) NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_iot_alerts_device ON iot_alerts(device_id);
