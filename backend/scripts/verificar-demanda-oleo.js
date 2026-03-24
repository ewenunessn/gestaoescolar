/**
 * VERIFICAÇÃO: Demanda do Óleo de Soja
 * 
 * Compra: 8 Unidades de 450g = 3.600g
 * Demanda: ? (vamos descobrir)
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function verificarDemanda() {
  console.log('\n🔍 VERIFICAÇÃO: Demanda do Óleo de Soja\n');
  console.log('═'.repeat(70));

  try {
    // 1. Buscar produto Óleo
    const produtoResult = await pool.query(`
      SELECT id, nome, unidade_distribuicao, peso
      FROM produtos
      WHERE nome ILIKE '%óleo%soja%'
      LIMIT 1
    `);

    if (produtoResult.rows.length === 0) {
      console.log('❌ Produto Óleo não encontrado');
      return;
    }

    const produto = produtoResult.rows[0];
    console.log('\n📦 PRODUTO (Distribuição):');
    console.log(`   ID: ${produto.id}`);
    console.log(`   Nome: ${produto.nome}`);
    console.log(`   Unidade: ${produto.unidade_distribuicao}`);
    console.log(`   Peso: ${produto.peso}g`);

    // 2. Buscar contrato
    const contratoResult = await pool.query(`
      SELECT 
        cp.id,
        cp.peso_embalagem,
        cp.unidade_compra,
        cp.fator_conversao,
        cp.preco_unitario,
        c.numero as contrato_numero,
        f.nome as fornecedor
      FROM contrato_produtos cp
      JOIN contratos c ON c.id = cp.contrato_id
      JOIN fornecedores f ON f.id = c.fornecedor_id
      WHERE cp.produto_id = $1
      AND c.numero = '253'
    `, [produto.id]);

    if (contratoResult.rows.length === 0) {
      console.log('\n❌ Contrato 253 não encontrado');
      return;
    }

    const contrato = contratoResult.rows[0];
    console.log('\n📋 CONTRATO (Compra):');
    console.log(`   Fornecedor: ${contrato.fornecedor}`);
    console.log(`   Número: ${contrato.contrato_numero}`);
    console.log(`   Unidade: ${contrato.unidade_compra}`);
    console.log(`   Peso embalagem: ${contrato.peso_embalagem}g`);
    console.log(`   Fator conversão: ${contrato.fator_conversao}`);
    console.log(`   Preço unitário: R$ ${parseFloat(contrato.preco_unitario).toFixed(2)}`);

    // 3. Buscar guia de Março/2026
    const guiaResult = await pool.query(`
      SELECT id, mes, ano
      FROM guias
      WHERE mes = 3 AND ano = 2026
      LIMIT 1
    `);

    if (guiaResult.rows.length === 0) {
      console.log('\n⚠️  Guia de Março/2026 não encontrada');
      return;
    }

    const guia = guiaResult.rows[0];
    console.log(`\n📅 Guia: ${guia.mes}/${guia.ano} (ID: ${guia.id})`);

    // 4. Buscar demandas na guia
    console.log('\n' + '═'.repeat(70));
    console.log('\n📋 DEMANDAS NA GUIA:\n');

    const demandasResult = await pool.query(`
      SELECT 
        gpe.escola_id,
        e.nome as escola_nome,
        gpe.quantidade,
        gpe.quantidade_demanda,
        gpe.unidade,
        gpe.data_entrega
      FROM guia_produto_escola gpe
      JOIN escolas e ON e.id = gpe.escola_id
      WHERE gpe.produto_id = $1
      AND gpe.guia_id = $2
      ORDER BY e.nome
    `, [produto.id, guia.id]);

    if (demandasResult.rows.length > 0) {
      let totalAjustado = 0;
      let totalDemanda = 0;

      for (const demanda of demandasResult.rows) {
        const dataEntrega = demanda.data_entrega ? new Date(demanda.data_entrega).toLocaleDateString('pt-BR') : 'N/A';
        console.log(`${demanda.escola_nome}`);
        console.log(`   Qtd Ajustada: ${parseFloat(demanda.quantidade).toFixed(3)} ${demanda.unidade}`);
        console.log(`   Qtd Demanda: ${parseFloat(demanda.quantidade_demanda || demanda.quantidade).toFixed(3)} ${demanda.unidade}`);
        console.log(`   Data Entrega: ${dataEntrega}`);
        console.log('');

        totalAjustado += parseFloat(demanda.quantidade);
        totalDemanda += parseFloat(demanda.quantidade_demanda || demanda.quantidade);
      }

      console.log('─'.repeat(70));
      console.log(`\nTOTAL:`);
      console.log(`   Qtd Ajustada: ${totalAjustado.toFixed(3)} ${demandasResult.rows[0].unidade}`);
      console.log(`   Qtd Demanda: ${totalDemanda.toFixed(3)} ${demandasResult.rows[0].unidade}`);

      // Calcular pedido necessário
      const pedidoNecessario = totalAjustado / contrato.fator_conversao;
      const totalGramasDemanda = totalAjustado * produto.peso;
      const totalGramasPedido = pedidoNecessario * contrato.peso_embalagem;

      console.log(`\n🧮 CÁLCULO DO PEDIDO:`);
      console.log(`   Demanda: ${totalAjustado.toFixed(3)} unidades × ${produto.peso}g = ${totalGramasDemanda.toFixed(0)}g`);
      console.log(`   Fator: ${contrato.fator_conversao}`);
      console.log(`   Pedido: ${totalAjustado.toFixed(3)} ÷ ${contrato.fator_conversao} = ${pedidoNecessario.toFixed(3)} unidades`);
      console.log(`   Pedido em gramas: ${pedidoNecessario.toFixed(3)} × ${contrato.peso_embalagem}g = ${totalGramasPedido.toFixed(0)}g`);
      console.log(`   Preço total: ${pedidoNecessario.toFixed(3)} × R$ ${parseFloat(contrato.preco_unitario).toFixed(2)} = R$ ${(pedidoNecessario * parseFloat(contrato.preco_unitario)).toFixed(2)}`);
      console.log(`\n   Verificação: ${totalGramasDemanda.toFixed(0)}g = ${totalGramasPedido.toFixed(0)}g? ${Math.abs(totalGramasDemanda - totalGramasPedido) < 0.01 ? '✅ CORRETO' : '❌ ERRO'}`);

    } else {
      console.log('⚠️  Nenhuma demanda encontrada para Março/2026');
    }

    console.log('\n' + '═'.repeat(70));

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

verificarDemanda();
