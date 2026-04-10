require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function findOvoId() {
  try {
    const result = await pool.query(`
      SELECT 
        r.id, 
        r.nome,
        r.calorias_por_porcao,
        r.rendimento_porcoes,
        COUNT(rp.id) as total_ingredientes
      FROM refeicoes r
      LEFT JOIN refeicao_produtos rp ON rp.refeicao_id = r.id
      WHERE r.nome ILIKE '%ovo%'
      GROUP BY r.id, r.nome, r.calorias_por_porcao, r.rendimento_porcoes
      ORDER BY r.nome
    `);

    console.log('🔍 Preparações com "ovo" no nome:');
    console.table(result.rows);

    await pool.end();
  } catch (error) {
    console.error('❌ Erro:', error);
    await pool.end();
    process.exit(1);
  }
}

findOvoId();
