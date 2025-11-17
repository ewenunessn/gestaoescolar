const db = require('./dist/database');

async function checkEscolas() {
  try {
    const tenantId = '1cc9b18f-2b7d-412d-bb6d-4b8055e9590f';
    
    const result = await db.query(`
      SELECT id, nome, codigo_acesso, ativo
      FROM escolas
      WHERE tenant_id = $1
      ORDER BY nome
      LIMIT 10
    `, [tenantId]);
    
    console.log(`✅ Escolas encontradas para Escola de Teste: ${result.rows.length}\n`);
    
    if (result.rows.length > 0) {
      result.rows.forEach(e => {
        console.log(`  - ${e.nome} (Código: ${e.codigo_acesso}, Ativo: ${e.ativo ? 'Sim' : 'Não'})`);
      });
    } else {
      console.log('⚠️  Nenhuma escola encontrada para este tenant');
      console.log('\n💡 Você precisa cadastrar escolas para usar a movimentação de estoque por escola');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

checkEscolas();
