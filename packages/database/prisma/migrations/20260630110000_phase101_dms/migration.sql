-- Phase 101: Document Management System 2.0
CREATE TABLE IF NOT EXISTS dms_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES dms_folders(id),
  name VARCHAR(255) NOT NULL,
  path VARCHAR(1000) NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dms_folders_tenant ON dms_folders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dms_folders_parent ON dms_folders(tenant_id, parent_id);

CREATE TABLE IF NOT EXISTS dms_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES dms_folders(id),
  name VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT,
  storage_key VARCHAR(1000) NOT NULL,
  version INT NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  tags TEXT[] NOT NULL DEFAULT '{}',
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dms_docs_tenant ON dms_docs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dms_docs_folder ON dms_docs(tenant_id, folder_id);
