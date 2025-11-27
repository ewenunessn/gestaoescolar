const { Pool } = require('pg');
require('dotenv').config();

// Verificar qual banco usar
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const isLocalDatabase = connectionString && (connectionString.includes('localhost') || connectionString.includes('127.0.0.1'));

console.log('🔍 Connection String:', connectionString ? 'Existe' : 'Não existe');
console.log('🔍 É banco local?', isLocalDatabase);

if (isLocalDatabase) {
  console.log('⚠️ Este script é para o banco de produção (Neon).');
  console.log('⚠️ Mas a DATABASE_URL aponta para localhost.');
  console.log('⚠️ Pulando execução.\n');
  process.exit(0);
}

// Conectar ao banco (deve ser Neon se não for localhost)
const neonPool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function fixConstraintNeon() {
  try {
    console.log('🚀 Ajustando constraint de nome em escolas (NEON)...\n');
    
    // 1. Remover constraint antiga
    console.log('1️⃣ Removendo constraint antiga (escolas_nome_unique)...');
    await neonPool.query(`
      ALTER TABLE escolas 
      DROP CONSTRAINT IF EXISTS escolas_nome_unique;
    `);
    console.log('✅ Constraint antiga removida\n');
    
    // 2. Adicionar nova constraint
    console.log('2️⃣ Adicionando nova constraint (nome + tenant_id)...');
    await neonPool.query(`
      ALTER TABLE escolas 
      ADD CONSTRAINT escolas_nome_tenant_key 
      UNIQUE (nome, tenant_id);
    `);
    console.log('✅ Nova constraint adicionada\n');
    
    // 3. Verificar constraints
    console.log('3️⃣ Verificando constraints de escolas...');
    const result = await neonPool.query(`
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
    
    console.log('\n✅ NEON ATUALIZADO COM SUCESSO!\n');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await neonPool.end();
  }
}

fixConstraintNeon();
