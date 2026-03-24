/**
 * SOLUÇÃO DEFINITIVA: Padronizar peso do Óleo para 450g
 * 
 * Isso elimina TODOS os problemas de conversão:
 * - Produto: 450g
 * - Contrato: 450g
 * - Fator: 1.0
 * - Sem conversão necessária!
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function padronizarPeso() {
  console.log('\n🔧 PADRONIZAÇÃO: Ajustar peso do Óleo para 450g\n');
  console.log('═'.repeat(70));
  console.log('\n⚠️  ATENÇÃO: Esta operação irá:');
  console.log('   1. Mudar o peso do produto de 900g para 450g');
  console.log('   2. Atualizar o fator de conversão para 1.0');
  console.log('   3. Multiplicar por 2 as quantidades nos cardápios');
  console.log('\n   Isso ELIMINA a necessidade de conversão!\n');
  console.log('═'.repeat(70));

  try {
    // 1. Buscar produto Óleo
    const produtoResult = await pool.query(`
      SELECT id, nome, peso, unidade_distribuicao
      FROM produtos
      WHERE nome ILIKE '%óleo%soja%'
      LIMIT 1
    `);

    if (produtoResult.rows.length === 0) {
      console.log('❌ Produto Óleo não encontrado');
      return;
    }

    const produto = produtoResult.rows[0];
    console.log('\n📦 PRODUTO ATUAL:');
    console.log(`   ID: ${produto.id}`);
    console.log(`   Nome: ${produto.nome}`);
    console.log(`   Peso: ${produto.peso}g`);
    console.log(`   Unidade: ${produto.unidade_distribuicao}`);

    // 2. Verificar contratos
    const contratosResult = await pool.query(`
      SELECT 
        cp.id,
        cp.peso_embalagem,
        cp.fator_conversao,
        c.numero as contrato_numero
      FROM contrato_produtos cp
      JOIN contratos c ON c.id = cp.contrato_id
      WHERE cp.produto_id = $1
    `, [produto.id]);

    console.log(`\n📋 CONTRATOS (${contratosResult.rows.length}):`);
    for (const contrato of contratosResult.rows) {
      console.log(`   Contrato ${contrato.contrato_numero}:`);
      console.log(`      Peso embalagem: ${contrato.peso_embalagem}g`);
      console.log(`      Fator atual: ${contrato.fator_conversao}`);
    }

    // 3. Verificar cardápios
    const cardapiosResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM refeicao_produtos
      WHERE produto_id = $1
    `, [produto.id]);

    const totalCardapios = parseInt(cardapiosResult.rows[0].total);
    console.log(`\n📅 CARDÁPIOS (refeicao_produtos): ${totalCardapios} registros encontrados`);

    // 4. Verificar guias
    const guiasResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM guia_produto_escola
      WHERE produto_id = $1
    `, [produto.id]);

    const totalGuias = parseInt(guiasResult.rows[0].total);
    console.log(`📋 GUIAS: ${totalGuias} registros encontrados`);

    console.log('\n' + '═'.repeat(70));
    console.log('\n🎯 PLANO DE AÇÃO:\n');
    console.log('1. Atualizar peso do produto: 900g → 450g');
    console.log('2. Atualizar fator dos contratos: 0.5 → 1.0');
    console.log(`3. Multiplicar por 2 as quantidades em ${totalCardapios} cardápios`);
    console.log(`4. Multiplicar por 2 as quantidades em ${totalGuias} guias`);
    console.log('\n✅ RESULTADO: Zero conversão necessária!');
    console.log('   - Demanda: 26 unidades de 450g');
    console.log('   - Pedido: 26 unidades de 450g');
    console.log('   - Entrega: 2 garrafas por escola (claro!)');

    console.log('\n' + '═'.repeat(70));
    console.log('\n🚀 EXECUTANDO...\n');

    await pool.query('BEGIN');

    // 1. Atualizar produto
    await pool.query(`
      UPDATE produtos
      SET peso = 450,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [produto.id]);
    console.log('✅ Produto atualizado: 900g → 450g');

    // 2. Atualizar contratos
    await pool.query(`
      UPDATE contrato_produtos
      SET fator_conversao = 1.0,
          updated_at = CURRENT_TIMESTAMP
      WHERE produto_id = $1
    `, [produto.id]);
    console.log('✅ Contratos atualizados: fator → 1.0');

    // 3. Atualizar cardápios (multiplicar por 2)
    await pool.query(`
      UPDATE refeicao_produtos
      SET per_capita = per_capita * 2
      WHERE produto_id = $1
    `, [produto.id]);
    console.log(`✅ Cardápios atualizados: ${totalCardapios} registros × 2`);

    // 4. Atualizar guias (multiplicar por 2)
    await pool.query(`
      UPDATE guia_produto_escola
      SET quantidade = quantidade * 2,
          quantidade_demanda = quantidade_demanda * 2
      WHERE produto_id = $1
    `, [produto.id]);
    console.log(`✅ Guias atualizadas: ${totalGuias} registros × 2`);

    await pool.query('COMMIT');
    console.log('\n✅ CONCLUÍDO! Óleo padronizado para 450g');

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('\n❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

padronizarPeso();
