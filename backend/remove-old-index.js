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

async function removeOldIndex() {
  try {
    console.log('🚀 Removendo índice antigo escolas_nome_unique...\n');
    
    await pool.query('DROP INDEX IF EXISTS escolas_nome_unique;');
    
    console.log('✅ Índice removido com sucesso!\n');
    
    // Verificar índices restantes
    console.log('📋 Índices únicos restantes relacionados a "nome":\n');
    const indexes = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'escolas'
        AND indexdef LIKE '%nome%'
        AND indexdef LIKE '%UNIQUE%'
      ORDER BY indexname;
    `);
    
    indexes.rows.forEach(row => {
      console.log(`   ${row.indexname}`);
      console.log(`   ${row.indexdef}\n`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

removeOldIndex();
