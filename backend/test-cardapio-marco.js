const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testarCardapioMarco() {
  try {
    console.log('🔍 Buscando cardápio de março/2026...\n');

    // 1. Buscar cardápio por nome
    const porNome = await pool.query(`
      SELECT id, nome, data_inicio, data_fim, ativo, modalidade_id
      FROM cardapios
      WHERE nome ILIKE '%teste%' OR nome ILIKE '%março%' OR nome ILIKE '%marco%'
      ORDER BY created_at DESC
    `);
    
    console.log('📋 Cardápios encontrados por nome:');
    console.log(JSON.stringify(porNome.rows, null, 2));
    console.log('\n');

    // 2. Buscar todos os cardápios (ativos e inativos)
    const todos = await pool.query(`
      SELECT id, nome, data_inicio, data_fim, ativo, modalidade_id
      FROM cardapios
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log('📚 Últimos 10 cardápios:');
    console.log(JSON.stringify(todos.rows, null, 2));
    console.log('\n');

    // 3. Se encontrou algum, verificar refeições
    if (porNome.rows.length > 0) {
      const cardapio = porNome.rows[0];
      console.log(`🍽️ Verificando refeições do cardápio "${cardapio.nome}" (ID ${cardapio.id}):\n`);
      
      const refeicoes = await pool.query(`
        SELECT cr.*, r.nome as refeicao_nome, m.nome as modalidade_nome
        FROM cardapio_refeicoes cr
        LEFT JOIN refeicoes r ON r.id = cr.refeicao_id
        LEFT JOIN modalidades m ON m.id = cr.modalidade_id
        WHERE cr.cardapio_id = $1
      `, [cardapio.id]);
      
      console.log(`   Total de refeições: ${refeicoes.rows.length}`);
      console.log(JSON.stringify(refeicoes.rows, null, 2));
      console.log('\n');

      // 4. Testar query de busca por competência
      const competencia = '2026-03';
      const [ano, mes] = competencia.split('-').map(Number);
      const primeiroDia = new Date(ano, mes - 1, 1);
      const ultimoDia = new Date(ano, mes, 0);
      
      console.log(`📅 Testando busca por competência ${competencia}:`);
      console.log(`   Primeiro dia: ${primeiroDia.toISOString().split('T')[0]}`);
      console.log(`   Último dia: ${ultimoDia.toISOString().split('T')[0]}`);
      console.log(`   Data início cardápio: ${cardapio.data_inicio}`);
      console.log(`   Data fim cardápio: ${cardapio.data_fim}`);
      console.log('\n');

      // Query atual (com bug)
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
      
      console.log('❌ Query ATUAL (parâmetros invertidos):');
      console.log(`   Encontrados: ${queryAtual.rows.length}`);
      console.log(JSON.stringify(queryAtual.rows, null, 2));
      console.log('\n');

      // Query corrigida
      const queryCorrigida = await pool.query(`
        SELECT DISTINCT c.id, c.nome, c.data_inicio, c.data_fim
        FROM cardapios c
        INNER JOIN cardapio_refeicoes cr ON cr.cardapio_id = c.id
        WHERE c.ativo = true
          AND (
            (c.data_inicio <= $2 AND c.data_fim >= $1)
            OR (c.data_inicio BETWEEN $1 AND $2)
            OR (c.data_fim BETWEEN $1 AND $2)
          )
        ORDER BY c.nome
      `, [primeiroDia.toISOString().split('T')[0], ultimoDia.toISOString().split('T')[0]]);
      
      console.log('✅ Query CORRIGIDA:');
      console.log(`   Encontrados: ${queryCorrigida.rows.length}`);
      console.log(JSON.stringify(queryCorrigida.rows, null, 2));
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

testarCardapioMarco();
