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

async function testSingleTable() {
  try {
    console.log('🔄 Testing single table creation...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenant_notification_rules (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
          alert_types JSONB DEFAULT '[]',
          severities JSONB DEFAULT '[]',
          channels JSONB NOT NULL DEFAULT '[]',
          enabled BOOLEAN DEFAULT TRUE,
          conditions JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Table created successfully!');
    
    // Test inserting data
    await pool.query(`
      INSERT INTO tenant_notification_rules (
        tenant_id, alert_types, severities, channels, enabled
      ) VALUES (
        NULL,
        '["security_violation"]',
        '["critical"]',
        '[{"type": "email", "config": {"recipients": ["admin@test.com"]}, "enabled": true}]',
        true
      ) ON CONFLICT DO NOTHING
    `);
    
    console.log('✅ Test data inserted!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testSingleTable();