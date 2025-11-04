/**
 * Run monitoring tables migration
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'alimentacao_escolar',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin123',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  try {
    console.log('🔄 Running monitoring tables migration...');
    
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '008_create_notification_tables_minimal.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute migration
    await pool.query(migrationSQL);
    
    console.log('✅ Monitoring tables migration completed successfully!');
    
    // Test the new tables
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN (
          'tenant_notification_rules',
          'tenant_notification_log',
          'system_metrics',
          'tenant_health_scores',
          'monitoring_dashboards'
        )
      ORDER BY table_name
    `);
    
    console.log('📊 Created tables:', result.rows.map(row => row.table_name));
    
    // Test materialized view
    const viewResult = await pool.query(`
      SELECT COUNT(*) as tenant_count 
      FROM tenant_monitoring_summary
    `);
    
    console.log('📈 Materialized view working, tenant count:', viewResult.rows[0].tenant_count);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();