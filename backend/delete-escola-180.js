const { Pool } = require('pg');
require('dotenv').config();

let pool;
if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  const isLocalDatabase = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  
  pool = new Pool({
    connectionString,
    ssl: isLocalDatabase ? false : { rejectUnauthorized: false }
  });
} else {
  pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'alimentacao_escolar',
    password: process.env.DB_PASSWORD || 'admin123',
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: false
  });
}

async function deleteEscola() {
  try {
    console.log('🗑️ Deletando escola ID 180...\n');
    
    const result = await pool.query('DELETE FROM escolas WHERE id = 180 RETURNING *');
    
    if (result.rows.length > 0) {
      console.log('✅ Escola deletada:');
      console.log('   Nome:', result.rows[0].nome);
      console.log('   Tenant ID:', result.rows[0].tenant_id);
      console.log('');
    } else {
      console.log('⚠️ Escola não encontrada');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

deleteEscola();
