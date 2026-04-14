/**
 * Investigar dados de cardápios e refeições no Neon
 */
import dotenv from 'dotenv';
dotenv.config(); // Carregar .env ANTES do database

import db from '../src/database';

async function investigarDados() {
  console.log('\n🔍 INVESTIGANDO DADOS NO NEON\n');

  try {
    // 1. Verificar cardapios_modalidade
    console.log('📋 1. Cardápios Modalidade:');
    const cardapios = await db.pool.query(`SELECT id, ativo, ano, mes FROM cardapios_modalidade ORDER BY id`);
    console.log(`   Total: ${cardapios.rows.length}`);
    cardapios.rows.forEach(c => console.log(`   ID: ${c.id}, Ano: ${c.ano}, Mês: ${c.mes}, Ativo: ${c.ativo}`));

    // 2. Verificar cardapio_refeicoes_dia
    console.log('\n📋 2. Cardápio Refeições Dia:');
    const crd = await db.pool.query(`
      SELECT crd.id, crd.cardapio_modalidade_id, crd.dia, crd.refeicao_id, crd.ativo
      FROM cardapio_refeicoes_dia crd
      ORDER BY crd.cardapio_modalidade_id, crd.dia
      LIMIT 10
    `);
    console.log(`   Total: ${crd.rows.length} (mostrando primeiros 10)`);
    crd.rows.forEach(r => console.log(`   ID: ${r.id}, Cardápio: ${r.cardapio_modalidade_id}, Dia: ${r.dia}, Refeição: ${r.refeicao_id}, Ativo: ${r.ativo}`));

    // 3. Verificar refeicao_produtos
    console.log('\n📋 3. Refeição Produtos:');
    const rp = await db.pool.query(`
      SELECT rp.id, rp.refeicao_id, rp.produto_id, rp.per_capita, rp.tipo_medida
      FROM refeicao_produtos rp
      ORDER BY rp.id
      LIMIT 10
    `);
    console.log(`   Total: ${rp.rows.length} (mostrando primeiros 10)`);
    rp.rows.forEach(p => console.log(`   ID: ${p.id}, Refeição: ${p.refeicao_id}, Produto: ${p.produto_id}, Per capita: ${p.per_capita} ${p.tipo_medida}`));

    // 4. Verificar cardapio_modalidades (associação cardápio -> modalidade)
    console.log('\n📋 4. Cardápio Modalidades:');
    const cm = await db.pool.query(`
      SELECT cm.id, cm.cardapio_id, cm.modalidade_id
      FROM cardapio_modalidades cm
      ORDER BY cm.cardapio_id
      LIMIT 10
    `);
    console.log(`   Total: ${cm.rows.length} (mostrando primeiros 10)`);
    cm.rows.forEach(m => console.log(`   ID: ${m.id}, Cardápio: ${m.cardapio_id}, Modalidade: ${m.modalidade_id}`));

    // 5. Testar query completa com dados existentes
    console.log('\n📋 5. Testando query de demanda (simulando):');
    const primeiroCardapio = cardapios.rows.find(c => c.ativo);
    if (primeiroCardapio) {
      console.log(`   Usando cardápio ID: ${primeiroCardapio.id} (Ano: ${primeiroCardapio.ano}, Mês: ${primeiroCardapio.mes})`);
      
      const testeQuery = await db.pool.query(`
        SELECT
          crd.dia,
          cm2.modalidade_id,
          rp.produto_id,
          p.nome as produto_nome
        FROM cardapio_refeicoes_dia crd
        INNER JOIN cardapios_modalidade cm ON cm.id = crd.cardapio_modalidade_id
        INNER JOIN cardapio_modalidades cm2 ON cm2.cardapio_id = cm.id
        INNER JOIN refeicoes r ON r.id = crd.refeicao_id
        INNER JOIN refeicao_produtos rp ON rp.refeicao_id = r.id
        INNER JOIN produtos p ON p.id = rp.produto_id
        WHERE crd.cardapio_modalidade_id = $1
          AND crd.ativo = true
        LIMIT 5
      `, [primeiroCardapio.id]);

      console.log(`   Resultados: ${testeQuery.rows.length}`);
      testeQuery.rows.forEach(row => {
        console.log(`   Dia: ${row.dia}, Modalidade: ${row.modalidade_id}, Produto: ${row.produto_nome}`);
      });
    }

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
  } finally {
    await db.pool.end();
  }
}

investigarDados();
