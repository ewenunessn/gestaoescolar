const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testarCardapios() {
  try {
    console.log('🔍 Testando busca de cardápios...\n');

    // 1. Ver todos os cardápios ativos
    const todos = await pool.query(`
      SELECT id, nome, data_inicio, data_fim, ativo
      FROM cardapios
      WHERE ativo = true
      ORDER BY data_inicio DESC
      LIMIT 10
    `);
    console.log('📚 Todos os cardápios ativos:');
    console.log(JSON.stringify(todos.rows, null, 2));
    console.log('\n');

    // 2. Testar query atual (dezembro 2025)
    const competencia = '2025-12';
    const [ano, mes] = competencia.split('-').map(Number);
    const primeiroDia = new Date(ano, mes - 1, 1);
    const ultimoDia = new Date(ano, mes, 0);
    
    console.log(`📅 Buscando cardápios para ${competencia}:`);
    console.log(`   Primeiro dia: ${primeiroDia.toISOString().split('T')[0]}`);
    console.log(`   Último dia: ${ultimoDia.toISOString().split('T')[0]}`);
    console.log('\n');

    const queryAtual = await pool.query(`
      SELECT DISTINCT c.id, c.nome, c.data_inicio, c.data_fim
      FROM cardapios c
      INNER JOIN cardapio_refeicoes cr ON cr.cardapio_id = c.id
      WHERE c.ativo = true
        AND (
          (c.data_inicio <= $1 AND c.data_fim >= $2)
          OR (c.data_inicio BETWEEN $2 AND $1)
          OR (c.data_fim BETWEEN $2 AND $1)
        )
      ORDER BY c.nome
    `, [ultimoDia.toISOString().split('T')[0], primeiroDia.toISOString().split('T')[0]]);
    
    console.log('❌ Query ATUAL (com bug):');
    console.log(`   Encontrados: ${queryAtual.rows.length}`);
    console.log(JSON.stringify(queryAtual.rows, null, 2));
    console.log('\n');

    // 3. Testar query corrigida
    const queryCorrigida = await pool.query(`
      SELECT DISTINCT c.id, c.nome, c.data_inicio, c.data_fim
      FROM cardapios c
      INNER JOIN cardapio_refeicoes cr ON cr.cardapio_id = c.id
      WHERE c.ativo = true
        AND (
          (c.data_inicio <= $1 AND c.data_fim >= $2)
          OR (c.data_inicio BETWEEN $2 AND $1)
          OR (c.data_fim BETWEEN $2 AND $1)
        )
      ORDER BY c.nome
    `, [primeiroDia.toISOString().split('T')[0], ultimoDia.toISOString().split('T')[0]]);
    
    console.log('✅ Query CORRIGIDA:');
    console.log(`   Encontrados: ${queryCorrigida.rows.length}`);
    console.log(JSON.stringify(queryCorrigida.rows, null, 2));
    console.log('\n');

    // 4. Query simplificada (sem INNER JOIN para ver se o problema é aí)
    const querySemJoin = await pool.query(`
      SELECT id, nome, data_inicio, data_fim
      FROM cardapios
      WHERE ativo = true
        AND (
          (data_inicio <= $1 AND data_fim >= $2)
          OR (data_inicio BETWEEN $2 AND $1)
          OR (data_fim BETWEEN $2 AND $1)
        )
      ORDER BY nome
    `, [primeiroDia.toISOString().split('T')[0], ultimoDia.toISOString().split('T')[0]]);
    
    console.log('🔧 Query SEM INNER JOIN:');
    console.log(`   Encontrados: ${querySemJoin.rows.length}`);
    console.log(JSON.stringify(querySemJoin.rows, null, 2));
    console.log('\n');

    // 5. Verificar se há refeições nos cardápios
    if (todos.rows.length > 0) {
      const cardapioId = todos.rows[0].id;
      const refeicoes = await pool.query(`
        SELECT COUNT(*) as total
        FROM cardapio_refeicoes
        WHERE cardapio_id = $1
      `, [cardapioId]);
      
      console.log(`🍽️ Cardápio "${todos.rows[0].nome}" (ID ${cardapioId}):`);
      console.log(`   Refeições: ${refeicoes.rows[0].total}`);
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

testarCardapios();
