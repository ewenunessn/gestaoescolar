const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function checkEscolaDuplicada() {
  const client = await neonPool.connect();
  
  try {
    console.log('🔍 Verificando se há escolas duplicadas...\n');

    // Buscar todas as escolas com nome "Ewerton"
    const escolas = await client.query(`
      SELECT id, nome, tenant_id, created_at
      FROM escolas 
      WHERE nome LIKE '%Ewerton%'
      ORDER BY created_at DESC
    `);

    console.log(`📊 Total de escolas encontradas: ${escolas.rows.length}\n`);
    
    escolas.rows.forEach((e, index) => {
      console.log(`Escola ${index + 1}:`);
      console.log(`  Nome: ${e.nome}`);
      console.log(`  ID: ${e.id}`);
      console.log(`  Tenant ID: ${e.tenant_id}`);
      console.log(`  Criada em: ${e.created_at}`);
      console.log();
    });

    // Verificar os tenants
    console.log('📋 Verificando tenants:');
    const tenant1 = await client.query(`SELECT name FROM tenants WHERE id = '1e7141a9-9298-40a4-baba-828aab9254ad'`);
    const tenant2 = await client.query(`SELECT name FROM tenants WHERE id = '1386ab45-cd5c-41f9-9601-a710935c1dc5'`);
    
    console.log(`  Tenant 1e7141a9: ${tenant1.rows[0]?.name || 'Não encontrado'}`);
    console.log(`  Tenant 1386ab45: ${tenant2.rows[0]?.name || 'Não encontrado'}`);
    console.log();

    // Diagnóstico
    if (escolas.rows.length > 1) {
      console.log('⚠️  PROBLEMA: Há múltiplas escolas com o mesmo nome!');
      console.log('   Isso pode causar confusão, mas cada uma pertence a um tenant diferente.');
    } else if (escolas.rows.length === 1) {
      console.log('✅ Há apenas 1 escola com esse nome.');
      console.log(`   Ela pertence ao tenant: ${escolas.rows[0].tenant_id}`);
      console.log('\n🔍 Se ela aparece em ambos os tenants, o problema é no filtro do backend.');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await neonPool.end();
  }
}

checkEscolaDuplicada()
  .then(() => {
    console.log('\n✅ Verificação concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verificação falhou:', error.message);
    process.exit(1);
  });
