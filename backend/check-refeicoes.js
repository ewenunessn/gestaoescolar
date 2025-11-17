const db = require('./dist/database');

async function checkRefeicoes() {
  try {
    const tenantId = '1cc9b18f-2b7d-412d-bb6d-4b8055e9590f';
    
    console.log('🔍 Verificando refeições...\n');
    
    // Refeições com tenant
    const refeicoes = await db.query(`
      SELECT id, nome, descricao, ativo, tenant_id
      FROM refeicoes
      WHERE tenant_id = $1
      ORDER BY nome
    `, [tenantId]);
    
    console.log(`✅ Refeições encontradas: ${refeicoes.rows.length}\n`);
    
    if (refeicoes.rows.length > 0) {
      refeicoes.rows.forEach(r => {
        console.log(`  - ${r.nome} (ID: ${r.id}, Ativo: ${r.ativo ? 'Sim' : 'Não'})`);
        if (r.descricao) console.log(`    Descrição: ${r.descricao}`);
      });
    }
    
    // Verificar se existe "Arroz com carne moída"
    console.log('\n🔍 Procurando "Arroz com carne moída"...\n');
    const arrozCarne = await db.query(`
      SELECT id, nome, descricao, ativo, tenant_id
      FROM refeicoes
      WHERE nome ILIKE '%arroz%carne%'
      ORDER BY nome
    `);
    
    if (arrozCarne.rows.length > 0) {
      console.log('✅ Encontrado:');
      arrozCarne.rows.forEach(r => {
        console.log(`  - ${r.nome} (ID: ${r.id}, Tenant: ${r.tenant_id})`);
      });
    } else {
      console.log('⚠️  Não encontrado');
    }
    
    // Total de refeições
    console.log('\n📊 Estatísticas:');
    const total = await db.query('SELECT COUNT(*) as total FROM refeicoes');
    console.log(`  Total geral: ${total.rows[0].total}`);
    
    const comTenant = await db.query('SELECT COUNT(*) as total FROM refeicoes WHERE tenant_id IS NOT NULL');
    console.log(`  Com tenant: ${comTenant.rows[0].total}`);
    
    const semTenant = await db.query('SELECT COUNT(*) as total FROM refeicoes WHERE tenant_id IS NULL');
    console.log(`  Sem tenant: ${semTenant.rows[0].total}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

checkRefeicoes();
