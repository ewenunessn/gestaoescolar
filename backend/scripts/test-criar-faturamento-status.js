/**
 * Script para testar se criar faturamento altera o status do pedido
 * 
 * Problema relatado:
 * - Criar um pedido
 * - Criar um faturamento
 * - Verificar se o status mudou para "concluído" (não deveria)
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testarCriacaoFaturamento() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testando criação de faturamento e impacto no status do pedido...\n');
    
    await client.query('BEGIN');
    
    // 1. Buscar um contrato ativo com produtos
    const contratoResult = await client.query(`
      SELECT c.id, c.numero
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
    console.log(`✅ Contrato encontrado: ${contratoResult.rows[0].numero}`);
    
    // Buscar produtos do contrato
    const produtosResult = await client.query(`
      SELECT id, produto_id, preco_unitario
      FROM contrato_produtos
      WHERE contrato_id = $1 AND ativo = true
      LIMIT 1
    `, [contratoId]);
    
    const produto = produtosResult.rows[0];
    
    // 2. Criar pedido com status pendente
    const pedidoResult = await client.query(`
      INSERT INTO pedidos (numero, status, valor_total, competencia_mes_ano, usuario_criacao_id)
      VALUES ('TEST-FAT-' || EXTRACT(EPOCH FROM NOW())::TEXT, 'pendente', 100, '2026-03', 1)
      RETURNING id, numero, status
    `);
    
    const pedidoId = pedidoResult.rows[0].id;
    const pedidoNumero = pedidoResult.rows[0].numero;
    const statusInicial = pedidoResult.rows[0].status;
    
    console.log(`✅ Pedido criado: ${pedidoNumero}`);
    console.log(`   Status inicial: ${statusInicial}\n`);
    
    // Inserir item no pedido
    const itemResult = await client.query(`
      INSERT INTO pedido_itens (pedido_id, contrato_produto_id, produto_id, quantidade, preco_unitario, valor_total)
      VALUES ($1, $2, $3, 10, $4::numeric, 10 * $4::numeric)
      RETURNING id
    `, [pedidoId, produto.id, produto.produto_id, produto.preco_unitario]);
    
    const itemId = itemResult.rows[0].id;
    console.log(`✅ Item criado: ID ${itemId}\n`);
    
    // 3. Criar faturamento (simulando o que o controller faz)
    console.log('📝 Criando faturamento...\n');
    
    const faturamentoResult = await client.query(`
      INSERT INTO faturamentos_pedidos (pedido_id, usuario_id, observacoes)
      VALUES ($1, 1, 'Faturamento de teste')
      RETURNING id
    `, [pedidoId]);
    
    const faturamentoId = faturamentoResult.rows[0].id;
    console.log(`✅ Faturamento criado: ID ${faturamentoId}\n`);
    
    // Buscar modalidade
    const modalidadeResult = await client.query(`SELECT id FROM modalidades LIMIT 1`);
    const modalidadeId = modalidadeResult.rows[0].id;
    
    // Criar item do faturamento
    await client.query(`
      INSERT INTO faturamentos_itens (
        faturamento_pedido_id,
        pedido_item_id,
        modalidade_id,
        quantidade_alocada,
        preco_unitario
      )
      VALUES ($1, $2, $3, 5, $4)
    `, [faturamentoId, itemId, modalidadeId, produto.preco_unitario]);
    
    console.log(`✅ Item do faturamento criado\n`);
    
    // 4. Verificar status do pedido APÓS criar faturamento
    const pedidoDepoisResult = await client.query(`
      SELECT id, numero, status
      FROM pedidos
      WHERE id = $1
    `, [pedidoId]);
    
    const statusDepois = pedidoDepoisResult.rows[0].status;
    
    console.log('📊 Resultado:');
    console.log(`   Status ANTES do faturamento: ${statusInicial}`);
    console.log(`   Status DEPOIS do faturamento: ${statusDepois}\n`);
    
    if (statusInicial !== statusDepois) {
      console.log(`❌ PROBLEMA ENCONTRADO!`);
      console.log(`   O status mudou de "${statusInicial}" para "${statusDepois}"`);
      console.log(`   Isso NÃO deveria acontecer ao criar faturamento!\n`);
    } else {
      console.log(`✅ Status permaneceu "${statusInicial}"`);
      console.log(`   Comportamento correto!\n`);
    }
    
    // 5. Testar mudança manual de status
    console.log('🧪 Testando mudança manual de status para "concluido"...\n');
    
    await client.query(`
      UPDATE pedidos
      SET status = 'concluido'
      WHERE id = $1
    `, [pedidoId]);
    
    console.log(`✅ Status alterado para "concluido"\n`);
    
    // 6. Tentar voltar para pendente
    console.log('🧪 Testando mudança de "concluido" para "pendente"...\n');
    
    try {
      await client.query(`
        UPDATE pedidos
        SET status = 'pendente'
        WHERE id = $1
      `, [pedidoId]);
      
      console.log(`✅ Status alterado para "pendente" com sucesso!\n`);
    } catch (error) {
      console.log(`❌ ERRO ao alterar status: ${error.message}\n`);
    }
    
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

testarCriacaoFaturamento()
  .then(() => {
    console.log('\n✅ Teste concluído!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Teste falhou:', error);
    process.exit(1);
  });
