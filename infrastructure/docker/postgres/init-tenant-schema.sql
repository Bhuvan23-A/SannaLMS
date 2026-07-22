-- SannaLMS Schema-Per-Tenant Multi-Tenancy Initializer

CREATE SCHEMA IF NOT EXISTS tenant_master;

-- Tenants Registry Table
CREATE TABLE IF NOT EXISTS tenant_master.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    schema_name VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Default Demo Tenant
INSERT INTO tenant_master.tenants (name, subdomain, schema_name)
VALUES ('Default Campus', 'default', 'tenant_default')
ON CONFLICT (subdomain) DO NOTHING;

-- Function to dynamically create new tenant schema
CREATE OR REPLACE FUNCTION create_tenant_schema(schema_name TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
    
    -- Tenant Users Table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            full_name VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL DEFAULT ''STUDENT'',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    ', schema_name);

    -- Tenant Courses Table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.courses (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title VARCHAR(255) NOT NULL,
            description TEXT,
            instructor_id UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    ', schema_name);
END;
$$ LANGUAGE plpgsql;

-- Execute for default tenant
SELECT create_tenant_schema('tenant_default');
