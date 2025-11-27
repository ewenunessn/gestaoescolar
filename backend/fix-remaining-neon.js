const { Pool } = require('pg');

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function fixRemaining() {
  try {
    console.log('🚀 Corrigindo constraints restantes no NEON...\n');
    
    // ESCOLAS - nome
    console.log('1️⃣ Corrigindo escolas_nome...');
    try {
      await neonPool.query('ALTER TABLE escolas DROP CONSTRAINT IF EXISTS escolas_nome_unique;');
      await neonPool.query('DROP INDEX IF EXISTS escolas_nome_unique;');
      await neonPool.query('ALTER TABLE escolas ADD CONSTRAINT escolas_nome_tenant_key UNIQUE (nome, tenant_id);');
      console.log('   ✅ Escolas nome corrigido\n');
    } catch (error) {
      if (error.message.includes('já existe') || error.message.includes('already exists')) {
        console.log('   ⚠️ Já existe\n');
      } else {
        console.log(`   ❌ Erro: ${error.message}\n`);
      }
    }
    
    // MODALIDADES
    console.log('2️⃣ Corrigindo modalidades...');
    try {
      await neonPool.query('ALTER TABLE modalidades DROP CONSTRAINT IF EXISTS modalidades_nome_key;');
      await neonPool.query('DROP INDEX IF EXISTS modalidades_nome_key;');
      await neonPool.query('ALTER TABLE modalidades ADD CONSTRAINT modalidades_nome_tenant_key UNIQUE (nome, tenant_id);');
      console.log('   ✅ Modalidades corrigido\n');
    } catch (error) {
      if (error.message.includes('já existe') || error.message.includes('already exists')) {
        console.log('   ⚠️ Já existe\n');
      } else {
        console.log(`   ❌ Erro: ${error.message}\n`);
      }
    }
    
    // Verificar resultado final
    console.log('🔍 Verificando todas as constraints...\n');
    
    const tables = ['escolas', 'modalidades', 'produtos', 'fornecedores', 'usuarios', 'contratos', 'pedidos', 'faturamentos'];
    
    for (const table of tables) {
      const result = await neonPool.query(`
        SELECT 
          conname as constraint_name
        FROM pg_constraint
        WHERE conrelid = $1::regclass
          AND contype = 'u'
          AND pg_get_constraintdef(oid) LIKE '%tenant_id%'
        ORDER BY conname;
      `, [table]);
      
      if (result.rows.length > 0) {
        console.log(`✅ ${table}: ${result.rows.length} constraint(s) com tenant_id`);
      } else {
        console.log(`❌ ${table}: FALTA constraint com tenant_id`);
      }
    }
    
    console.log('\n✅ PROCESSO CONCLUÍDO!\n');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  } finally {
    await neonPool.end();
  }
}

fixRemaining();
