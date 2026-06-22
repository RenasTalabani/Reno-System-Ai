-- =============================================================================
-- Reno System — PostgreSQL Initialization
-- Runs once when the container is first created
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- For full-text search
CREATE EXTENSION IF NOT EXISTS "unaccent";   -- For accent-insensitive search

-- Create application role (used by Prisma and the app)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'reno_app_role') THEN
    CREATE ROLE reno_app_role;
  END IF;
END
$$;

GRANT reno_app_role TO reno;

-- Create audit schema
CREATE SCHEMA IF NOT EXISTS audit;

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS
  'Trigger function to automatically update updated_at on row modification';

-- Log initialization
DO $$
BEGIN
  RAISE NOTICE 'Reno System PostgreSQL initialized successfully';
END
$$;
