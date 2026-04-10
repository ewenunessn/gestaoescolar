require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkOvoPerCapita() {
  try {
    const result = await pool.query(`
      SELECT 
        rp.per_capita,
        rp.tipo_medida,
        p.peso,
        p.nome,
        p.fator_correcao
      FROM refeicao_produtos rp
      INNER JOIN produtos p ON p.id = rp.produto_id
      WHERE rp.refeicao_id = 31
      ORDER BY p.nome
    `);

    console.log('🥚 Dados dos ingredientes da preparação Ovo (ID 31):');
    console.table(result.rows);

    await pool.end();
  } catch (error) {
    console.error('❌ Erro:', error);
    await pool.end();
    process.exit(1);
  }
}

checkOvoPerCapita();
