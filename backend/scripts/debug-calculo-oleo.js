/**
 * DEBUG: Entender por que está dando 30 ao invés de 26
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function debugCalculo() {
  console.log('\n🔍 DEBUG: Cálculo do Óleo\n');
  console.log('═'.repeat(70));

  try {
    // 1. Buscar o pedido mais recente do óleo
    const pedidoResult = await pool.query(`
      SELECT 
        pi.id,
        pi.quantidade as quantidade_pedido,
        pi.unidade as unidade_pedido,
        pi.quantidade_kg,
        pi.quantidade_distribuicao,
        pi.unidade_distribuicao,
        p.nome as produto_nome,
        p.peso as produto_peso,
        p.unidade_distribuicao as produto_unidade,
        cp.peso_embalagem,
        cp.unidade_compra,
        cp.fator_conversao
      FROM pedido_itens pi
      JOIN produtos p ON p.id = pi.produto_id
      JOIN contrato_produtos cp ON cp.id = pi.contrato_produto_id
      WHERE p.nome ILIKE '%óleo%soja%'
      ORDER BY pi.id DESC
      LIMIT 1
    `);

    if (pedidoResult.rows.length === 0) {
      console.log('❌ Nenhum pedido encontrado');
      return;
    }

    const item = pedidoResult.rows[0];
    
    console.log('\n📦 PRODUTO:');
    console.log(`   Nome: ${item.produto_nome}`);
    console.log(`   Peso: ${item.produto_peso}g`);
    console.log(`   Unidade: ${item.produto_unidade}`);
    
    console.log('\n📋 CONTRATO:');
    console.log(`   Peso embalagem: ${item.peso_embalagem}g`);
    console.log(`   Unidade compra: ${item.unidade_compra}`);
    console.log(`   Fator conversão: ${item.fator_conversao}`);
    
    console.log('\n🛒 PEDIDO GERADO:');
    console.log(`   Quantidade: ${item.quantidade_pedido} ${item.unidade_pedido}`);
    console.log(`   Quantidade KG: ${item.quantidade_kg}`);
    console.log(`   Quantidade Distribuição: ${item.quantidade_distribuicao} ${item.unidade_distribuicao}`);
    
    console.log('\n🧮 ANÁLISE:');
    
    // Cenário 1: Se usou quantidade_kg
    if (item.quantidade_kg) {
      const pedidoSeUsouKg = Math.ceil(item.quantidade_kg / item.fator_conversao);
      console.log(`   Se usou quantidade_kg: ${item.quantidade_kg} ÷ ${item.fator_conversao} = ${pedidoSeUsouKg}`);
      console.log(`   Resultado: ${pedidoSeUsouKg === parseFloat(item.quantidade_pedido) ? '✅ MATCH' : '❌ não match'}`);
    }
    
    // Cenário 2: Se usou quantidade_distribuicao
    if (item.quantidade_distribuicao) {
      const pedidoSeUsouDist = Math.ceil(item.quantidade_distribuicao / item.fator_conversao);
      console.log(`   Se usou quantidade_distribuicao: ${item.quantidade_distribuicao} ÷ ${item.fator_conversao} = ${pedidoSeUsouDist}`);
      console.log(`   Resultado: ${pedidoSeUsouDist === parseFloat(item.quantidade_pedido) ? '✅ MATCH' : '❌ não match'}`);
    }
    
    // Cálculo esperado
    const demandaEsperada = 13;
    const pedidoEsperado = Math.ceil(demandaEsperada / item.fator_conversao);
    console.log(`\n   Demanda esperada: ${demandaEsperada} unidades`);
    console.log(`   Pedido esperado: ${demandaEsperada} ÷ ${item.fator_conversao} = ${pedidoEsperado} unidades`);
    console.log(`   Pedido obtido: ${item.quantidade_pedido} unidades`);
    console.log(`   Status: ${pedidoEsperado === parseFloat(item.quantidade_pedido) ? '✅ CORRETO' : '❌ INCORRETO'}`);
    
    // Verificar de onde veio o 30
    console.log('\n🔍 INVESTIGANDO O 30:');
    if (item.quantidade_kg) {
      console.log(`   ${item.quantidade_kg} kg × 1000 = ${item.quantidade_kg * 1000}g`);
      console.log(`   ${item.quantidade_kg * 1000}g ÷ ${item.peso_embalagem}g = ${(item.quantidade_kg * 1000) / item.peso_embalagem} unidades`);
      console.log(`   Math.ceil(${(item.quantidade_kg * 1000) / item.peso_embalagem}) = ${Math.ceil((item.quantidade_kg * 1000) / item.peso_embalagem)}`);
    }
    
    console.log('\n' + '═'.repeat(70));

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

debugCalculo();
