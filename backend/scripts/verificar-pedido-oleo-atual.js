/**
 * VERIFICAÇÃO: Pedido mais recente do Óleo
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function verificarPedido() {
  console.log('\n🔍 VERIFICAÇÃO: Pedido mais recente do Óleo\n');
  console.log('═'.repeat(70));

  try {
    // 1. Buscar o pedido mais recente do óleo
    const pedidoResult = await pool.query(`
      SELECT 
        ped.id as pedido_id,
        ped.numero as pedido_numero,
        ped.data_pedido,
        ped.valor_total as pedido_valor_total,
        pi.id as item_id,
        pi.quantidade as quantidade_compra,
        pi.unidade as unidade_compra,
        pi.quantidade_kg,
        pi.quantidade_distribuicao,
        pi.unidade_distribuicao,
        pi.preco_unitario,
        pi.valor_total as item_valor_total,
        p.nome as produto_nome,
        p.peso as produto_peso,
        p.unidade_distribuicao as produto_unidade,
        cp.peso_embalagem,
        cp.unidade_compra as contrato_unidade,
        cp.fator_conversao,
        f.nome as fornecedor,
        c.numero as contrato_numero
      FROM pedido_itens pi
      JOIN pedidos ped ON ped.id = pi.pedido_id
      JOIN produtos p ON p.id = pi.produto_id
      JOIN contrato_produtos cp ON cp.id = pi.contrato_produto_id
      JOIN contratos c ON c.id = cp.contrato_id
      JOIN fornecedores f ON f.id = c.fornecedor_id
      WHERE p.nome ILIKE '%óleo%soja%'
      ORDER BY ped.id DESC, pi.id DESC
      LIMIT 1
    `);

    if (pedidoResult.rows.length === 0) {
      console.log('❌ Nenhum pedido encontrado');
      return;
    }

    const item = pedidoResult.rows[0];
    
    console.log('\n📋 PEDIDO:');
    console.log(`   Número: ${item.pedido_numero}`);
    console.log(`   Data: ${new Date(item.data_pedido).toLocaleDateString('pt-BR')}`);
    console.log(`   Valor Total: R$ ${parseFloat(item.pedido_valor_total).toFixed(2)}`);
    
    console.log('\n📦 PRODUTO:');
    console.log(`   Nome: ${item.produto_nome}`);
    console.log(`   Peso: ${item.produto_peso}g por ${item.produto_unidade}`);
    
    console.log('\n📋 CONTRATO:');
    console.log(`   Fornecedor: ${item.fornecedor}`);
    console.log(`   Número: ${item.contrato_numero}`);
    console.log(`   Peso embalagem: ${item.peso_embalagem}g`);
    console.log(`   Unidade compra: ${item.contrato_unidade}`);
    console.log(`   Fator conversão: ${item.fator_conversao}`);
    console.log(`   Preço unitário: R$ ${parseFloat(item.preco_unitario).toFixed(2)}`);
    
    console.log('\n🛒 ITEM DO PEDIDO (COMPRA):');
    console.log(`   Quantidade: ${item.quantidade_compra} ${item.unidade_compra}`);
    console.log(`   Preço: R$ ${parseFloat(item.preco_unitario).toFixed(2)} × ${item.quantidade_compra}`);
    console.log(`   Valor Total: R$ ${parseFloat(item.item_valor_total).toFixed(2)}`);
    
    console.log('\n📊 DEMANDA (DISTRIBUIÇÃO):');
    console.log(`   Quantidade: ${item.quantidade_distribuicao} ${item.unidade_distribuicao}`);
    console.log(`   Em KG: ${item.quantidade_kg} kg`);
    console.log(`   Em gramas: ${item.quantidade_kg * 1000}g`);
    
    console.log('\n🧮 VERIFICAÇÃO DO CÁLCULO:');
    
    // Cálculo esperado
    const demanda = parseFloat(item.quantidade_distribuicao);
    const fator = parseFloat(item.fator_conversao);
    const pedidoEsperado = Math.ceil(demanda / fator);
    const pedidoObtido = parseFloat(item.quantidade_compra);
    
    console.log(`   Demanda: ${demanda} unidades de ${item.produto_peso}g`);
    console.log(`   Fator: ${fator}`);
    console.log(`   Pedido esperado: ${demanda} ÷ ${fator} = ${pedidoEsperado} unidades`);
    console.log(`   Pedido obtido: ${pedidoObtido} unidades`);
    console.log(`   Status: ${pedidoEsperado === pedidoObtido ? '✅ CORRETO' : '❌ INCORRETO'}`);
    
    // Verificação em gramas
    const totalGramasDemanda = demanda * item.produto_peso;
    const totalGramasPedido = pedidoObtido * item.peso_embalagem;
    
    console.log('\n📏 VERIFICAÇÃO EM GRAMAS:');
    console.log(`   Demanda: ${demanda} × ${item.produto_peso}g = ${totalGramasDemanda}g`);
    console.log(`   Pedido: ${pedidoObtido} × ${item.peso_embalagem}g = ${totalGramasPedido}g`);
    console.log(`   Diferença: ${Math.abs(totalGramasDemanda - totalGramasPedido)}g`);
    console.log(`   Status: ${Math.abs(totalGramasDemanda - totalGramasPedido) < 1 ? '✅ CORRETO' : '❌ INCORRETO'}`);
    
    // Buscar programações de entrega
    console.log('\n📅 PROGRAMAÇÕES DE ENTREGA:');
    const progResult = await pool.query(`
      SELECT 
        pip.id,
        pip.data_entrega,
        COUNT(pipe.id) as num_escolas,
        SUM(pipe.quantidade) as total_quantidade
      FROM pedido_item_programacoes pip
      LEFT JOIN pedido_item_programacao_escolas pipe ON pipe.programacao_id = pip.id
      WHERE pip.pedido_item_id = $1
      GROUP BY pip.id, pip.data_entrega
    `, [item.item_id]);
    
    for (const prog of progResult.rows) {
      const dataEntrega = new Date(prog.data_entrega).toLocaleDateString('pt-BR');
      console.log(`   ${dataEntrega}: ${prog.num_escolas} escolas, ${parseFloat(prog.total_quantidade).toFixed(3)} unidades`);
    }
    
    console.log('\n' + '═'.repeat(70));

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

verificarPedido();
