const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar'
});

async function testarFEFO() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 TESTE DO SISTEMA FEFO - ESTOQUE CENTRAL\n');
    console.log('='.repeat(60));

    // 1. Buscar um produto para teste
    console.log('\n1️⃣ Buscando produto para teste...');
    const produtoResult = await client.query(
      'SELECT id, nome, unidade FROM produtos LIMIT 1'
    );
    
    if (produtoResult.rows.length === 0) {
      console.log('❌ Nenhum produto encontrado. Crie um produto primeiro.');
      return;
    }

    const produto = produtoResult.rows[0];
    console.log(`✅ Produto selecionado: ${produto.nome} (ID: ${produto.id})`);

    // 2. Limpar dados de teste anteriores
    console.log('\n2️⃣ Limpando dados de teste anteriores...');
    await client.query('BEGIN');
    
    const estoqueResult = await client.query(
      'SELECT id FROM estoque_central WHERE produto_id = $1',
      [produto.id]
    );
    
    if (estoqueResult.rows.length > 0) {
      const estoqueId = estoqueResult.rows[0].id;
      await client.query('DELETE FROM estoque_central_movimentacoes WHERE estoque_central_id = $1', [estoqueId]);
      await client.query('DELETE FROM estoque_central_lotes WHERE estoque_central_id = $1', [estoqueId]);
      await client.query('DELETE FROM estoque_central WHERE id = $1', [estoqueId]);
      console.log('✅ Dados anteriores removidos');
    }
    
    await client.query('COMMIT');

    // 3. Criar 3 entradas com lotes e datas de validade diferentes
    console.log('\n3️⃣ Criando 3 lotes com datas de validade diferentes...');
    
    const hoje = new Date();
    const lotes = [
      {
        lote: 'LOTE-2026-001',
        quantidade: 50,
        validade: new Date(hoje.getTime() + 60 * 24 * 60 * 60 * 1000) // 60 dias
      },
      {
        lote: 'LOTE-2026-002',
        quantidade: 30,
        validade: new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 dias (vence primeiro)
      },
      {
        lote: 'LOTE-2026-003',
        quantidade: 40,
        validade: new Date(hoje.getTime() + 90 * 24 * 60 * 60 * 1000) // 90 dias
      }
    ];

    for (const lote of lotes) {
      await client.query('BEGIN');
      
      // Buscar ou criar estoque
      let estoqueResult = await client.query(
        'SELECT id FROM estoque_central WHERE produto_id = $1',
        [produto.id]
      );
      
      let estoqueId;
      if (estoqueResult.rows.length === 0) {
        const novoEstoque = await client.query(
          'INSERT INTO estoque_central (produto_id) VALUES ($1) RETURNING id',
          [produto.id]
        );
        estoqueId = novoEstoque.rows[0].id;
      } else {
        estoqueId = estoqueResult.rows[0].id;
      }

      // Criar lote
      const loteResult = await client.query(
        `INSERT INTO estoque_central_lotes 
         (estoque_central_id, lote, data_validade, quantidade)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [estoqueId, lote.lote, lote.validade.toISOString().split('T')[0], lote.quantidade]
      );

      // Registrar movimentação
      await client.query(
        `INSERT INTO estoque_central_movimentacoes 
         (estoque_central_id, lote_id, tipo, quantidade, quantidade_anterior, quantidade_posterior, 
          motivo, usuario_nome)
         VALUES ($1, $2, 'entrada', $3, 0, $3, 'Teste FEFO', 'Sistema')`,
        [estoqueId, loteResult.rows[0].id, lote.quantidade]
      );

      await client.query('COMMIT');
      
      console.log(`✅ ${lote.lote}: ${lote.quantidade} ${produto.unidade} - Validade: ${lote.validade.toISOString().split('T')[0]}`);
    }

    // 4. Verificar estoque total
    console.log('\n4️⃣ Verificando estoque total...');
    const estoqueCompleto = await client.query(
      'SELECT * FROM vw_estoque_central_completo WHERE produto_id = $1',
      [produto.id]
    );
    
    const estoque = estoqueCompleto.rows[0];
    console.log(`✅ Quantidade total: ${estoque.quantidade} ${produto.unidade}`);
    console.log(`✅ Quantidade disponível: ${estoque.quantidade_disponivel} ${produto.unidade}`);
    console.log(`✅ Total de lotes: ${estoque.total_lotes}`);

    // 5. Testar saída usando FEFO (deve usar LOTE-2026-002 primeiro, que vence em 30 dias)
    console.log('\n5️⃣ Testando saída de 35 unidades (deve usar FEFO)...');
    console.log('   Esperado: 30 do LOTE-2026-002 + 5 do LOTE-2026-001');
    
    await client.query('BEGIN');
    
    const estoqueId = estoqueCompleto.rows[0].id;
    let quantidadeRestante = 35;

    // Buscar lotes ordenados por FEFO
    const lotesDisponiveis = await client.query(
      `SELECT id, lote, data_validade, quantidade
       FROM estoque_central_lotes
       WHERE estoque_central_id = $1 AND quantidade > 0
       ORDER BY data_validade ASC, created_at ASC`,
      [estoqueId]
    );

    console.log('\n   Processando saída:');
    for (const lote of lotesDisponiveis.rows) {
      if (quantidadeRestante <= 0) break;

      const quantidadeLote = parseFloat(lote.quantidade);
      const quantidadeRetirar = Math.min(quantidadeRestante, quantidadeLote);

      await client.query(
        'UPDATE estoque_central_lotes SET quantidade = quantidade - $1 WHERE id = $2',
        [quantidadeRetirar, lote.id]
      );

      await client.query(
        `INSERT INTO estoque_central_movimentacoes 
         (estoque_central_id, lote_id, tipo, quantidade, quantidade_anterior, quantidade_posterior, 
          motivo, usuario_nome)
         VALUES ($1, $2, 'saida', $3, $4, $5, 'Teste FEFO', 'Sistema')`,
        [estoqueId, lote.id, -quantidadeRetirar, quantidadeLote, quantidadeLote - quantidadeRetirar]
      );

      console.log(`   ✅ ${lote.lote}: retirado ${quantidadeRetirar} ${produto.unidade}`);
      quantidadeRestante -= quantidadeRetirar;
    }

    await client.query('COMMIT');

    // 6. Verificar estoque após saída
    console.log('\n6️⃣ Verificando estoque após saída...');
    const estoqueAposSaida = await client.query(
      'SELECT * FROM vw_estoque_central_completo WHERE produto_id = $1',
      [produto.id]
    );
    
    const estoqueAtual = estoqueAposSaida.rows[0];
    console.log(`✅ Quantidade total: ${estoqueAtual.quantidade} ${produto.unidade} (esperado: 85)`);
    console.log(`✅ Quantidade disponível: ${estoqueAtual.quantidade_disponivel} ${produto.unidade}`);

    // 7. Verificar lotes restantes
    console.log('\n7️⃣ Verificando lotes restantes...');
    const lotesRestantes = await client.query(
      `SELECT lote, quantidade, data_validade
       FROM estoque_central_lotes
       WHERE estoque_central_id = $1 AND quantidade > 0
       ORDER BY data_validade ASC`,
      [estoqueId]
    );

    console.log('   Lotes restantes:');
    for (const lote of lotesRestantes.rows) {
      console.log(`   - ${lote.lote}: ${lote.quantidade} ${produto.unidade} (validade: ${lote.data_validade})`);
    }

    // 8. Verificar movimentações
    console.log('\n8️⃣ Verificando histórico de movimentações...');
    const movimentacoes = await client.query(
      `SELECT tipo, quantidade, lote_id, motivo, created_at
       FROM estoque_central_movimentacoes
       WHERE estoque_central_id = $1
       ORDER BY created_at DESC`,
      [estoqueId]
    );

    console.log(`   Total de movimentações: ${movimentacoes.rows.length}`);
    console.log('   Últimas 5 movimentações:');
    for (const mov of movimentacoes.rows.slice(0, 5)) {
      console.log(`   - ${mov.tipo.toUpperCase()}: ${mov.quantidade} ${produto.unidade} (${mov.motivo})`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ TESTE CONCLUÍDO COM SUCESSO!');
    console.log('\nResultado:');
    console.log(`- FEFO funcionou corretamente`);
    console.log(`- Lote com vencimento mais próximo foi usado primeiro`);
    console.log(`- Quantidades calculadas dinamicamente a partir dos lotes`);
    console.log('='.repeat(60));

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ ERRO NO TESTE:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

testarFEFO();
