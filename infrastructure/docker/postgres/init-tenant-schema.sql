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

    -- Tenant Questions Table (MCQs & Essays)
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.questions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            text TEXT NOT NULL,
            type VARCHAR(50) NOT NULL, -- ''MCQ'', ''ESSAY'', ''CODING''
            options JSONB, -- list of MCQ options like ["A", "B", "C"]
            correct_option VARCHAR(50), -- e.g. "A"
            difficulty INT NOT NULL, -- 1: Easy, 2: Medium, 3: Hard
            points INT DEFAULT 10,
            negative_points INT DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    ', schema_name);

    -- Tenant Assessment Submissions Table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.submissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            student_id UUID NOT NULL,
            test_id UUID NOT NULL,
            score INT NOT NULL DEFAULT 0,
            answers JSONB NOT NULL, -- { questionId: answer }
            submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    ', schema_name);

    -- Tenant Assignments Table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.assignments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title VARCHAR(255) NOT NULL,
            description TEXT,
            due_date TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    ', schema_name);

    -- Tenant Assignment Submissions Table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.assignment_submissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            assignment_id UUID NOT NULL,
            student_id UUID NOT NULL,
            file_url TEXT NOT NULL,
            code_content TEXT, -- saved text content for plagiarism scan
            plagiarism_score NUMERIC DEFAULT 0,
            plagiarism_status VARCHAR(50) DEFAULT ''UNCHECKED'', -- ''UNCHECKED'', ''CLEAN'', ''FLAGGED''
            submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    ', schema_name);

    -- Tenant Peer Reviews Table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.peer_reviews (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            assignment_id UUID NOT NULL,
            submission_id UUID NOT NULL,
            reviewer_id UUID NOT NULL,
            score INT,
            feedback TEXT,
            submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    ', schema_name);
END;
$$ LANGUAGE plpgsql;

-- Execute for default tenant
SELECT create_tenant_schema('tenant_default');
