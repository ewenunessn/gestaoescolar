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

async function checkAll() {
  try {
    console.log('🔍 Verificando TODAS as constraints e índices da tabela escolas...\n');
    
    // Constraints
    console.log('📋 CONSTRAINTS:\n');
    const constraints = await pool.query(`
      SELECT 
        conname as name,
        contype as type,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'escolas'::regclass
      ORDER BY conname;
    `);
    
    constraints.rows.forEach(row => {
      console.log(`   ${row.name}`);
      console.log(`   ${row.definition}\n`);
    });
    
    // Índices
    console.log('\n📋 ÍNDICES:\n');
    const indexes = await pool.query(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'escolas'
      ORDER BY indexname;
    `);
    
    indexes.rows.forEach(row => {
      console.log(`   ${row.indexname}`);
      console.log(`   ${row.indexdef}\n`);
    });
    
    // Procurar especificamente por "nome"
    console.log('\n🔍 Procurando por constraints/índices relacionados a "nome":\n');
    const nomeRelated = await pool.query(`
      SELECT 
        conname as name,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'escolas'::regclass
        AND pg_get_constraintdef(oid) LIKE '%nome%'
      ORDER BY conname;
    `);
    
    if (nomeRelated.rows.length > 0) {
      nomeRelated.rows.forEach(row => {
        console.log(`   ${row.name}: ${row.definition}`);
      });
    } else {
      console.log('   Nenhuma constraint encontrada');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkAll();
