/**
 * TESTE: Cenário Óleo 900g vs 450g
 * 
 * Produto (Distribuição): Óleo, UN, 900g
 * Contrato (Compra): Óleo, UN, 450g
 * 
 * Demanda: 6 unidades de 900g = 5.400g total
 * Pedido esperado: 12 unidades de 450g = 5.400g total
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function testarCenario() {
  console.log('\n🧪 TESTE: Cenário Óleo 900g vs 450g\n');
  console.log('═'.repeat(60));

  try {
    // 1. Buscar produto Óleo
    const produtoResult = await pool.query(`
      SELECT id, nome, unidade_distribuicao, peso
      FROM produtos
      WHERE nome ILIKE '%óleo%'
      LIMIT 1
    `);

    if (produtoResult.rows.length === 0) {
      console.log('❌ Produto Óleo não encontrado');
      return;
    }

    const produto = produtoResult.rows[0];
    console.log('\n📦 PRODUTO (Distribuição):');
    console.log(`   Nome: ${produto.nome}`);
    console.log(`   Unidade: ${produto.unidade_distribuicao}`);
    console.log(`   Peso: ${produto.peso}g`);

    // 2. Buscar contrato do produto
    const contratoResult = await pool.query(`
      SELECT 
        cp.id,
        cp.peso_embalagem,
        cp.unidade_compra,
        cp.fator_conversao,
        c.numero as contrato_numero
      FROM contrato_produtos cp
      JOIN contratos c ON c.id = cp.contrato_id
      WHERE cp.produto_id = $1
      AND cp.ativo = true
      ORDER BY c.created_at DESC
      LIMIT 1
    `, [produto.id]);

    if (contratoResult.rows.length === 0) {
      console.log('\n❌ Contrato não encontrado para este produto');
      return;
    }

    const contrato = contratoResult.rows[0];
    console.log('\n📋 CONTRATO (Compra):');
    console.log(`   Número: ${contrato.contrato_numero}`);
    console.log(`   Unidade: ${contrato.unidade_compra}`);
    console.log(`   Peso embalagem: ${contrato.peso_embalagem}g`);
    console.log(`   Fator conversão: ${contrato.fator_conversao}`);

    // 3. Calcular fator esperado
    const fatorEsperado = contrato.peso_embalagem / produto.peso;
    console.log('\n🧮 CÁLCULO DO FATOR:');
    console.log(`   fator = peso_embalagem / peso_produto`);
    console.log(`   fator = ${contrato.peso_embalagem}g / ${produto.peso}g`);
    console.log(`   fator = ${fatorEsperado}`);

    // 4. Simular demanda
    const demanda = 6; // 6 unidades de 900g
    const totalGramasDemanda = demanda * produto.peso;
    
    console.log('\n📊 DEMANDA:');
    console.log(`   Quantidade: ${demanda} unidades de ${produto.peso}g`);
    console.log(`   Total: ${totalGramasDemanda}g`);

    // 5. Calcular pedido
    const quantidadePedido = demanda / contrato.fator_conversao;
    const totalGramasPedido = quantidadePedido * contrato.peso_embalagem;

    console.log('\n🛒 PEDIDO:');
    console.log(`   Cálculo: demanda / fator = ${demanda} / ${contrato.fator_conversao}`);
    console.log(`   Quantidade: ${quantidadePedido} unidades de ${contrato.peso_embalagem}g`);
    console.log(`   Total: ${totalGramasPedido}g`);

    // 6. Verificação
    console.log('\n✅ VERIFICAÇÃO:');
    const diferenca = Math.abs(totalGramasDemanda - totalGramasPedido);
    if (diferenca < 0.01) {
      console.log(`   ✅ CORRETO! Demanda (${totalGramasDemanda}g) = Pedido (${totalGramasPedido}g)`);
    } else {
      console.log(`   ❌ ERRO! Demanda (${totalGramasDemanda}g) ≠ Pedido (${totalGramasPedido}g)`);
      console.log(`   Diferença: ${diferenca}g`);
    }

    // 7. Teste com cenário específico: 900g vs 450g
    console.log('\n' + '═'.repeat(60));
    console.log('\n🎯 TESTE CENÁRIO ESPECÍFICO: 900g vs 450g\n');
    
    const cenario = {
      produto_peso: 900,
      produto_unidade: 'UN',
      contrato_peso: 450,
      contrato_unidade: 'UN',
      demanda: 6
    };

    const fator = cenario.contrato_peso / cenario.produto_peso;
    const pedido = cenario.demanda / fator;
    const total_demanda = cenario.demanda * cenario.produto_peso;
    const total_pedido = pedido * cenario.contrato_peso;

    console.log('📦 Produto: UN, 900g');
    console.log('📋 Contrato: UN, 450g');
    console.log(`\n🧮 Fator: ${cenario.contrato_peso} / ${cenario.produto_peso} = ${fator}`);
    console.log(`\n📊 Demanda: ${cenario.demanda} unidades × ${cenario.produto_peso}g = ${total_demanda}g`);
    console.log(`🛒 Pedido: ${pedido} unidades × ${cenario.contrato_peso}g = ${total_pedido}g`);
    
    if (Math.abs(total_demanda - total_pedido) < 0.01) {
      console.log(`\n✅ PERFEITO! O sistema calcula corretamente!`);
      console.log(`   Se a demanda é ${cenario.demanda} unidades, o pedido será ${pedido} unidades`);
    }

    console.log('\n' + '═'.repeat(60));

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

testarCenario();
