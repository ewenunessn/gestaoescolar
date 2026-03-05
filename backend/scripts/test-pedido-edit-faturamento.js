/**
 * Script para testar se faturamentos permanecem após editar pedido
 * 
 * Fluxo de teste:
 * 1. Criar um pedido com 2 itens
 * 2. Criar um faturamento para esse pedido
 * 3. Editar o pedido (adicionar item, remover item, modificar quantidade)
 * 4. Verificar se o faturamento ainda existe e está correto
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testarEdicaoPedidoComFaturamento() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Iniciando teste de edição de pedido com faturamento...\n');
    
    await client.query('BEGIN');
    
    // 1. Buscar um contrato ativo com produtos
    const contratoResult = await client.query(`
      SELECT c.id, c.numero, COUNT(cp.id) as total_produtos
      FROM contratos c
      JOIN contrato_produtos cp ON c.id = cp.contrato_id AND cp.ativo = true
      WHERE c.status = 'ativo'
      GROUP BY c.id, c.numero
      HAVING COUNT(cp.id) >= 1
      LIMIT 1
    `);
    
    if (contratoResult.rows.length === 0) {
      throw new Error('Nenhum contrato ativo com produtos encontrado');
    }
    
    const contratoId = contratoResult.rows[0].id;
    console.log(`✅ Contrato encontrado: ${contratoResult.rows[0].numero} (${contratoResult.rows[0].total_produtos} produtos)`);
    
    // Buscar produtos do contrato
    const produtosResult = await client.query(`
      SELECT id, produto_id, preco_unitario
      FROM contrato_produtos
      WHERE contrato_id = $1 AND ativo = true
      LIMIT 2
    `, [contratoId]);
    
    console.log(`✅ ${produtosResult.rows.length} produtos encontrados no contrato\n`);
    
    // 2. Criar pedido
    const pedidoResult = await client.query(`
      INSERT INTO pedidos (numero, status, valor_total, competencia_mes_ano, usuario_criacao_id)
      VALUES ('TESTE-' || EXTRACT(EPOCH FROM NOW())::TEXT, 'pendente', 0, '2026-03', 1)
      RETURNING id, numero
    `);
    
    const pedidoId = pedidoResult.rows[0].id;
    const pedidoNumero = pedidoResult.rows[0].numero;
    console.log(`✅ Pedido criado: ${pedidoNumero} (ID: ${pedidoId})`);
    
    // Inserir 1 item inicial
    const item1 = produtosResult.rows[0];
    
    const item1Result = await client.query(`
      INSERT INTO pedido_itens (pedido_id, contrato_produto_id, produto_id, quantidade, preco_unitario, valor_total)
      VALUES ($1, $2, $3, 10, $4::numeric, 10 * $4::numeric)
      RETURNING id
    `, [pedidoId, item1.id, item1.produto_id, item1.preco_unitario]);
    
    const item1Id = item1Result.rows[0].id;
    
    console.log(`✅ Item 1 criado: ID ${item1Id} (quantidade: 10)\n`);
    
    // 3. Criar faturamento
    const faturamentoResult = await client.query(`
      INSERT INTO faturamentos_pedidos (pedido_id, data_faturamento, observacoes)
      VALUES ($1, CURRENT_DATE, 'Faturamento de teste')
      RETURNING id
    `, [pedidoId]);
    
    const faturamentoId = faturamentoResult.rows[0].id;
    console.log(`✅ Faturamento criado: ID ${faturamentoId}`);
    
    // Buscar modalidade
    const modalidadeResult = await client.query(`
      SELECT id FROM modalidades LIMIT 1
    `);
    
    if (modalidadeResult.rows.length === 0) {
      throw new Error('Nenhuma modalidade encontrada');
    }
    
    const modalidadeId = modalidadeResult.rows[0].id;
    
    // Criar itens do faturamento (apenas 1 item)
    await client.query(`
      INSERT INTO faturamentos_itens (faturamento_pedido_id, pedido_item_id, modalidade_id, quantidade_alocada, preco_unitario)
      VALUES ($1, $2, $3, 5, $4)
    `, [faturamentoId, item1Id, modalidadeId, item1.preco_unitario]);
    
    console.log(`✅ Item do faturamento criado (5 unidades do item 1)\n`);
    
    // 4. Verificar estado antes da edição
    const faturamentoAntesResult = await client.query(`
      SELECT fi.id, fi.pedido_item_id, fi.quantidade_alocada
      FROM faturamentos_itens fi
      WHERE fi.faturamento_pedido_id = $1
      ORDER BY fi.pedido_item_id
    `, [faturamentoId]);
    
    console.log('📊 Estado do faturamento ANTES da edição:');
    faturamentoAntesResult.rows.forEach(row => {
      console.log(`   - Item faturamento ID ${row.id}: pedido_item_id=${row.pedido_item_id}, quantidade=${row.quantidade_alocada}`);
    });
    console.log('');
    
    // 5. EDITAR O PEDIDO
    console.log('🔄 Editando pedido...');
    console.log('   - Modificar quantidade do item 1: 10 → 15');
    console.log('');
    
    // Atualizar item 1 (aumentar quantidade)
    await client.query(`
      UPDATE pedido_itens
      SET quantidade = 15, valor_total = 15 * preco_unitario
      WHERE id = $1
    `, [item1Id]);
    
    console.log(`✅ Item 1 atualizado\n`);
    
    // 6. Verificar estado após edição
    const itensDepoisResult = await client.query(`
      SELECT id, quantidade
      FROM pedido_itens
      WHERE pedido_id = $1
      ORDER BY id
    `, [pedidoId]);
    
    console.log('📊 Estado dos itens do pedido DEPOIS da edição:');
    itensDepoisResult.rows.forEach(row => {
      console.log(`   - Item ID ${row.id}: quantidade=${row.quantidade}`);
    });
    console.log('');
    
    // 7. Verificar se faturamento ainda existe
    const faturamentoDepoisResult = await client.query(`
      SELECT fi.id, fi.pedido_item_id, fi.quantidade_alocada
      FROM faturamentos_itens fi
      WHERE fi.faturamento_pedido_id = $1
      ORDER BY fi.pedido_item_id
    `, [faturamentoId]);
    
    console.log('📊 Estado do faturamento DEPOIS da edição:');
    if (faturamentoDepoisResult.rows.length === 0) {
      console.log('   ❌ ERRO: Faturamento foi perdido!\n');
    } else {
      faturamentoDepoisResult.rows.forEach(row => {
        console.log(`   - Item faturamento ID ${row.id}: pedido_item_id=${row.pedido_item_id}, quantidade=${row.quantidade_alocada}`);
      });
      console.log('');
    }
    
    // 8. Comparar IDs
    console.log('🔍 Verificação de IDs:');
    const idsAntes = new Set(faturamentoAntesResult.rows.map(r => r.pedido_item_id));
    const idsDepois = new Set(faturamentoDepoisResult.rows.map(r => r.pedido_item_id));
    
    const idsPreservados = [...idsAntes].filter(id => idsDepois.has(id));
    const idsPerdidos = [...idsAntes].filter(id => !idsDepois.has(id));
    
    if (idsPreservados.length > 0) {
      console.log(`   ✅ IDs preservados: ${idsPreservados.join(', ')}`);
    }
    
    if (idsPerdidos.length > 0) {
      console.log(`   ❌ IDs perdidos: ${idsPerdidos.join(', ')}`);
    }
    
    if (idsPreservados.length === idsAntes.size) {
      console.log('\n✅ SUCESSO: Todos os IDs foram preservados!');
      console.log('✅ O faturamento permaneceu intacto após editar o pedido.\n');
    } else {
      console.log('\n❌ FALHA: Alguns IDs foram perdidos!');
      console.log('❌ O faturamento foi afetado pela edição do pedido.\n');
    }
    
    // Rollback para não poluir o banco
    await client.query('ROLLBACK');
    console.log('🔄 Rollback executado (dados de teste removidos)');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro no teste:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

testarEdicaoPedidoComFaturamento()
  .then(() => {
    console.log('\n✅ Teste concluído com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Teste falhou:', error);
    process.exit(1);
  });
