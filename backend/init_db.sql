-- VivyaSense Database Initialization Script
-- Run this script to create the database and user

-- Create database (skip if exists)
SELECT 'CREATE DATABASE vivyasense_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'vivyasense_db')\gexec

-- Create user (skip if exists)
DO
$$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'vivyasense') THEN
    CREATE USER vivyasense WITH PASSWORD 'vivyasense123';
  END IF;
END
$$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE vivyasense_db TO vivyasense;

-- Connect to the database
\c vivyasense_db

-- Grant schema privileges (CRITICAL for PostgreSQL 15+)
GRANT ALL ON SCHEMA public TO vivyasense;
GRANT CREATE ON SCHEMA public TO vivyasense;
GRANT USAGE ON SCHEMA public TO vivyasense;

-- Make vivyasense owner of public schema
ALTER SCHEMA public OWNER TO vivyasense;

-- Grant table privileges (for future tables)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO vivyasense;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO vivyasense;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO vivyasense;

-- Grant privileges for existing objects (if any)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO vivyasense;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO vivyasense;

-- Add heatmap_enabled column to camera_settings table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'camera_settings') THEN
        -- Add heatmap_enabled column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns
                      WHERE table_name = 'camera_settings'
                      AND column_name = 'heatmap_enabled') THEN
            ALTER TABLE camera_settings ADD COLUMN heatmap_enabled BOOLEAN DEFAULT FALSE;
            \echo 'Added heatmap_enabled column to camera_settings';
        END IF;

        -- Update existing records
        UPDATE camera_settings SET heatmap_enabled = FALSE WHERE heatmap_enabled IS NULL;
    END IF;
END $$;

-- Verify
SELECT datname FROM pg_database WHERE datname = 'vivyasense_db';
SELECT usename FROM pg_user WHERE usename = 'vivyasense';

-- Success message
\echo 'Database setup complete!'
\echo 'Database: vivyasense_db'
\echo 'User: vivyasense'
\echo 'Password: vivyasense123'
\echo 'Schema permissions granted successfully!'

