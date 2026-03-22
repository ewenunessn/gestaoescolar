/**
 * Diagnóstico: verifica tabelas taco_alimentos, produtos e produto_composicao_nutricional no Neon
 * Execute: node backend/migrations/diagnostico-taco-composicao.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const isNeon = connectionString?.includes('neon.tech');
console.log(`Conectando ao banco: ${isNeon ? 'Neon' : 'Local'}`);

const pool = new Pool({ connectionString, ssl: isNeon ? { rejectUnauthorized: false } : false });

async function main() {
  // 1. Verificar tabela taco_alimentos
  const tacoExists = await pool.query(
    `SELECT COUNT(*) as total FROM information_schema.tables WHERE table_schema='public' AND table_name='taco_alimentos'`
  );
  const tacoCount = tacoExists.rows[0].total;
  console.log(`\n[TACO] Tabela taco_alimentos existe: ${tacoCount > 0 ? 'SIM' : 'NÃO'}`);
  if (tacoCount > 0) {
    const rows = await pool.query(`SELECT COUNT(*) as total FROM taco_alimentos`);
    console.log(`[TACO] Registros: ${rows.rows[0].total}`);
    const sample = await pool.query(`SELECT id, nome, energia_kcal FROM taco_alimentos LIMIT 3`);
    console.log('[TACO] Amostra:', sample.rows);
  }

  // 2. Verificar produto id=79
  const prodExists = await pool.query(
    `SELECT COUNT(*) as total FROM information_schema.tables WHERE table_schema='public' AND table_name='produtos'`
  );
  if (prodExists.rows[0].total > 0) {
    const prod = await pool.query(`SELECT id, nome FROM produtos WHERE id = 79`);
    console.log(`\n[PRODUTO] id=79 existe: ${prod.rows.length > 0 ? 'SIM' : 'NÃO'}`);
    if (prod.rows.length > 0) console.log('[PRODUTO]', prod.rows[0]);
    const total = await pool.query(`SELECT COUNT(*) as total FROM produtos`);
    console.log(`[PRODUTO] Total de produtos: ${total.rows[0].total}`);
  } else {
    console.log('\n[PRODUTO] Tabela produtos NÃO existe!');
  }

  // 3. Verificar tabela produto_composicao_nutricional
  const compExists = await pool.query(
    `SELECT COUNT(*) as total FROM information_schema.tables WHERE table_schema='public' AND table_name='produto_composicao_nutricional'`
  );
  console.log(`\n[COMPOSICAO] Tabela produto_composicao_nutricional existe: ${compExists.rows[0].total > 0 ? 'SIM' : 'NÃO'}`);
  if (compExists.rows[0].total > 0) {
    const cols = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='produto_composicao_nutricional' ORDER BY ordinal_position`
    );
    console.log('[COMPOSICAO] Colunas:', cols.rows.map(r => r.column_name).join(', '));
    const comp79 = await pool.query(`SELECT * FROM produto_composicao_nutricional WHERE produto_id = 79`);
    console.log(`[COMPOSICAO] Registro para produto 79: ${comp79.rows.length > 0 ? 'SIM' : 'NÃO'}`);
  }

  await pool.end();
}

main().catch(err => {
  console.error('Erro:', err.message);
  process.exit(1);
});
