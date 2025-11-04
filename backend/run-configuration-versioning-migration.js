/**
 * Run configuration versioning migration
 */

// Load environment variables
require('dotenv').config();

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
let pool;

if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    pool = new Pool({
        connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });
} else {
    const dbConfig = {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'alimentacao_escolar',
        password: process.env.DB_PASSWORD || 'admin123',
        port: parseInt(process.env.DB_PORT || '5432'),
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    };
    pool = new Pool(dbConfig);
}

const db = {
    query: async (text, params = []) => {
        return await pool.query(text, params);
    }
};

async function runMigration() {
  try {
    console.log('Running configuration versioning migration...');
    
    const migrationPath = path.join(__dirname, 'migrations', '005_add_configuration_versioning.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');
    
    await db.query(migration);
    
    console.log('✅ Configuration versioning migration completed successfully!');
    console.log('✅ Created tables:');
    console.log('   - tenant_configuration_versions');
    console.log('   - tenant_configuration_templates');
    console.log('   - tenant_configuration_change_requests');
    console.log('   - tenant_configuration_inheritance_rules');
    console.log('✅ Created functions:');
    console.log('   - create_tenant_configuration_version()');
    console.log('   - rollback_tenant_configuration()');
    console.log('✅ Inserted default templates and inheritance rules');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runMigration();