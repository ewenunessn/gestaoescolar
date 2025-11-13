const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function checkEscolaTenant() {
  const client = await neonPool.connect();
  
  try {
    console.log('🔍 Verificando escola "Ewerton Nunes"...\n');

    const escola = await client.query(`
      SELECT id, nome, tenant_id, created_at
      FROM escolas 
      WHERE nome LIKE '%Ewerton%'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log(`📊 Escolas encontradas: ${escola.rows.length}\n`);
    
    escola.rows.forEach(e => {
      console.log(`Escola: ${e.nome}`);
      console.log(`  ID: ${e.id}`);
      console.log(`  Tenant ID: ${e.tenant_id || '❌ NULL'}`);
      console.log(`  Criada em: ${e.created_at}`);
      console.log();
    });

    if (escola.rows.length > 0 && !escola.rows[0].tenant_id) {
      console.log('⚠️  A escola não tem tenant_id!');
      console.log('💡 Isso faz com que ela apareça em todos os tenants.');
      console.log('\n🔧 Para corrigir, a escola precisa ter um tenant_id específico.');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await neonPool.end();
  }
}

checkEscolaTenant()
  .then(() => {
    console.log('\n✅ Verificação concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verificação falhou:', error.message);
    process.exit(1);
  });
