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

async function checkExtensions() {
  try {
    console.log('🔍 Checking PostgreSQL extensions...');
    
    // Check if uuid-ossp extension exists
    const result = await pool.query("SELECT * FROM pg_extension WHERE extname = 'uuid-ossp'");
    
    if (result.rows.length === 0) {
      console.log('📦 Installing uuid-ossp extension...');
      await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      console.log('✅ uuid-ossp extension installed');
    } else {
      console.log('✅ uuid-ossp extension already exists');
    }
    
    // Test uuid generation
    const testResult = await pool.query('SELECT uuid_generate_v4() as test_uuid');
    console.log('🧪 Test UUID:', testResult.rows[0].test_uuid);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkExtensions();