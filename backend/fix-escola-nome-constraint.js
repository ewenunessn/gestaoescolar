const { Pool } = require('pg');
require('dotenv').config();

// Usar a mesma lógica do database.ts
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

async function fixConstraint() {
  try {
    console.log('🚀 Ajustando constraint de nome em escolas...\n');
    
    // 1. Remover constraint antiga (nome único globalmente)
    console.log('1️⃣ Removendo constraint antiga (escolas_nome_unique)...');
    await pool.query(`
      ALTER TABLE escolas 
      DROP CONSTRAINT IF EXISTS escolas_nome_unique;
    `);
    console.log('✅ Constraint antiga removida\n');
    
    // 2. Adicionar nova constraint (nome + tenant_id)
    console.log('2️⃣ Adicionando nova constraint (nome + tenant_id)...');
    await pool.query(`
      ALTER TABLE escolas 
      ADD CONSTRAINT escolas_nome_tenant_key 
      UNIQUE (nome, tenant_id);
    `);
    console.log('✅ Nova constraint adicionada\n');
    
    // 3. Verificar constraints
    console.log('3️⃣ Verificando constraints de escolas...');
    const result = await pool.query(`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'escolas'::regclass
        AND contype = 'u'
      ORDER BY conname;
    `);
    
    console.log('📋 Constraints de unicidade:\n');
    result.rows.forEach(row => {
      console.log(`   - ${row.constraint_name}: ${row.definition}`);
    });
    
    console.log('\n✅ PROCESSO CONCLUÍDO!\n');
    console.log('📝 Agora:');
    console.log('   • O mesmo nome de escola pode ser usado em tenants diferentes');
    console.log('   • Mas não pode ser duplicado dentro do mesmo tenant\n');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

fixConstraint();
