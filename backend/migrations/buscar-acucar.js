const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

pool.query(`
  SELECT
    TO_CHAR(gpe.data_entrega, 'DD/MM/YYYY') as data,
    gpe.data_entrega as data_raw,
    gpe.quantidade,
    gpe.unidade,
    gpe.status,
    p.nome as produto,
    e.nome as escola,
    g.nome as guia,
    g.competencia_mes_ano
  FROM guia_produto_escola gpe
  JOIN produtos p ON p.id = gpe.produto_id
  JOIN escolas e ON e.id = gpe.escola_id
  JOIN guias g ON g.id = gpe.guia_id
  WHERE unaccent(LOWER(p.nome)) LIKE unaccent(LOWER('%açúcar%'))
     OR unaccent(LOWER(p.nome)) LIKE unaccent(LOWER('%acucar%'))
  ORDER BY gpe.data_entrega, e.nome
`).then(r => {
  if (r.rows.length === 0) {
    console.log('Nenhum item de açúcar encontrado na guia_produto_escola.');
  } else {
    console.log(`${r.rows.length} item(ns) encontrado(s):\n`);
    r.rows.forEach(row => {
      console.log(`  Data: ${row.data} | Raw: ${row.data_raw} | Qtd: ${row.quantidade} ${row.unidade} | Status: ${row.status}`);
      console.log(`  Produto: ${row.produto} | Escola: ${row.escola} | Guia: ${row.guia} (${row.competencia_mes_ano})\n`);
    });
  }
  pool.end();
}).catch(e => {
  // unaccent pode não estar disponível, tenta sem
  pool.query(`
    SELECT
      TO_CHAR(gpe.data_entrega, 'DD/MM/YYYY') as data,
      gpe.data_entrega as data_raw,
      gpe.quantidade,
      gpe.unidade,
      gpe.status,
      p.nome as produto,
      e.nome as escola,
      g.nome as guia,
      g.competencia_mes_ano
    FROM guia_produto_escola gpe
    JOIN produtos p ON p.id = gpe.produto_id
    JOIN escolas e ON e.id = gpe.escola_id
    JOIN guias g ON g.id = gpe.guia_id
    WHERE LOWER(p.nome) LIKE '%a%car%'
    ORDER BY gpe.data_entrega, e.nome
  `).then(r => {
    if (r.rows.length === 0) {
      console.log('Nenhum item encontrado.');
    } else {
      console.log(`${r.rows.length} item(ns):\n`);
      r.rows.forEach(row => {
        console.log(`  Data: ${row.data} | Raw: ${row.data_raw} | Qtd: ${row.quantidade} ${row.unidade} | Status: ${row.status}`);
        console.log(`  Produto: ${row.produto} | Escola: ${row.escola} | Guia: ${row.guia} (${row.competencia_mes_ano})\n`);
      });
    }
    pool.end();
  }).catch(e2 => { console.error(e2.message); pool.end(); });
});
