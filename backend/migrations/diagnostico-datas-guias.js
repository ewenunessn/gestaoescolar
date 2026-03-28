const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    // Todas as datas distintas de itens em março, agrupadas por guia
    const r = await client.query(`
      SELECT
        TO_CHAR(gpe.data_entrega, 'DD/MM/YYYY') as data,
        g.id as guia_id,
        g.nome as guia,
        g.competencia_mes_ano,
        COUNT(*) as total_itens
      FROM guia_produto_escola gpe
      JOIN guias g ON g.id = gpe.guia_id
      WHERE gpe.data_entrega >= '2026-03-01' AND gpe.data_entrega <= '2026-03-31'
      GROUP BY gpe.data_entrega, g.id, g.nome, g.competencia_mes_ano
      ORDER BY gpe.data_entrega, g.id
    `);

    console.log('\n=== Itens de março agrupados por data e guia ===');
    r.rows.forEach(row => {
      console.log(`  Data: ${row.data} | Guia ID: ${row.guia_id} | ${row.guia} (${row.competencia_mes_ano}) | ${row.total_itens} itens`);
    });

    // Verificar se há itens "órfãos" (sem guia associada ou de guias antigas)
    const guias = await client.query(`SELECT id, nome, competencia_mes_ano, status FROM guias ORDER BY id`);
    console.log('\n=== Todas as guias ===');
    guias.rows.forEach(g => console.log(`  ID ${g.id} | ${g.nome} | ${g.competencia_mes_ano} | ${g.status}`));

  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
