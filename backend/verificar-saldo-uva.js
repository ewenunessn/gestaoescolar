const db = require('./src/database');

async function verificarSaldoUva() {
  try {
    console.log('🔍 Verificando saldo do produto Uva no contrato 002/25...\n');
    
    // 1. Buscar o produto Uva
    const produto = await db.get(`
      SELECT id, nome FROM produtos WHERE nome ILIKE '%uva%'
    `);
    console.log('📦 Produto encontrado:', produto);
    
    // 2. Buscar o contrato 002/25
    const contrato = await db.get(`
      SELECT id, numero FROM contratos WHERE numero = '002/25'
    `);
    console.log('📄 Contrato encontrado:', contrato);
    
    if (!produto || !contrato) {
      console.log('❌ Produto ou contrato não encontrado!');
      process.exit(1);
    }
    
    // 3. Buscar contrato_produtos
    const contratoProduto = await db.get(`
      SELECT * FROM contrato_produtos 
      WHERE contrato_id = $1 AND produto_id = $2
    `, [contrato.id, produto.id]);
    console.log('\n📋 Contrato Produto:', contratoProduto);
    
    if (!contratoProduto) {
      console.log('❌ Produto não está vinculado ao contrato!');
      process.exit(1);
    }
    
    // 4. Buscar saldos por modalidade
    const saldos = await db.all(`
      SELECT 
        cpm.*,
        m.nome as modalidade_nome
      FROM contrato_produtos_modalidades cpm
      JOIN modalidades m ON cpm.modalidade_id = m.id
      WHERE cpm.contrato_produto_id = $1
    `, [contratoProduto.id]);
    
    console.log('\n💰 Saldos por modalidade:');
    if (saldos.length === 0) {
      console.log('❌ Nenhum saldo configurado!');
    } else {
      saldos.forEach(s => {
        console.log(`  - ${s.modalidade_nome}: Inicial=${s.quantidade_inicial}, Disponível=${s.quantidade_disponivel}, Ativo=${s.ativo}`);
      });
    }
    
    // 5. Testar a query que está sendo usada no faturamento
    console.log('\n🧪 Testando query do faturamento...');
    const saldosQuery = `
      SELECT 
        cpm.modalidade_id,
        cpm.quantidade_disponivel,
        cpm.quantidade_inicial,
        m.nome as modalidade_nome,
        m.valor_repasse
      FROM contrato_produtos_modalidades cpm
      JOIN contrato_produtos cp ON cpm.contrato_produto_id = cp.id
      JOIN modalidades m ON cpm.modalidade_id = m.id
      WHERE cp.contrato_id = $1
        AND cp.produto_id = $2
        AND cpm.ativo = true
        AND m.ativo = true
    `;
    
    const saldosResult = await db.all(saldosQuery, [contrato.id, produto.id]);
    console.log(`✅ Query retornou ${saldosResult.length} registros:`);
    saldosResult.forEach(s => {
      console.log(`  - ${s.modalidade_nome}: Inicial=${s.quantidade_inicial}, Disponível=${s.quantidade_disponivel}`);
    });
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

verificarSaldoUva();
