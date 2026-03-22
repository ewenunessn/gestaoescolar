const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    // Todos os cardápios no Neon
    const all = await client.query(`
      SELECT cm.id, cm.mes, cm.ano, cm.modalidade_id, m.nome as modalidade_nome,
        (SELECT COUNT(*) FROM cardapio_refeicoes_dia crd WHERE crd.cardapio_modalidade_id = cm.id) as total_dias
      FROM cardapios_modalidade cm
      JOIN modalidades m ON m.id = cm.modalidade_id
      ORDER BY cm.ano DESC, cm.mes DESC
      LIMIT 30
    `);
    console.log('\n=== TODOS OS CARDÁPIOS NO NEON ===');
    console.table(all.rows);

    // Total geral
    const total = await client.query('SELECT COUNT(*) FROM cardapios_modalidade');
    console.log('Total cardapios_modalidade:', total.rows[0].count);

    const totalDias = await client.query('SELECT COUNT(*) FROM cardapio_refeicoes_dia');
    console.log('Total cardapio_refeicoes_dia:', totalDias.rows[0].count);

    // Todas as modalidades
    const mods = await client.query('SELECT id, nome FROM modalidades ORDER BY id');
    console.log('\n=== MODALIDADES ===');
    console.table(mods.rows);

  } finally {
    client.release();
    await pool.end();
  }
}
run().catch(console.error);
