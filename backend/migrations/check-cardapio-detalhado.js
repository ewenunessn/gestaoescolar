const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    // Detalhe do único cardápio existente
    const detalhe = await client.query(`
      SELECT 
        cm.id, cm.mes, cm.ano, cm.modalidade_id, m.nome as modalidade_nome,
        crd.dia, crd.tipo_refeicao, crd.ativo,
        make_date(cm.ano, cm.mes, crd.dia) as data_completa,
        r.id as refeicao_id, r.nome as refeicao_nome
      FROM cardapios_modalidade cm
      JOIN modalidades m ON m.id = cm.modalidade_id
      JOIN cardapio_refeicoes_dia crd ON crd.cardapio_modalidade_id = cm.id
      LEFT JOIN refeicoes r ON r.id = crd.refeicao_id
      ORDER BY crd.dia
    `);
    console.log('\n=== DETALHE DO CARDÁPIO EXISTENTE ===');
    console.table(detalhe.rows);

    // Verificar escola com modalidade 54 (Ens. Integral)
    const escolasMod54 = await client.query(`
      SELECT em.escola_id, e.nome, em.quantidade_alunos
      FROM escola_modalidades em
      JOIN escolas e ON e.id = em.escola_id
      WHERE em.modalidade_id = 54
    `);
    console.log('\n=== ESCOLAS COM MODALIDADE 54 (Ens. Integral) ===');
    console.table(escolasMod54.rows);

    // Verificar se Berço da Liberdade tem alguma outra modalidade além de CRECHE
    const berco = await client.query(`
      SELECT em.escola_id, em.modalidade_id, em.quantidade_alunos, m.nome
      FROM escola_modalidades em
      JOIN modalidades m ON m.id = em.modalidade_id
      JOIN escolas e ON e.id = em.escola_id
      WHERE e.nome ILIKE '%berço%'
    `);
    console.log('\n=== TODAS MODALIDADES DO BERÇO DA LIBERDADE ===');
    console.table(berco.rows);

    // Verificar refeições cadastradas
    const refeicoes = await client.query(`
      SELECT id, nome FROM refeicoes ORDER BY id LIMIT 20
    `);
    console.log('\n=== REFEIÇÕES CADASTRADAS ===');
    console.table(refeicoes.rows);

  } finally {
    client.release();
    await pool.end();
  }
}
run().catch(console.error);
