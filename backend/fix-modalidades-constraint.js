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

async function fixModalidadesConstraint() {
  try {
    console.log('🚀 Ajustando constraint de nome em modalidades...\n');
    
    // 1. Remover constraint antiga (nome único globalmente)
    console.log('1️⃣ Removendo constraint antiga (modalidades_nome_key)...');
    await pool.query(`
      ALTER TABLE modalidades 
      DROP CONSTRAINT IF EXISTS modalidades_nome_key;
    `);
    console.log('✅ Constraint antiga removida\n');
    
    // 2. Remover índice único antigo (se existir)
    console.log('2️⃣ Removendo índice único antigo (se existir)...');
    await pool.query(`DROP INDEX IF EXISTS modalidades_nome_key;`);
    console.log('✅ Índice antigo removido\n');
    
    // 3. Adicionar nova constraint (nome + tenant_id)
    console.log('3️⃣ Adicionando nova constraint (nome + tenant_id)...');
    await pool.query(`
      ALTER TABLE modalidades 
      ADD CONSTRAINT modalidades_nome_tenant_key 
      UNIQUE (nome, tenant_id);
    `);
    console.log('✅ Nova constraint adicionada\n');
    
    // 4. Verificar constraints
    console.log('4️⃣ Verificando constraints de modalidades...');
    const result = await pool.query(`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'modalidades'::regclass
        AND contype = 'u'
      ORDER BY conname;
    `);
    
    console.log('📋 Constraints de unicidade:\n');
    result.rows.forEach(row => {
      console.log(`   - ${row.constraint_name}: ${row.definition}`);
    });
    
    console.log('\n✅ PROCESSO CONCLUÍDO!\n');
    console.log('📝 Agora:');
    console.log('   • O mesmo nome de modalidade pode ser usado em tenants diferentes');
    console.log('   • Mas não pode ser duplicado dentro do mesmo tenant\n');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

fixModalidadesConstraint();
