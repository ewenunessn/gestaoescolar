const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    // 1. Testar a query atual do model
    const r1 = await client.query(`
      SELECT
        e.id, e.nome,
        er.ordem, er.rota_nome, er.rota_id
      FROM escolas e
      INNER JOIN guia_produto_escola gpe ON e.id = gpe.escola_id
      INNER JOIN guias g ON gpe.guia_id = g.id
      LEFT JOIN LATERAL (
        SELECT re.ordem, rot.nome as rota_nome, rot.id as rota_id
        FROM rota_escolas re
        INNER JOIN rotas_entrega rot ON rot.id = re.rota_id
        WHERE re.escola_id = e.id
        ORDER BY re.ordem ASC
        LIMIT 1
      ) er ON true
      WHERE gpe.para_entrega = true AND g.status = 'aberta'
      GROUP BY e.id, e.nome, er.ordem, er.rota_nome, er.rota_id
      ORDER BY COALESCE(er.ordem, 999), e.nome
      LIMIT 5
    `);
    console.log('\n=== Query com LATERAL (atual) ===');
    r1.rows.forEach(r => console.log(`  ${r.nome} | rota_id: ${r.rota_id} | rota_nome: ${r.rota_nome} | ordem: ${r.ordem}`));

    // 2. Verificar se a escola EEEF Canutama tem rota
    const r2 = await client.query(`
      SELECT e.id, e.nome, re.rota_id, re.ordem, rot.nome as rota_nome
      FROM escolas e
      LEFT JOIN rota_escolas re ON re.escola_id = e.id
      LEFT JOIN rotas_entrega rot ON rot.id = re.rota_id
      WHERE LOWER(e.nome) LIKE '%canutama%'
    `);
    console.log('\n=== EEEF Canutama - rotas ===');
    r2.rows.forEach(r => console.log(`  id: ${r.id} | ${r.nome} | rota_id: ${r.rota_id} | rota_nome: ${r.rota_nome}`));

    // 3. Verificar se guia_produto_escola tem para_entrega = true
    const r3 = await client.query(`
      SELECT gpe.escola_id, e.nome, gpe.para_entrega, g.status
      FROM guia_produto_escola gpe
      JOIN escolas e ON e.id = gpe.escola_id
      JOIN guias g ON g.id = gpe.guia_id
      WHERE LOWER(e.nome) LIKE '%canutama%'
      LIMIT 3
    `);
    console.log('\n=== guia_produto_escola para Canutama ===');
    r3.rows.forEach(r => console.log(`  ${r.nome} | para_entrega: ${r.para_entrega} | guia_status: ${r.status}`));

    // 4. Testar sem o filtro para_entrega
    const r4 = await client.query(`
      SELECT
        e.id, e.nome,
        er.ordem, er.rota_nome, er.rota_id
      FROM escolas e
      INNER JOIN guia_produto_escola gpe ON e.id = gpe.escola_id
      INNER JOIN guias g ON gpe.guia_id = g.id
      LEFT JOIN LATERAL (
        SELECT re.ordem, rot.nome as rota_nome, rot.id as rota_id
        FROM rota_escolas re
        INNER JOIN rotas_entrega rot ON rot.id = re.rota_id
        WHERE re.escola_id = e.id
        ORDER BY re.ordem ASC
        LIMIT 1
      ) er ON true
      WHERE g.status = 'aberta'
      GROUP BY e.id, e.nome, er.ordem, er.rota_nome, er.rota_id
      ORDER BY COALESCE(er.ordem, 999), e.nome
      LIMIT 5
    `);
    console.log('\n=== Query SEM filtro para_entrega ===');
    r4.rows.forEach(r => console.log(`  ${r.nome} | rota_id: ${r.rota_id} | rota_nome: ${r.rota_nome}`));

  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
