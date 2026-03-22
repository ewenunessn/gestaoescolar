require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
pool.query('SELECT COUNT(*) FROM taco_alimentos').then(r => {
  console.log('Local count:', r.rows[0].count);
  pool.end();
}).catch(e => {
  console.log('Erro local:', e.message);
  pool.end();
});
