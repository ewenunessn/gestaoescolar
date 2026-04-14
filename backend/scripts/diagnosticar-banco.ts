/**
 * Script de diagnóstico do banco de dados
 */
import db from '../src/database';

async function diagnosticarBanco() {
  console.log('\n🔍 DIAGNÓSTICO DO BANCO DE DADOS\n');

  try {
    // Listar todas as tabelas
    console.log('📋 Tabelas no banco de dados:');
    const tabelasResult = await db.pool.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    tabelasResult.rows.forEach(t => console.log(`  - ${t.tablename}`));

    // Verificar tabelas relacionadas a cardápio
    console.log('\n📋 Tabelas relacionadas a CARDÁPIO:');
    const cardapioTables = await db.pool.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' AND tablename LIKE '%cardapio%'
      ORDER BY tablename
    `);
    if (cardapioTables.rows.length === 0) {
      console.log('  ⚠️  Nenhuma tabela de cardápio encontrada!');
    } else {
      cardapioTables.rows.forEach(t => console.log(`  ✓ ${t.tablename}`));
    }

    // Verificar tabelas relacionadas a refeição
    console.log('\n📋 Tabelas relacionadas a REFEIÇÃO:');
    const refeicaoTables = await db.pool.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' AND (tablename LIKE '%refeicao%' OR tablename LIKE '%refeicoes%')
      ORDER BY tablename
    `);
    if (refeicaoTables.rows.length === 0) {
      console.log('  ⚠️  Nenhuma tabela de refeição encontrada!');
    } else {
      refeicaoTables.rows.forEach(t => console.log(`  ✓ ${t.tablename}`));
    }

    // Contar registros nas tabelas principais
    console.log('\n📊 Registros nas tabelas principais:');
    const tabelasPrincipais = ['cardapios', 'refeicoes', 'escolas', 'produtos', 'modalidades'];
    for (const tabela of tabelasPrincipais) {
      try {
        const countResult = await db.pool.query(`SELECT COUNT(*) FROM ${tabela}`);
        console.log(`  ${tabela}: ${countResult.rows[0].count} registros`);
      } catch {
        console.log(`  ${tabela}: ❌ Tabela não existe`);
      }
    }

  } catch (error) {
    console.error('\n❌ ERRO:', error);
  } finally {
    await db.pool.end();
  }
}

diagnosticarBanco();
