require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const cs = process.env.NEON_DATABASE_URL;
const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });
pool.query(
  `SELECT id, nome, categoria, energia_kcal, proteina_g, lipideos_g, carboidratos_g,
          fibra_alimentar_g, calcio_mg, ferro_mg, sodio_mg, vitamina_c_mg, vitamina_a_mcg,
          gorduras_saturadas_g, colesterol_mg
   FROM taco_alimentos WHERE LOWER(nome) LIKE $1 LIMIT 3`,
  ['%arroz%']
).then(r => {
  console.log('OK:', r.rows.length, 'rows');
  console.log(r.rows[0]);
  pool.end();
}).catch(e => {
  console.error('ERRO:', e.message);
  pool.end();
});
