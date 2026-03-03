const db = require('../dist/database').default;

async function testarEstoqueCentral() {
  try {
    console.log('🧪 Testando Estoque Central...\n');

    // 1. Buscar um produto para teste
    console.log('1️⃣ Buscando produto para teste...');
    const produtoResult = await db.query('SELECT id, nome, unidade FROM produtos LIMIT 1');
    
    if (produtoResult.rows.length === 0) {
      console.log('❌ Nenhum produto encontrado. Crie produtos primeiro.');
      process.exit(1);
    }

    const produto = produtoResult.rows[0];
    console.log(`   ✅ Produto: ${produto.nome} (ID: ${produto.id})\n`);

    // 2. Registrar entrada
    console.log('2️⃣ Registrando entrada de 100 unidades...');
    const entradaResult = await db.query(`
      INSERT INTO estoque_central (produto_id, quantidade)
      VALUES ($1, 0)
      ON CONFLICT (produto_id) DO NOTHING
      RETURNING id
    `, [produto.id]);

    let estoqueId;
    if (entradaResult.rows.length > 0) {
      estoqueId = entradaResult.rows[0].id;
    } else {
      const estoqueResult = await db.query(
        'SELECT id FROM estoque_central WHERE produto_id = $1',
        [produto.id]
      );
      estoqueId = estoqueResult.rows[0].id;
    }

    // Registrar entrada com lote
    await db.query(`
      UPDATE estoque_central SET quantidade = quantidade + 100 WHERE id = $1
    `, [estoqueId]);

    await db.query(`
      INSERT INTO estoque_central_lotes 
      (estoque_central_id, lote, data_validade, quantidade)
      VALUES ($1, 'LOTE-2026-001', '2026-12-31', 100)
      ON CONFLICT (estoque_central_id, lote) 
      DO UPDATE SET quantidade = estoque_central_lotes.quantidade + 100
    `, [estoqueId]);

    await db.query(`
      INSERT INTO estoque_central_movimentacoes 
      (estoque_central_id, tipo, quantidade, quantidade_anterior, quantidade_posterior, motivo)
      VALUES ($1, 'entrada', 100, 0, 100, 'Compra inicial')
    `, [estoqueId]);

    console.log('   ✅ Entrada registrada\n');

    // 3. Consultar estoque
    console.log('3️⃣ Consultando estoque...');
    const estoqueResult = await db.query(`
      SELECT * FROM vw_estoque_central_completo WHERE produto_id = $1
    `, [produto.id]);

    if (estoqueResult.rows.length > 0) {
      const estoque = estoqueResult.rows[0];
      console.log(`   📦 Quantidade: ${estoque.quantidade}`);
      console.log(`   ✅ Disponível: ${estoque.quantidade_disponivel}`);
      console.log(`   📋 Lotes: ${estoque.total_lotes}`);
      console.log(`   📅 Próxima validade: ${estoque.proxima_validade}\n`);
    }

    // 4. Registrar saída
    console.log('4️⃣ Registrando saída de 30 unidades...');
    await db.query(`
      UPDATE estoque_central SET quantidade = quantidade - 30 WHERE id = $1
    `, [estoqueId]);

    await db.query(`
      UPDATE estoque_central_lotes 
      SET quantidade = quantidade - 30 
      WHERE estoque_central_id = $1 AND lote = 'LOTE-2026-001'
    `, [estoqueId]);

    await db.query(`
      INSERT INTO estoque_central_movimentacoes 
      (estoque_central_id, tipo, quantidade, quantidade_anterior, quantidade_posterior, motivo)
      VALUES ($1, 'saida', -30, 100, 70, 'Transferência para escola')
    `, [estoqueId]);

    console.log('   ✅ Saída registrada\n');

    // 5. Consultar estoque atualizado
    console.log('5️⃣ Consultando estoque atualizado...');
    const estoqueAtualizado = await db.query(`
      SELECT * FROM vw_estoque_central_completo WHERE produto_id = $1
    `, [produto.id]);

    if (estoqueAtualizado.rows.length > 0) {
      const estoque = estoqueAtualizado.rows[0];
      console.log(`   📦 Quantidade: ${estoque.quantidade}`);
      console.log(`   ✅ Disponível: ${estoque.quantidade_disponivel}\n`);
    }

    // 6. Listar movimentações
    console.log('6️⃣ Listando movimentações...');
    const movimentacoes = await db.query(`
      SELECT tipo, quantidade, motivo, created_at
      FROM estoque_central_movimentacoes
      WHERE estoque_central_id = $1
      ORDER BY created_at DESC
    `, [estoqueId]);

    movimentacoes.rows.forEach((mov, index) => {
      console.log(`   ${index + 1}. ${mov.tipo.toUpperCase()}: ${mov.quantidade} - ${mov.motivo}`);
    });

    console.log('\n✅ Teste concluído com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    process.exit(1);
  }
}

testarEstoqueCentral();
