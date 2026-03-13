const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testarIntegracao() {
  try {
    console.log('🧪 Testando integração Cardápios + Nutricionistas\n');

    // 1. Buscar nutricionista padrão
    const nutricionistaResult = await pool.query(`
      SELECT id, nome, crn, crn_regiao 
      FROM nutricionistas 
      WHERE ativo = true 
      LIMIT 1
    `);

    if (nutricionistaResult.rows.length === 0) {
      console.log('❌ Nenhum nutricionista ativo encontrado');
      return;
    }

    const nutricionista = nutricionistaResult.rows[0];
    console.log('✅ Nutricionista encontrado:');
    console.log(`   ${nutricionista.nome} - CRN-${nutricionista.crn_regiao} ${nutricionista.crn}\n`);

    // 2. Buscar modalidade
    const modalidadeResult = await pool.query(`
      SELECT id, nome FROM modalidades WHERE ativo = true LIMIT 1
    `);

    if (modalidadeResult.rows.length === 0) {
      console.log('❌ Nenhuma modalidade ativa encontrada');
      return;
    }

    const modalidade = modalidadeResult.rows[0];
    console.log('✅ Modalidade encontrada:', modalidade.nome, '\n');

    // 3. Criar cardápio com nutricionista
    const dataAprovacao = new Date().toISOString().split('T')[0];
    const cardapioResult = await pool.query(`
      INSERT INTO cardapios_modalidade (
        modalidade_id, 
        nome, 
        mes, 
        ano, 
        nutricionista_id,
        data_aprovacao_nutricionista,
        observacoes_nutricionista,
        ativo
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      RETURNING *
    `, [
      modalidade.id,
      'Cardápio Teste com Nutricionista',
      3,
      2026,
      nutricionista.id,
      dataAprovacao,
      'Cardápio aprovado conforme diretrizes nutricionais do PNAE'
    ]);

    const cardapio = cardapioResult.rows[0];
    console.log('✅ Cardápio criado com sucesso:');
    console.log(`   ID: ${cardapio.id}`);
    console.log(`   Nome: ${cardapio.nome}`);
    console.log(`   Nutricionista ID: ${cardapio.nutricionista_id}`);
    console.log(`   Data Aprovação: ${cardapio.data_aprovacao_nutricionista}`);
    console.log(`   Observações: ${cardapio.observacoes_nutricionista}\n`);

    // 4. Buscar cardápio com JOIN
    const cardapioComNutricionistaResult = await pool.query(`
      SELECT 
        cm.*,
        m.nome as modalidade_nome,
        n.nome as nutricionista_nome,
        n.crn as nutricionista_crn,
        n.crn_regiao as nutricionista_crn_regiao
      FROM cardapios_modalidade cm
      LEFT JOIN modalidades m ON cm.modalidade_id = m.id
      LEFT JOIN nutricionistas n ON cm.nutricionista_id = n.id
      WHERE cm.id = $1
    `, [cardapio.id]);

    const cardapioCompleto = cardapioComNutricionistaResult.rows[0];
    console.log('✅ Cardápio com dados completos:');
    console.log(`   Nome: ${cardapioCompleto.nome}`);
    console.log(`   Modalidade: ${cardapioCompleto.modalidade_nome}`);
    console.log(`   Nutricionista: ${cardapioCompleto.nutricionista_nome}`);
    console.log(`   CRN: CRN-${cardapioCompleto.nutricionista_crn_regiao} ${cardapioCompleto.nutricionista_crn}`);
    console.log(`   Data Aprovação: ${cardapioCompleto.data_aprovacao_nutricionista}`);
    console.log(`   Observações: ${cardapioCompleto.observacoes_nutricionista}\n`);

    // 5. Listar todos os cardápios com nutricionistas
    const todosCardapiosResult = await pool.query(`
      SELECT 
        cm.id,
        cm.nome,
        cm.mes,
        cm.ano,
        m.nome as modalidade_nome,
        n.nome as nutricionista_nome,
        n.crn as nutricionista_crn,
        n.crn_regiao as nutricionista_crn_regiao,
        cm.data_aprovacao_nutricionista
      FROM cardapios_modalidade cm
      LEFT JOIN modalidades m ON cm.modalidade_id = m.id
      LEFT JOIN nutricionistas n ON cm.nutricionista_id = n.id
      WHERE cm.ativo = true
      ORDER BY cm.ano DESC, cm.mes DESC
      LIMIT 5
    `);

    console.log('✅ Últimos 5 cardápios ativos:');
    todosCardapiosResult.rows.forEach(c => {
      const nutricionistaInfo = c.nutricionista_nome 
        ? `${c.nutricionista_nome} (CRN-${c.nutricionista_crn_regiao} ${c.nutricionista_crn})`
        : 'Não atribuído';
      console.log(`   • ${c.nome} - ${c.mes}/${c.ano}`);
      console.log(`     Modalidade: ${c.modalidade_nome}`);
      console.log(`     Nutricionista: ${nutricionistaInfo}`);
      if (c.data_aprovacao_nutricionista) {
        console.log(`     Aprovado em: ${c.data_aprovacao_nutricionista}`);
      }
      console.log('');
    });

    console.log('✅ Teste concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

testarIntegracao();
