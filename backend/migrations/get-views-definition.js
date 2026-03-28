const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const viewNames = [
    'vw_estoque_central_completo',
    'vw_lotes_proximos_vencimento',
    'vw_estoque_baixo',
    'vw_recebimentos_detalhados',
    'vw_faturamentos_detalhados',
    'vw_faturamento_detalhado_tipo_fornecedor'
  ];
  try {
    for (const v of viewNames) {
      const r = await pool.query(`SELECT view_definition FROM information_schema.views WHERE table_name = $1`, [v]);
      if (r.rows.length > 0) {
        console.log(`\n-- VIEW: ${v}`);
        console.log(r.rows[0].view_definition);
        console.log('---');
      }
    }
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await pool.end();
  }
}
main();
