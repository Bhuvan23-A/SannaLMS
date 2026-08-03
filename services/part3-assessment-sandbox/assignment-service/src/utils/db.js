const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'SannaLMS_Pass_2026!',
  database: process.env.POSTGRES_DB || 'sannalms_master',
  port: process.env.POSTGRES_PORT || 5432,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL] Database pool error:', err);
});

function getTenantSchema(tenantId) {
  if (!tenantId) return 'tenant_default';
  const sanitized = tenantId.toString().replace(/[^a-zA-Z0-9_]/g, '');
  return `tenant_${sanitized}`;
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  getTenantSchema,
  pool,
};
