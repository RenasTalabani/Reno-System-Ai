-- Phase 46: AI Enterprise Integration Hub

CREATE TABLE "eih_connectors" (
  "id"           TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "slug"         TEXT NOT NULL,
  "category"     TEXT NOT NULL,
  "authType"     TEXT NOT NULL,
  "description"  TEXT,
  "logo_emoji"   TEXT,
  "capabilities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "is_active"    BOOLEAN NOT NULL DEFAULT true,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eih_connectors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "eih_connectors_slug_key" ON "eih_connectors"("slug");

CREATE TABLE "eih_integrations" (
  "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        UUID NOT NULL,
  "user_id"          UUID NOT NULL,
  "connector_id"     TEXT NOT NULL,
  "name"             TEXT NOT NULL,
  "status"           TEXT NOT NULL DEFAULT 'pending',
  "config"           JSONB,
  "credentials"      JSONB,
  "oauth_tokens"     JSONB,
  "last_sync_at"     TIMESTAMPTZ,
  "last_sync_status" TEXT,
  "sync_count"       INTEGER NOT NULL DEFAULT 0,
  "error_count"      INTEGER NOT NULL DEFAULT 0,
  "webhook_secret"   TEXT,
  "field_mappings"   JSONB,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eih_integrations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "eih_integrations_tenant_id_idx" ON "eih_integrations"("tenant_id");
CREATE INDEX "eih_integrations_tenant_status_idx" ON "eih_integrations"("tenant_id", "status");

CREATE TABLE "eih_sync_logs" (
  "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       UUID NOT NULL,
  "integration_id"  UUID NOT NULL,
  "direction"       TEXT NOT NULL,
  "status"          TEXT NOT NULL,
  "records_total"   INTEGER NOT NULL DEFAULT 0,
  "records_synced"  INTEGER NOT NULL DEFAULT 0,
  "records_failed"  INTEGER NOT NULL DEFAULT 0,
  "error_message"   TEXT,
  "duration"        INTEGER,
  "triggered_by"    TEXT,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eih_sync_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "eih_sync_logs_tenant_id_idx" ON "eih_sync_logs"("tenant_id");
CREATE INDEX "eih_sync_logs_integration_id_idx" ON "eih_sync_logs"("integration_id");

CREATE TABLE "eih_webhook_events" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"      UUID NOT NULL,
  "integration_id" UUID,
  "source"         TEXT NOT NULL,
  "event_type"     TEXT NOT NULL,
  "payload"        JSONB NOT NULL,
  "processed"      BOOLEAN NOT NULL DEFAULT false,
  "processed_at"   TIMESTAMPTZ,
  "ai_analysis"    JSONB,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eih_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "eih_webhook_events_tenant_id_idx" ON "eih_webhook_events"("tenant_id");
CREATE INDEX "eih_webhook_events_tenant_processed_idx" ON "eih_webhook_events"("tenant_id", "processed");
CREATE INDEX "eih_webhook_events_tenant_source_idx" ON "eih_webhook_events"("tenant_id", "source");

-- Foreign keys
ALTER TABLE "eih_integrations"  ADD CONSTRAINT "eih_integrations_tenant_id_fkey"   FOREIGN KEY ("tenant_id")    REFERENCES "core_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "eih_integrations"  ADD CONSTRAINT "eih_integrations_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "eih_connectors"("id") ON UPDATE CASCADE;
ALTER TABLE "eih_sync_logs"     ADD CONSTRAINT "eih_sync_logs_tenant_id_fkey"       FOREIGN KEY ("tenant_id")    REFERENCES "core_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "eih_sync_logs"     ADD CONSTRAINT "eih_sync_logs_integration_id_fkey"  FOREIGN KEY ("integration_id") REFERENCES "eih_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "eih_webhook_events" ADD CONSTRAINT "eih_webhook_events_tenant_id_fkey"  FOREIGN KEY ("tenant_id")   REFERENCES "core_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "eih_webhook_events" ADD CONSTRAINT "eih_webhook_events_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "eih_integrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed connector marketplace
INSERT INTO "eih_connectors" ("id","name","slug","category","authType","description","logo_emoji","capabilities") VALUES
('conn_slack',    'Slack',             'slack',        'chat',      'oauth2',       'Team messaging and notifications',           '💬', ARRAY['send_message','receive_webhooks','list_channels']),
('conn_teams',    'Microsoft Teams',   'ms-teams',     'chat',      'oauth2',       'Microsoft collaboration platform',           '🟦', ARRAY['send_message','receive_webhooks','schedule_meeting']),
('conn_whatsapp', 'WhatsApp Business', 'whatsapp',     'chat',      'api_key',      'WhatsApp Business messaging API',            '🟢', ARRAY['send_message','receive_webhooks']),
('conn_gmail',    'Gmail',             'gmail',        'email',     'oauth2',       'Google Gmail integration',                   '📧', ARRAY['send_email','read_email','list_labels']),
('conn_m365',     'Microsoft 365',     'ms365',        'email',     'oauth2',       'Microsoft Outlook email and calendar',        '📨', ARRAY['send_email','read_email','calendar_sync']),
('conn_gcal',     'Google Calendar',   'google-cal',   'calendar',  'oauth2',       'Google Calendar read and write',             '📅', ARRAY['read_events','create_event','update_event']),
('conn_stripe',   'Stripe',            'stripe',       'payment',   'api_key',      'Stripe payment processing and billing',      '💳', ARRAY['receive_webhooks','read_payments','read_customers','read_subscriptions']),
('conn_paypal',   'PayPal',            'paypal',       'payment',   'oauth2',       'PayPal payments and transactions',           '💰', ARRAY['receive_webhooks','read_transactions','read_payouts']),
('conn_shopify',  'Shopify',           'shopify',      'ecommerce', 'api_key',      'Shopify e-commerce orders and products',     '🛍️', ARRAY['read_orders','read_products','receive_webhooks','sync_customers']),
('conn_woo',      'WooCommerce',       'woocommerce',  'ecommerce', 'api_key',      'WooCommerce store integration',              '🛒', ARRAY['read_orders','read_products','receive_webhooks']),
('conn_gdrive',   'Google Drive',      'google-drive', 'storage',   'oauth2',       'Google Drive file storage',                  '📁', ARRAY['read_files','upload_file','list_folders']),
('conn_dropbox',  'Dropbox',           'dropbox',      'storage',   'oauth2',       'Dropbox cloud storage',                      '📦', ARRAY['read_files','upload_file','share_link']),
('conn_sap',      'SAP ERP',           'sap',          'erp',       'basic',        'SAP enterprise resource planning',           '🏭', ARRAY['sync_finance','sync_inventory','sync_hr']),
('conn_netsuite', 'Oracle NetSuite',   'netsuite',     'erp',       'oauth2',       'NetSuite cloud ERP',                         '🔷', ARRAY['sync_finance','sync_orders','sync_inventory']),
('conn_bank',     'Open Banking',      'open-banking', 'bank',      'oauth2',       'Bank account data via Open Banking API',     '🏦', ARRAY['read_transactions','read_balance','read_statements']),
('conn_rest',     'Custom REST API',   'custom-rest',  'custom',    'api_key',      'Connect any REST API endpoint',              '🔌', ARRAY['http_get','http_post','http_put','receive_webhooks']),
('conn_webhook',  'Inbound Webhook',   'webhook',      'custom',    'webhook_only', 'Receive events from any system via webhook', '🪝', ARRAY['receive_webhooks']);