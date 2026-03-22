/**
 * Testa GET e PUT de composição nutricional para um produto do Neon
 * Execute: node backend/migrations/testar-composicao-produto.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const cs = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

async function main() {
  // Pegar primeiro produto disponível
  const prod = await pool.query(`SELECT id, nome FROM produtos ORDER BY id LIMIT 1`);
  const { id, nome } = prod.rows[0];
  console.log(`\nTestando produto: id=${id} | ${nome}`);

  // Ver se já tem composição
  const comp = await pool.query(
    `SELECT * FROM produto_composicao_nutricional WHERE produto_id = $1`, [id]
  );
  console.log(`\nComposição existente:`, comp.rows[0] || 'nenhuma');

  // Simular o que o controller retorna no GET (schema 'novo')
  const get = await pool.query(`
    SELECT 
      produto_id,
      energia_kcal as calorias,
      proteina_g as proteinas,
      carboidratos_g as carboidratos,
      lipideos_g as gorduras,
      fibra_alimentar_g as fibras,
      sodio_mg as sodio,
      acucares_g as acucares,
      gorduras_saturadas_g,
      gorduras_trans_g,
      colesterol_mg as colesterol,
      calcio_mg as calcio,
      ferro_mg as ferro,
      vitamina_c_mg as vitamina_c,
      vitamina_a_mcg as vitamina_a
    FROM produto_composicao_nutricional 
    WHERE produto_id = $1
  `, [id]);
  console.log(`\nGET retorna:`, get.rows[0] || 'vazio');

  // Simular PUT (inserir dados de teste)
  console.log(`\nSimulando PUT para produto ${id}...`);
  const upsert = await pool.query(`
    INSERT INTO produto_composicao_nutricional (
      produto_id, energia_kcal, proteina_g, carboidratos_g, lipideos_g, fibra_alimentar_g,
      sodio_mg, gorduras_saturadas_g, colesterol_mg, calcio_mg, ferro_mg, vitamina_c_mg, vitamina_a_mcg, criado_em
    ) VALUES ($1, 128, 2.5, 28.1, 0.2, 1.6, 1, 0.1, 0, 5, 0.3, 0, 0, NOW())
    ON CONFLICT (produto_id) DO UPDATE SET
      energia_kcal = EXCLUDED.energia_kcal,
      proteina_g = EXCLUDED.proteina_g,
      carboidratos_g = EXCLUDED.carboidratos_g,
      lipideos_g = EXCLUDED.lipideos_g,
      fibra_alimentar_g = EXCLUDED.fibra_alimentar_g,
      sodio_mg = EXCLUDED.sodio_mg,
      gorduras_saturadas_g = EXCLUDED.gorduras_saturadas_g,
      colesterol_mg = EXCLUDED.colesterol_mg,
      calcio_mg = EXCLUDED.calcio_mg,
      ferro_mg = EXCLUDED.ferro_mg,
      vitamina_c_mg = EXCLUDED.vitamina_c_mg,
      vitamina_a_mcg = EXCLUDED.vitamina_a_mcg
    RETURNING *
  `, [id]);
  console.log(`PUT resultado:`, upsert.rows[0]);

  await pool.end();
}
main().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
