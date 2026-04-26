const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    // 1. Encontrar a escola
    const escola = await client.query(`
      SELECT id, nome FROM escolas WHERE nome ILIKE '%berço%' OR nome ILIKE '%liberdade%'
    `);
    console.log('\n=== ESCOLA ===');
    console.table(escola.rows);

    if (escola.rows.length === 0) { console.log('Escola não encontrada'); return; }
    const escolaId = escola.rows[0].id;

    // 2. Modalidades da escola
    const mods = await client.query(`
      SELECT em.escola_id, em.modalidade_id, em.quantidade_alunos, m.nome
      FROM escola_modalidades em
      JOIN modalidades m ON m.id = em.modalidade_id
      WHERE em.escola_id = $1
    `, [escolaId]);
    console.log('\n=== MODALIDADES DA ESCOLA ===');
    console.table(mods.rows);

    if (mods.rows.length === 0) { console.log('Sem modalidades vinculadas'); return; }
    const modalidadeIds = mods.rows.map(m => m.modalidade_id);

    // 3. Cardápios existentes para essas modalidades
    const cardapios = await client.query(`
      SELECT cm.id, cm.mes, cm.ano, cm.modalidade_id, m.nome as modalidade_nome
      FROM cardapios_modalidade cm
      JOIN modalidades m ON m.id = cm.modalidade_id
      WHERE cm.modalidade_id = ANY($1)
      ORDER BY cm.ano DESC, cm.mes DESC
      LIMIT 20
    `, [modalidadeIds]);
    console.log('\n=== CARDÁPIOS EXISTENTES (últimos 20) ===');
    console.table(cardapios.rows);

    // 4. Refeições cadastradas nos dias (semana 22-28/03/2026)
    const refeicoes = await client.query(`
      SELECT 
        cm.id as cardapio_id, cm.mes, cm.ano, cm.modalidade_id,
        m.nome as modalidade_nome,
        crd.dia, crd.tipo_refeicao, crd.ativo,
        r.id as refeicao_id, r.nome as refeicao_nome
      FROM cardapios_modalidade cm
      JOIN modalidades m ON m.id = cm.modalidade_id
      JOIN cardapio_refeicoes_dia crd ON crd.cardapio_modalidade_id = cm.id
      LEFT JOIN refeicoes r ON r.id = crd.refeicao_id
      WHERE cm.modalidade_id = ANY($1)
        AND cm.mes = 3 AND cm.ano = 2026
      ORDER BY crd.dia, m.nome
    `, [modalidadeIds]);
    console.log('\n=== REFEIÇÕES NO MÊS 03/2026 ===');
    console.table(refeicoes.rows);

    // 5. Testar a query exata do controller com make_date
    const hoje = new Date();
    const diaSemana = hoje.getDay();
    const diasAteSegunda = diaSemana === 0 ? 1 : diaSemana === 1 ? 0 : -(diaSemana - 1);
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() + diasAteSegunda);
    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 6);

    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    console.log(`\n=== RANGE DA SEMANA: ${fmt(inicioSemana)} a ${fmt(fimSemana)} ===`);

    const queryResult = await client.query(`
      SELECT 
        cm.id, cm.mes, cm.ano, cm.modalidade_id,
        m.nome as modalidade_nome,
        crd.dia, crd.ativo,
        make_date(cm.ano, cm.mes, crd.dia) as data_completa,
        r.nome as refeicao_nome
      FROM cardapios_modalidade cm
      JOIN modalidades m ON m.id = cm.modalidade_id
      JOIN cardapio_refeicoes_dia crd ON crd.cardapio_modalidade_id = cm.id
      LEFT JOIN refeicoes r ON r.id = crd.refeicao_id
      WHERE cm.modalidade_id = ANY($1)
        AND crd.ativo = true
        AND make_date(cm.ano, cm.mes, crd.dia) >= $2::date
        AND make_date(cm.ano, cm.mes, crd.dia) <= $3::date
      ORDER BY crd.dia
    `, [modalidadeIds, fmt(inicioSemana), fmt(fimSemana)]);
    console.log('\n=== RESULTADO DA QUERY DO CONTROLLER ===');
    console.table(queryResult.rows);

    // 6. Sem filtro ativo — ver se o problema é o campo ativo
    const semFiltroAtivo = await client.query(`
      SELECT crd.dia, crd.ativo, crd.tipo_refeicao, r.nome as refeicao
      FROM cardapios_modalidade cm
      JOIN cardapio_refeicoes_dia crd ON crd.cardapio_modalidade_id = cm.id
      LEFT JOIN refeicoes r ON r.id = crd.refeicao_id
      WHERE cm.modalidade_id = ANY($1) AND cm.mes = 3 AND cm.ano = 2026
      ORDER BY crd.dia
    `, [modalidadeIds]);
    console.log('\n=== REFEIÇÕES SEM FILTRO ATIVO ===');
    console.table(semFiltroAtivo.rows);

  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
