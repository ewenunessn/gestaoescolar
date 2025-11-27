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

async function checkConstraints() {
  try {
    console.log('🔍 Verificando constraints da tabela escolas...\n');
    
    const result = await pool.query(`
      SELECT 
        conname as constraint_name,
        contype as constraint_type,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'escolas'::regclass
      ORDER BY contype, conname;
    `);
    
    console.log('📋 Constraints encontradas:\n');
    result.rows.forEach(row => {
      const type = {
        'p': 'PRIMARY KEY',
        'u': 'UNIQUE',
        'f': 'FOREIGN KEY',
        'c': 'CHECK'
      }[row.constraint_type] || row.constraint_type;
      
      console.log(`   [${type}] ${row.constraint_name}`);
      console.log(`   ${row.definition}\n`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkConstraints();
