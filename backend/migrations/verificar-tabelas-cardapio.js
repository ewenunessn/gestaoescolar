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
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name LIKE '%cardapio%'
      AND column_name = 'periodo_id'
    ORDER BY table_name
  `))
  .then(r => {
    console.log('Tabelas de cardápio com periodo_id:');
    r.rows.forEach(row => console.log(`  - ${row.table_name}`));
    client.end();
  });
