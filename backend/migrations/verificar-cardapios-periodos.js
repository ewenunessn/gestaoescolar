require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'alimentacao_escolar',
  password: process.env.DB_PASSWORD || 'admin123',
  port: process.env.DB_PORT || 5432
});

client.connect()
  .then(() => client.query(`
    SELECT 
      c.id, 
      c.nome, 
      c.created_at,
      p.ano,
      p.ocultar_dados
    FROM cardapios c
    LEFT JOIN periodos p ON c.periodo_id = p.id
    ORDER BY c.id
  `))
  .then(r => {
    console.log('\n📊 Cardápios no banco:\n');
    r.rows.forEach(row => {
      const periodo = row.ano || 'SEM PERÍODO';
      const oculto = row.ocultar_dados ? '🚫 OCULTO' : '✅ VISÍVEL';
      console.log(`  ID ${row.id}: ${row.nome}`);
      console.log(`    Período: ${periodo} - ${oculto}\n`);
    });
    console.log(`Total: ${r.rows.length} cardápios\n`);
    client.end();
  })
  .catch(e => {
    console.error('❌ Erro:', e.message);
    client.end();
  });
