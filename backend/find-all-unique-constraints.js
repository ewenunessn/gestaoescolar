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

async function findAllUniqueConstraints() {
  try {
    console.log('🔍 Procurando tabelas com tenant_id e constraints UNIQUE...\n');
    
    // Buscar todas as tabelas que têm tenant_id
    const tablesWithTenant = await pool.query(`
      SELECT DISTINCT table_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'tenant_id'
      ORDER BY table_name;
    `);
    
    console.log(`📋 Encontradas ${tablesWithTenant.rows.length} tabelas com tenant_id:\n`);
    
    for (const table of tablesWithTenant.rows) {
      const tableName = table.table_name;
      
      // Buscar constraints UNIQUE desta tabela
      const constraints = await pool.query(`
        SELECT 
          conname as constraint_name,
          pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conrelid = $1::regclass
          AND contype = 'u'
        ORDER BY conname;
      `, [tableName]);
      
      if (constraints.rows.length > 0) {
        console.log(`\n📦 Tabela: ${tableName}`);
        console.log('   Constraints UNIQUE:');
        
        for (const constraint of constraints.rows) {
          const def = constraint.definition;
          const hasTenantId = def.includes('tenant_id');
          const status = hasTenantId ? '✅' : '⚠️';
          
          console.log(`   ${status} ${constraint.constraint_name}`);
          console.log(`      ${def}`);
          
          // Se não tem tenant_id, pode precisar de correção
          if (!hasTenantId && !constraint.constraint_name.includes('pkey')) {
            console.log(`      🔧 PRECISA CORREÇÃO: Adicionar tenant_id`);
          }
        }
      }
    }
    
    console.log('\n\n📊 RESUMO:');
    console.log('   ✅ = Constraint já inclui tenant_id (OK)');
    console.log('   ⚠️ = Constraint NÃO inclui tenant_id (PRECISA CORREÇÃO)');
    console.log('');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

findAllUniqueConstraints();
