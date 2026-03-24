/**
 * CORREÇÃO: Fator de conversão do Óleo
 * 
 * Problema: Fator está 500 quando deveria ser 0.5
 * Causa: Provavelmente foi calculado invertido (900/450 = 2) ou digitado errado
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function corrigirFator() {
  console.log('\n🔧 CORREÇÃO: Fator de conversão do Óleo\n');
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
    console.log('\n📦 PRODUTO:');
    console.log(`   ID: ${produto.id}`);
    console.log(`   Nome: ${produto.nome}`);
    console.log(`   Peso: ${produto.peso}g`);

    // 2. Buscar todos os contratos do produto
    const contratosResult = await pool.query(`
      SELECT 
        cp.id,
        cp.peso_embalagem,
        cp.unidade_compra,
        cp.fator_conversao,
        c.numero as contrato_numero
      FROM contrato_produtos cp
      JOIN contratos c ON c.id = cp.contrato_id
      WHERE cp.produto_id = $1
      ORDER BY c.created_at DESC
    `, [produto.id]);

    console.log(`\n📋 Encontrados ${contratosResult.rows.length} contratos\n`);

    for (const contrato of contratosResult.rows) {
      console.log(`Contrato ${contrato.contrato_numero}:`);
      console.log(`   ID: ${contrato.id}`);
      console.log(`   Peso embalagem: ${contrato.peso_embalagem}g`);
      console.log(`   Fator ATUAL: ${contrato.fator_conversao}`);

      // Calcular fator correto
      const fatorCorreto = contrato.peso_embalagem / produto.peso;
      console.log(`   Fator CORRETO: ${fatorCorreto}`);

      // Verificar se precisa corrigir
      if (Math.abs(contrato.fator_conversao - fatorCorreto) > 0.01) {
        console.log(`   ⚠️  PRECISA CORRIGIR!`);
        
        // Atualizar
        await pool.query(`
          UPDATE contrato_produtos
          SET fator_conversao = $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [fatorCorreto, contrato.id]);

        console.log(`   ✅ Fator atualizado de ${contrato.fator_conversao} para ${fatorCorreto}`);
      } else {
        console.log(`   ✅ Fator já está correto`);
      }
      console.log('');
    }

    // 3. Verificar resultado
    console.log('═'.repeat(60));
    console.log('\n✅ VERIFICAÇÃO FINAL:\n');

    const verificacao = await pool.query(`
      SELECT 
        cp.id,
        cp.peso_embalagem,
        cp.fator_conversao,
        c.numero as contrato_numero,
        p.peso as produto_peso
      FROM contrato_produtos cp
      JOIN contratos c ON c.id = cp.contrato_id
      JOIN produtos p ON p.id = cp.produto_id
      WHERE cp.produto_id = $1
    `, [produto.id]);

    for (const row of verificacao.rows) {
      const esperado = row.peso_embalagem / row.produto_peso;
      const correto = Math.abs(row.fator_conversao - esperado) < 0.01;
      console.log(`Contrato ${row.contrato_numero}:`);
      console.log(`   Fator: ${row.fator_conversao}`);
      console.log(`   Esperado: ${esperado}`);
      console.log(`   Status: ${correto ? '✅ CORRETO' : '❌ INCORRETO'}`);
      console.log('');
    }

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

corrigirFator();
