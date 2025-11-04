require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'alimentacao_escolar',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin123',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function checkTables() {
  try {
    console.log('🔍 Checking existing tables...');
    
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('tenants', 'tenant_alerts', 'tenant_usage_metrics', 'tenant_security_events', 'tenant_performance_metrics')
      ORDER BY table_name
    `);
    
    console.log('📊 Existing tables:', result.rows.map(row => row.table_name));
    
    if (result.rows.length === 0) {
      console.log('⚠️  No tenant tables found. Need to run basic tenant migration first.');
    }
    
    // Check if tenants table exists specifically
    const tenantsCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tenants'
      );
    `);
    
    console.log('🏢 Tenants table exists:', tenantsCheck.rows[0].exists);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkTables();