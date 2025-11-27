const { Pool } = require('pg');

// Connection string do Neon (produção)
const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function fixConstraintNeon() {
  try {
    console.log('🚀 Ajustando constraint de nome em escolas (NEON - Produção)...\n');
    
    // 1. Remover constraint antiga
    console.log('1️⃣ Removendo constraint antiga (escolas_nome_unique)...');
    try {
      await neonPool.query(`
        ALTER TABLE escolas 
        DROP CONSTRAINT IF EXISTS escolas_nome_unique;
      `);
      console.log('✅ Constraint antiga removida\n');
    } catch (error) {
      console.log('⚠️ Constraint antiga não existe ou já foi removida\n');
    }
    
    // 2. Adicionar nova constraint
    console.log('2️⃣ Adicionando nova constraint (nome + tenant_id)...');
    try {
      await neonPool.query(`
        ALTER TABLE escolas 
        ADD CONSTRAINT escolas_nome_tenant_key 
        UNIQUE (nome, tenant_id);
      `);
      console.log('✅ Nova constraint adicionada\n');
    } catch (error) {
      if (error.message.includes('já existe')) {
        console.log('⚠️ Constraint já existe\n');
      } else {
        throw error;
      }
    }
    
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
    
    console.log('\n✅ NEON (PRODUÇÃO) ATUALIZADO COM SUCESSO!\n');
    console.log('📝 Agora:');
    console.log('   • O mesmo nome de escola pode ser usado em tenants diferentes');
    console.log('   • Mas não pode ser duplicado dentro do mesmo tenant\n');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await neonPool.end();
  }
}

fixConstraintNeon();
