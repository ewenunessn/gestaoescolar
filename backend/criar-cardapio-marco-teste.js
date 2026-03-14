const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function criarCardapioMarco() {
  try {
    console.log('🔧 Criando cardápio de teste para março/2026...\n');

    // 1. Buscar modalidade Ensino Médio
    const modalidade = await pool.query(`
      SELECT id, nome FROM modalidades WHERE nome ILIKE '%médio%' LIMIT 1
    `);
    
    if (modalidade.rows.length === 0) {
      console.log('❌ Modalidade Ensino Médio não encontrada');
      return;
    }

    const modalidadeId = modalidade.rows[0].id;
    console.log(`✅ Modalidade encontrada: ${modalidade.rows[0].nome} (ID ${modalidadeId})\n`);

    // 2. Buscar uma refeição qualquer
    const refeicao = await pool.query(`
      SELECT id, nome FROM refeicoes LIMIT 1
    `);
    
    if (refeicao.rows.length === 0) {
      console.log('❌ Nenhuma refeição encontrada');
      return;
    }

    const refeicaoId = refeicao.rows[0].id;
    console.log(`✅ Refeição encontrada: ${refeicao.rows[0].nome} (ID ${refeicaoId})\n`);

    // 3. Criar cardápio
    const cardapio = await pool.query(`
      INSERT INTO cardapios (
        nome, 
        descricao, 
        periodo_dias, 
        data_inicio, 
        data_fim, 
        ativo,
        modalidade_id
      ) VALUES (
        'Cardápio Teste Março 2026',
        'Cardápio de teste para planejamento de compras',
        31,
        '2026-03-01',
        '2026-03-31',
        true,
        $1
      ) RETURNING *
    `, [modalidadeId]);

    const cardapioId = cardapio.rows[0].id;
    console.log('✅ Cardápio criado:', JSON.stringify(cardapio.rows[0], null, 2));
    console.log('\n');

    // 4. Adicionar refeição ao cardápio
    const cardapioRefeicao = await pool.query(`
      INSERT INTO cardapio_refeicoes (
        cardapio_id,
        refeicao_id,
        modalidade_id,
        frequencia_mensal
      ) VALUES ($1, $2, $3, 20)
      RETURNING *
    `, [cardapioId, refeicaoId, modalidadeId]);

    console.log('✅ Refeição adicionada ao cardápio:', JSON.stringify(cardapioRefeicao.rows[0], null, 2));
    console.log('\n');

    // 5. Testar query de busca
    const teste = await pool.query(`
      SELECT DISTINCT c.id, c.nome, c.data_inicio, c.data_fim
      FROM cardapios c
      INNER JOIN cardapio_refeicoes cr ON cr.cardapio_id = c.id
      WHERE c.ativo = true
        AND (
          (c.data_inicio <= $1 AND c.data_fim >= $2)
          OR (c.data_inicio BETWEEN $1 AND $2)
          OR (c.data_fim BETWEEN $1 AND $2)
        )
      ORDER BY c.nome
    `, ['2026-03-01', '2026-03-31']);

    console.log('🔍 Teste de busca por competência 2026-03:');
    console.log(`   Encontrados: ${teste.rows.length}`);
    console.log(JSON.stringify(teste.rows, null, 2));

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

criarCardapioMarco();
