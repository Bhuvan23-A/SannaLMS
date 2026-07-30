-- Create databases if they don't exist
SELECT 'CREATE DATABASE sannalms' 
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'sannalms')\gexec

SELECT 'CREATE DATABASE kong' 
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'kong')\gexec

-- Switch to sannalms and create extensions
\c sannalms

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
