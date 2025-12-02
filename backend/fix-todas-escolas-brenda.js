const { Pool } = require('pg');

const localPool = new Pool({
  connectionString: 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar'
});

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

const TENANT_BRENDA = 'f830d523-25c9-4162-b241-6599df73171b';

async function fixEscolas() {
  try {
    console.log('🔄 Movendo TODAS as escolas para o tenant Brenda Nunes\n');
    
    // LOCAL
    console.log('LOCAL:');
    const localResult = await localPool.query(`
      UPDATE escolas
      SET tenant_id = $1
      WHERE tenant_id != $1 OR tenant_id IS NULL
      RETURNING id, nome
    `, [TENANT_BRENDA]);
    
    console.log(`  ✅ ${localResult.rowCount} escolas atualizadas`);
    if (localResult.rowCount > 0) {
      localResult.rows.forEach(e => console.log(`    - ${e.id}: ${e.nome}`));
    }
    
    console.log('\n' + '-'.repeat(60) + '\n');
    
    // NEON
    console.log('NEON:');
    const neonTenant = await neonPool.query(`
      SELECT id, name FROM tenants ORDER BY created_at LIMIT 1
    `);
    const neonTenantId = neonTenant.rows[0].id;
    
    const neonResult = await neonPool.query(`
      UPDATE escolas
      SET tenant_id = $1
      WHERE tenant_id != $1 OR tenant_id IS NULL
      RETURNING id, nome
    `, [neonTenantId]);
    
    console.log(`  ✅ ${neonResult.rowCount} escolas atualizadas para tenant ${neonTenant.rows[0].name}`);
    if (neonResult.rowCount > 0 && neonResult.rowCount < 20) {
      neonResult.rows.forEach(e => console.log(`    - ${e.id}: ${e.nome}`));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ CORREÇÃO CONCLUÍDA!');
    console.log('='.repeat(60));
    console.log('\nAgora TODAS as escolas pertencem ao mesmo tenant.');
    console.log('Teste novamente a movimentação de estoque.');
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
  } finally {
    await localPool.end();
    await neonPool.end();
  }
}

fixEscolas();
